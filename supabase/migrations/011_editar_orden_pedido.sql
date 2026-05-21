-- =====================================================
-- Migración 011: Edición atómica de órdenes de pedido + fix GUC
-- =====================================================
-- C1: editar_orden_pedido() reemplaza el patrón UPDATE → DELETE →
--     INSERT del endpoint PUT por una sola transacción atómica.
-- GUC fix: recrea entregar_orden_pedido() moviendo el cierre del
--     GUC `app.entregando_orden_pedido` para DESPUÉS del loop de
--     dispatch_peps y del UPDATE final de estado.
-- =====================================================

-- pgcrypto para SHA-256 en la firma digital (idempotente)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- FUNCIÓN editar_orden_pedido
-- Edita cabecera + reemplaza líneas de un borrador atómicamente.
-- NO valida estado ni ownership (eso lo hace el endpoint PUT).
-- El trigger bloquear_edicion_lineas_post_borrador ya permite
-- DELETE/INSERT de líneas mientras la orden esté en BORRADOR.
-- =====================================================
CREATE OR REPLACE FUNCTION editar_orden_pedido(
  p_orden_id UUID,
  p_bodega_id UUID,
  p_unidad_receptora_id UUID,
  p_observaciones TEXT,
  p_lineas JSONB  -- [{ "articuloId": "...", "cantidadSolicitada": N, "notas": "..." }, ...]
)
RETURNS JSONB AS $$
DECLARE
  v_total_lineas INT := 0;
BEGIN
  -- 1. Actualizar cabecera
  UPDATE ordenes_pedido
  SET bodega_id = p_bodega_id,
      unidad_receptora_id = p_unidad_receptora_id,
      observaciones = p_observaciones,
      updated_at = now()
  WHERE id = p_orden_id;

  -- 2. Borrar líneas viejas (el trigger lo permite en BORRADOR)
  DELETE FROM ordenes_pedido_lineas WHERE orden_id = p_orden_id;

  -- 3. Insertar líneas nuevas desde el JSONB
  IF p_lineas IS NOT NULL AND jsonb_typeof(p_lineas) = 'array' THEN
    INSERT INTO ordenes_pedido_lineas (orden_id, articulo_id, cantidad_solicitada, notas)
    SELECT
      p_orden_id,
      (item->>'articuloId')::UUID,
      (item->>'cantidadSolicitada')::NUMERIC,
      NULLIF(item->>'notas', '')
    FROM jsonb_array_elements(p_lineas) item;

    SELECT jsonb_array_length(p_lineas) INTO v_total_lineas;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orden_id', p_orden_id::TEXT,
    'total_lineas', v_total_lineas
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth;

COMMENT ON FUNCTION editar_orden_pedido IS
  'Edita la cabecera y reemplaza todas las líneas de una orden de pedido en una sola transacción atómica. No valida estado ni ownership: el endpoint PUT lo hace antes de llamar.';

GRANT EXECUTE ON FUNCTION editar_orden_pedido TO authenticated, service_role;

-- =====================================================
-- FIX GUC: recrear entregar_orden_pedido
-- Idéntica a la 010 pero el set_config(..., '', true) que cierra
-- el GUC `app.entregando_orden_pedido` se mueve para DESPUÉS del
-- loop de dispatch_peps y del UPDATE final de estado.
-- =====================================================
CREATE OR REPLACE FUNCTION entregar_orden_pedido(
  p_orden_id UUID,
  p_usuario_id UUID,
  p_receptor TEXT,
  p_cedula TEXT,
  p_lineas JSONB DEFAULT NULL  -- [{ "id": "...", "cantidadEntregada": N }, ...]
)
RETURNS JSONB AS $$
DECLARE
  v_orden RECORD;
  v_linea RECORD;
  v_canonical_json JSONB;
  v_hash TEXT;
  v_lineas_json JSONB;
  v_total_lineas INT := 0;
  v_total_unidades NUMERIC := 0;
