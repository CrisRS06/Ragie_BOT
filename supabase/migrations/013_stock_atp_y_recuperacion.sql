-- =====================================================
-- 013_stock_atp_y_recuperacion.sql
-- Prevención de sobre-pedido + recuperación de pedidos enviados.
--
-- Problema: el stock no se reserva ni se descuenta hasta la ENTREGA
-- (dispatch_peps corre dentro de entregar_orden_pedido). Entre ENVIADO y
-- ENTREGADO el stock sigue figurando como disponible, así que nada impedía
-- enviar varias órdenes que en conjunto piden más de lo que existe.
--
-- Solución:
--   1) "Disponible-para-comprometer" (ATP) = stock_en_mano − comprometido por
--      órdenes abiertas. El envío valida contra ATP y se bloquea si excede,
--      con override de ADMINISTRADOR (motivo auditado). Scope por BODEGA,
--      espejando el filtro de dispatch_peps (006).
--   2) Recuperación: transición ENVIADO→BORRADOR ("devolver a borrador") y
--      reducir_lineas_pedido ("reducir cantidad en línea", solo bajar).
-- =====================================================

-- Estados "abiertos": comprometen stock sin haberlo descontado todavía.
-- BORRADOR no compromete; ENTREGADO/RECHAZADO/ANULADO ya no compiten.

-- -----------------------------------------------------
-- stock_en_mano(articulo, bodega)
-- Misma expresión que la validación de stock de dispatch_peps (005/006):
-- suma lotes activos con saldo, filtrando por bodega cuando se especifica.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION stock_en_mano(
  p_articulo_id UUID,
  p_bodega_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(l.cantidad_disponible), 0)
  FROM lotes l
  WHERE l.articulo_id = p_articulo_id
    AND l.cantidad_disponible > 0
    AND l.activo = true
    AND (p_bodega_id IS NULL OR l.bodega_id = p_bodega_id);
$$ LANGUAGE sql STABLE;

-- -----------------------------------------------------
-- comprometido_abierto(articulo, bodega, excluir_orden)
-- Suma cantidad_solicitada de líneas en órdenes ABIERTAS de la misma bodega,
-- excluyendo opcionalmente una orden (para no doble-contarse a sí misma).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION comprometido_abierto(
  p_articulo_id UUID,
  p_bodega_id UUID DEFAULT NULL,
  p_excluir_orden_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(opl.cantidad_solicitada), 0)
  FROM ordenes_pedido_lineas opl
  JOIN ordenes_pedido op ON op.id = opl.orden_id
  WHERE opl.articulo_id = p_articulo_id
    AND op.estado IN ('ENVIADO', 'EN_PREPARACION', 'LISTO_RETIRO')
    AND (p_bodega_id IS NULL OR op.bodega_id = p_bodega_id)
    AND (p_excluir_orden_id IS NULL OR op.id <> p_excluir_orden_id);
$$ LANGUAGE sql STABLE;

-- -----------------------------------------------------
-- verificar_stock_envio(orden) → jsonb
-- Agrega la demanda de la orden por artículo y devuelve SOLO los artículos
-- cuyo total solicitado excede el disponible-para-comprometer. Lo usa el API
-- para el mensaje estructurado (UX). Read-only.
-- Forma: [{articulo_id, sku, nombre, demanda, disponible, faltante}, ...]
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION verificar_stock_envio(p_orden_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_bodega_id UUID;
  v_result JSONB;
BEGIN
  SELECT bodega_id INTO v_bodega_id FROM ordenes_pedido WHERE id = p_orden_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de pedido % no encontrada', p_orden_id;
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'articulo_id', base.id::text,
             'sku', base.sku,
             'nombre', base.nombre,
             'demanda', base.demanda,
             'disponible', base.disponible,
             'faltante', base.demanda - base.disponible
           ) ORDER BY base.sku
         ), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT a.id, a.sku, a.nombre,
           SUM(opl.cantidad_solicitada) AS demanda,
           stock_en_mano(a.id, v_bodega_id)
             - comprometido_abierto(a.id, v_bodega_id, p_orden_id) AS disponible
    FROM ordenes_pedido_lineas opl
    JOIN articulos a ON a.id = opl.articulo_id
    WHERE opl.orden_id = p_orden_id
    GROUP BY a.id, a.sku, a.nombre
  ) base
  WHERE base.demanda > base.disponible;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public, extensions, auth;

-- -----------------------------------------------------
-- enviar_orden_pedido(orden, actor, forzar, motivo)
-- Compuerta autoritativa del envío BORRADOR → ENVIADO.
--   - advisory lock para serializar check+flip entre envíos concurrentes que
--     compiten por el mismo stock (volumen bajo → un lock global basta).
--   - Si la demanda excede el ATP y NO se fuerza → RAISE (cierra la carrera
--     contra el pre-check del API).
--   - Si se fuerza → exige motivo y lo deja auditado (PEDIDO_ENVIADO_OVERRIDE).
-- Frontera de confianza: PG no puede leer app_metadata.rol; el gate "solo
-- ADMIN puede forzar" se aplica en el API. La función solo registra el override.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION enviar_orden_pedido(
  p_orden_id UUID,
  p_actor_id UUID,
  p_forzar BOOLEAN DEFAULT false,
  p_motivo_override TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_orden RECORD;
  v_faltantes JSONB;
  v_num_lineas INT;
  v_forzado BOOLEAN := false;
BEGIN
  PERFORM pg_advisory_xact_lock(778899001122);

  SELECT * INTO v_orden FROM ordenes_pedido WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de pedido % no encontrada', p_orden_id;
  END IF;
  IF v_orden.estado <> 'BORRADOR' THEN
    RAISE EXCEPTION 'Solo se puede enviar una orden en BORRADOR (actual: %)', v_orden.estado;
  END IF;

  SELECT COUNT(*) INTO v_num_lineas FROM ordenes_pedido_lineas WHERE orden_id = p_orden_id;
  IF v_num_lineas = 0 THEN
    RAISE EXCEPTION 'El pedido no tiene líneas, agregue artículos antes de enviar';
  END IF;

  -- El ATP se scopea por bodega (igual que dispatch_peps). Sin bodega el cálculo
  -- sería ambiguo (sumaría comprometido de TODAS las bodegas), así que se exige.
  IF v_orden.bodega_id IS NULL THEN
    RAISE EXCEPTION 'La orden no tiene bodega asignada';
  END IF;

  v_faltantes := verificar_stock_envio(p_orden_id);

  IF jsonb_array_length(v_faltantes) > 0 THEN
    IF NOT p_forzar THEN
      -- ERRCODE check_violation (23514) para que el API lo mapee a 409.
      RAISE EXCEPTION 'STOCK_INSUFICIENTE: %', v_faltantes::text
        USING ERRCODE = 'check_violation';
    END IF;
    IF p_motivo_override IS NULL OR LENGTH(TRIM(p_motivo_override)) = 0 THEN
      RAISE EXCEPTION 'El envío forzado requiere un motivo';
    END IF;
    v_forzado := true;
    INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
    VALUES (p_actor_id, 'PEDIDO_ENVIADO_OVERRIDE', 'orden_pedido', p_orden_id::text,
      jsonb_build_object('numero', v_orden.numero, 'motivo', p_motivo_override, 'faltantes', v_faltantes));
  END IF;

  UPDATE ordenes_pedido
  SET estado = 'ENVIADO', fecha_envio = now(), updated_at = now()
  WHERE id = p_orden_id;

  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
  VALUES (p_actor_id, 'PEDIDO_ENVIADO', 'orden_pedido', p_orden_id::text,
    jsonb_build_object('numero', v_orden.numero, 'estado', 'ENVIADO', 'forzado', v_forzado));

  RETURN jsonb_build_object('success', true, 'numero', v_orden.numero, 'estado', 'ENVIADO', 'forzado', v_forzado);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth;

COMMENT ON FUNCTION enviar_orden_pedido IS
  'Envía un pedido (BORRADOR→ENVIADO) validando contra disponible-para-comprometer por bodega. Bloquea sobre-pedido salvo override de admin (motivo auditado).';