BEGIN
  -- 1. Cargar la orden y bloquearla para evitar entregas concurrentes
  SELECT * INTO v_orden FROM ordenes_pedido WHERE id = p_orden_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de pedido % no encontrada', p_orden_id;
  END IF;

  IF v_orden.estado <> 'LISTO_RETIRO' THEN
    RAISE EXCEPTION 'Solo se puede entregar una orden en estado LISTO_RETIRO (actual: %)', v_orden.estado;
  END IF;

  IF p_receptor IS NULL OR LENGTH(TRIM(p_receptor)) < 3 THEN
    RAISE EXCEPTION 'Receptor inválido';
  END IF;

  -- 2. Aplicar las cantidades por línea (si se pasaron) o usar cantidad_solicitada como default.
  --    Bypass del trigger de bloqueo de líneas con un GUC local.
  PERFORM set_config('app.entregando_orden_pedido', 'on', true);

  IF p_lineas IS NOT NULL AND jsonb_typeof(p_lineas) = 'array' THEN
    -- Actualizar cantidad_entregada según el payload
    UPDATE ordenes_pedido_lineas opl
    SET cantidad_entregada = (item->>'cantidadEntregada')::NUMERIC
    FROM jsonb_array_elements(p_lineas) item
    WHERE opl.id = (item->>'id')::UUID
      AND opl.orden_id = p_orden_id;
  END IF;

  -- Para líneas no especificadas, asumir cantidad_entregada = cantidad_solicitada
  UPDATE ordenes_pedido_lineas
  SET cantidad_entregada = cantidad_solicitada
  WHERE orden_id = p_orden_id AND cantidad_entregada IS NULL;

  -- 3. Llamar dispatch_peps por cada línea con cantidad > 0
  FOR v_linea IN
    SELECT opl.id, opl.articulo_id, opl.cantidad_entregada, a.sku
    FROM ordenes_pedido_lineas opl
    JOIN articulos a ON a.id = opl.articulo_id
    WHERE opl.orden_id = p_orden_id
      AND opl.cantidad_entregada > 0
    ORDER BY a.sku ASC
  LOOP
    -- dispatch_peps lanza RAISE EXCEPTION si stock insuficiente → rollback de TODO
    PERFORM dispatch_peps(
      v_linea.articulo_id,
      v_linea.cantidad_entregada,
      p_usuario_id,
      p_receptor,
      v_orden.numero,
      'Entrega de orden ' || v_orden.numero,
      v_orden.bodega_id
    );
    v_total_lineas := v_total_lineas + 1;
    v_total_unidades := v_total_unidades + v_linea.cantidad_entregada;
  END LOOP;

  -- 4. Construir JSON canónico para la firma (orden determinístico)
  SELECT jsonb_agg(
    jsonb_build_object(
      'articulo_id', opl.articulo_id::TEXT,
      'sku', a.sku,
      'cantidad_entregada', opl.cantidad_entregada
    ) ORDER BY a.sku ASC
  )
  INTO v_lineas_json
  FROM ordenes_pedido_lineas opl
  JOIN articulos a ON a.id = opl.articulo_id
  WHERE opl.orden_id = p_orden_id
    AND opl.cantidad_entregada > 0;

  v_canonical_json := jsonb_build_object(
    'numero', v_orden.numero,
    'solicitante_id', v_orden.solicitante_id::TEXT,
    'entregado_por_id', p_usuario_id::TEXT,
    'fecha_entrega_iso', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'receptor_nombre', p_receptor,
    'receptor_cedula', COALESCE(p_cedula, ''),
    'unidad_receptora_id', COALESCE(v_orden.unidad_receptora_id::TEXT, ''),
    'bodega_id', COALESCE(v_orden.bodega_id::TEXT, ''),
    'lineas', COALESCE(v_lineas_json, '[]'::JSONB)
  );

  v_hash := encode(extensions.digest(v_canonical_json::TEXT, 'sha256'), 'hex');

  -- 5. Actualizar orden a ENTREGADO con firma
  UPDATE ordenes_pedido
  SET estado = 'ENTREGADO',
      fecha_entrega = now(),
      entregado_por_id = p_usuario_id,
      receptor_nombre = p_receptor,
      receptor_cedula = p_cedula,
      hash_firma = v_hash,
      updated_at = now()
  WHERE id = p_orden_id;

  -- Cerrar el GUC de bypass DESPUÉS del loop de dispatch_peps y del
  -- UPDATE final de estado, para no dejar la sesión con el bypass
  -- activo si algo falla en los pasos intermedios.
  PERFORM set_config('app.entregando_orden_pedido', '', true);

  -- 6. Audit log
  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
  VALUES (
    p_usuario_id,
    'PEDIDO_ENTREGADO',
    'orden_pedido',
    p_orden_id::TEXT,
    jsonb_build_object(
      'numero', v_orden.numero,
      'receptor', p_receptor,
      'cedula', p_cedula,
      'hash_firma', v_hash,
      'total_lineas', v_total_lineas,
      'total_unidades', v_total_unidades
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'numero', v_orden.numero,
    'hash_firma', v_hash,
    'total_lineas', v_total_lineas,
    'total_unidades', v_total_unidades
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth;

COMMENT ON FUNCTION entregar_orden_pedido IS
  'Materializa una orden de pedido como despachos PEPS reales. Atómica: si cualquier línea no tiene stock suficiente, hace rollback de todo. Calcula y persiste hash SHA-256 del payload canónico como firma digital.';

GRANT EXECUTE ON FUNCTION entregar_orden_pedido TO authenticated, service_role;