-- -----------------------------------------------------
-- TRIGGER validar_transicion_pedido: permitir ENVIADO → BORRADOR
-- (para "devolver a borrador"). Re-CREATE con la transición agregada.
--   BORRADOR        → ENVIADO, ANULADO
--   ENVIADO         → EN_PREPARACION, RECHAZADO, ANULADO, BORRADOR
--   EN_PREPARACION  → LISTO_RETIRO, RECHAZADO, ANULADO
--   LISTO_RETIRO    → ENTREGADO, ANULADO
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION validar_transicion_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  IF OLD.estado IN ('ENTREGADO', 'RECHAZADO', 'ANULADO') THEN
    RAISE EXCEPTION 'Transición no permitida: estado % es terminal', OLD.estado;
  END IF;

  IF (OLD.estado = 'BORRADOR'       AND NEW.estado IN ('ENVIADO','ANULADO')) OR
     (OLD.estado = 'ENVIADO'        AND NEW.estado IN ('EN_PREPARACION','RECHAZADO','ANULADO','BORRADOR')) OR
     (OLD.estado = 'EN_PREPARACION' AND NEW.estado IN ('LISTO_RETIRO','RECHAZADO','ANULADO')) OR
     (OLD.estado = 'LISTO_RETIRO'   AND NEW.estado IN ('ENTREGADO','ANULADO'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transición no permitida: % → %', OLD.estado, NEW.estado;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- TRIGGER bloquear_edicion_lineas_post_borrador: ampliar el bypass.
-- Ahora reducir_lineas_pedido también puede tocar líneas fuera de BORRADOR
-- (vía su propio GUC), sin afectar la ruta de entrega existente.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION bloquear_edicion_lineas_post_borrador()
RETURNS TRIGGER AS $$
DECLARE
  v_estado estado_orden_pedido;
  v_orden_id UUID;
BEGIN
  IF current_setting('app.entregando_orden_pedido', true) = 'on'
     OR current_setting('app.reduciendo_lineas_pedido', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_orden_id := COALESCE(NEW.orden_id, OLD.orden_id);
  SELECT estado INTO v_estado FROM ordenes_pedido WHERE id = v_orden_id;

  IF v_estado IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_estado <> 'BORRADOR' THEN
    RAISE EXCEPTION 'No se pueden modificar líneas de una orden en estado %', v_estado;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- reducir_lineas_pedido(orden, lineas, actor) → jsonb
-- Reduce-only: baja cantidad_solicitada de líneas en ENVIADO/EN_PREPARACION.
-- Reducir siempre LIBERA stock, así que nunca necesita re-chequear ATP.
-- Cada nueva cantidad debe ser ≥ 1 y estrictamente menor que la actual.
-- p_lineas: [{ "id": "...", "cantidadSolicitada": N }, ...]
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION reducir_lineas_pedido(
  p_orden_id UUID,
  p_lineas JSONB,
  p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_estado estado_orden_pedido;
  v_numero TEXT;
  v_item JSONB;
  v_linea RECORD;
  v_nueva NUMERIC;
  v_cambios INT := 0;
BEGIN
  SELECT estado, numero INTO v_estado, v_numero
  FROM ordenes_pedido WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de pedido % no encontrada', p_orden_id;
  END IF;
  IF v_estado NOT IN ('ENVIADO', 'EN_PREPARACION') THEN
    RAISE EXCEPTION 'Solo se pueden reducir cantidades en ENVIADO o EN_PREPARACION (actual: %)', v_estado;
  END IF;
  IF p_lineas IS NULL OR jsonb_typeof(p_lineas) <> 'array' OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'No se especificaron líneas a reducir';
  END IF;

  PERFORM set_config('app.reduciendo_lineas_pedido', 'on', true);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_nueva := (v_item->>'cantidadSolicitada')::NUMERIC;

    SELECT * INTO v_linea FROM ordenes_pedido_lineas
    WHERE id = (v_item->>'id')::UUID AND orden_id = p_orden_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La línea % no pertenece a la orden', v_item->>'id';
    END IF;
    IF v_nueva IS NULL OR v_nueva < 1 THEN
      RAISE EXCEPTION 'La cantidad debe ser un número mayor o igual a 1';
    END IF;
    IF v_nueva >= v_linea.cantidad_solicitada THEN
      RAISE EXCEPTION 'Solo se puede reducir: % no es menor que % (línea %)',
        v_nueva, v_linea.cantidad_solicitada, v_linea.id;
    END IF;

    UPDATE ordenes_pedido_lineas SET cantidad_solicitada = v_nueva WHERE id = v_linea.id;

    INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos)
    VALUES (p_actor_id, 'PEDIDO_LINEA_REDUCIDA', 'orden_pedido_linea', v_linea.id::text,
      jsonb_build_object('cantidad_solicitada', v_linea.cantidad_solicitada),
      jsonb_build_object('cantidad_solicitada', v_nueva, 'orden_numero', v_numero));
    v_cambios := v_cambios + 1;
  END LOOP;

  PERFORM set_config('app.reduciendo_lineas_pedido', '', true);

  UPDATE ordenes_pedido SET updated_at = now() WHERE id = p_orden_id;

  RETURN jsonb_build_object('success', true, 'cambios', v_cambios);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth;

COMMENT ON FUNCTION reducir_lineas_pedido IS
  'Reduce (solo bajar) cantidad_solicitada de líneas en ENVIADO/EN_PREPARACION. Bypassa el lock de líneas vía GUC. Reducir siempre libera stock, no requiere chequeo de ATP.';

-- -----------------------------------------------------
-- Permisos
-- Estas funciones SOLO se invocan desde el API con el cliente service_role
-- (supabaseAdmin). El gate de rol crítico ("solo ADMIN puede forzar el envío")
-- vive en la capa API, NO en PG. Si un usuario autenticado pudiera invocarlas
-- directamente vía el RPC de PostgREST (/rest/v1/rpc/...), saltaría ese gate y
-- las funciones SECURITY DEFINER se ejecutarían bypaseando RLS. Postgres concede
-- EXECUTE a PUBLIC por defecto al crear una función; además Supabase concede
-- EXECUTE directo a anon/authenticated (ALTER DEFAULT PRIVILEGES del schema
-- public). Hay que revocar de los tres explícitamente, no solo de PUBLIC.
-- -----------------------------------------------------
REVOKE EXECUTE ON FUNCTION stock_en_mano(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION comprometido_abierto(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION verificar_stock_envio(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enviar_orden_pedido(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION reducir_lineas_pedido(UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION stock_en_mano(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION comprometido_abierto(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION verificar_stock_envio(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION enviar_orden_pedido(UUID, UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reducir_lineas_pedido(UUID, JSONB, UUID) TO service_role;
