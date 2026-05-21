-- =====================================================
-- Migración 010: Módulo de Órdenes de Pedido
-- =====================================================
-- Permite que el AUDITOR (PANI) cree pedidos digitales que
-- el OPERADOR (Super Cadena) atiende y entrega. La entrega
-- materializa movimientos PEPS atómicamente vía dispatch_peps().
-- =====================================================

-- pgcrypto para SHA-256 en la firma digital
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE estado_orden_pedido AS ENUM (
    'BORRADOR',
    'ENVIADO',
    'EN_PREPARACION',
    'LISTO_RETIRO',
    'ENTREGADO',
    'RECHAZADO',
    'ANULADO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLA contador_consecutivos (genérica, reutilizable)
-- =====================================================
CREATE TABLE IF NOT EXISTS contador_consecutivos (
  tipo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tipo, anio)
);

COMMENT ON TABLE contador_consecutivos IS
  'Contador atómico de números consecutivos por tipo y año. Permite múltiples series (ORDEN_PEDIDO, NOTA_CREDITO, etc.) sin race conditions gracias al UPDATE row-level lock.';

-- =====================================================
-- FUNCIÓN siguiente_consecutivo
-- UPDATE atómico → siguiente número
-- =====================================================
CREATE OR REPLACE FUNCTION siguiente_consecutivo(
  p_tipo TEXT,
  p_anio INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  -- INSERT con ON CONFLICT garantiza atomicidad si no existe la fila.
  INSERT INTO contador_consecutivos (tipo, anio, ultimo_numero)
  VALUES (p_tipo, p_anio, 1)
  ON CONFLICT (tipo, anio) DO UPDATE
    SET ultimo_numero = contador_consecutivos.ultimo_numero + 1,
        updated_at = now()
  RETURNING ultimo_numero INTO v_numero;

  RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLA ordenes_pedido
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE,
  estado estado_orden_pedido NOT NULL DEFAULT 'BORRADOR',

  solicitante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  bodega_id UUID REFERENCES bodegas(id),
  unidad_receptora_id UUID REFERENCES unidades_receptoras(id),

  observaciones TEXT,

  -- Timestamps de cada transición
  fecha_envio TIMESTAMPTZ,
  fecha_aceptacion TIMESTAMPTZ,
  fecha_listo TIMESTAMPTZ,
  fecha_entrega TIMESTAMPTZ,

  -- Quién hizo qué
  aceptado_por_id UUID REFERENCES auth.users(id),
  entregado_por_id UUID REFERENCES auth.users(id),

  -- Datos del retiro
  receptor_nombre TEXT,
  receptor_cedula TEXT,

  -- Motivos
  motivo_rechazo TEXT,
  motivo_anulacion TEXT,

  -- Firma digital (SHA-256 del payload canónico al ENTREGAR)
  hash_firma TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordenes_pedido_estado_fecha
  ON ordenes_pedido(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_pedido_solicitante
  ON ordenes_pedido(solicitante_id, estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_pedido_bodega
  ON ordenes_pedido(bodega_id, estado);

-- =====================================================
-- TABLA ordenes_pedido_lineas
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_pedido_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_pedido(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulos(id) ON DELETE RESTRICT,
  cantidad_solicitada NUMERIC NOT NULL CHECK (cantidad_solicitada > 0),
  cantidad_entregada NUMERIC,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_cantidad_entregada_valida
    CHECK (cantidad_entregada IS NULL OR (cantidad_entregada >= 0 AND cantidad_entregada <= cantidad_solicitada))
);

CREATE INDEX IF NOT EXISTS idx_orden_pedido_lineas_orden
  ON ordenes_pedido_lineas(orden_id);

-- =====================================================
-- TRIGGER: autogenerar número de orden
-- =====================================================
CREATE OR REPLACE FUNCTION autogenerar_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_anio INTEGER;
  v_consecutivo INTEGER;
BEGIN
  IF NEW.numero IS NULL THEN
    v_anio := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INTEGER;
    v_consecutivo := siguiente_consecutivo('ORDEN_PEDIDO', v_anio);
    NEW.numero := 'PANI-' || v_anio::TEXT || '-' || LPAD(v_consecutivo::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ordenes_pedido_autonum ON ordenes_pedido;
CREATE TRIGGER ordenes_pedido_autonum
  BEFORE INSERT ON ordenes_pedido
  FOR EACH ROW EXECUTE FUNCTION autogenerar_numero_pedido();

-- =====================================================
-- TRIGGER: validar transiciones de estado
-- =====================================================
-- Matriz de transiciones permitidas:
--   BORRADOR        → ENVIADO, ANULADO
--   ENVIADO         → EN_PREPARACION, RECHAZADO, ANULADO
--   EN_PREPARACION  → LISTO_RETIRO, RECHAZADO, ANULADO
--   LISTO_RETIRO    → ENTREGADO, ANULADO
--   ENTREGADO, RECHAZADO, ANULADO → (terminales)
CREATE OR REPLACE FUNCTION validar_transicion_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Estados terminales no pueden cambiar
  IF OLD.estado IN ('ENTREGADO','RECHAZADO','ANULADO') THEN
    RAISE EXCEPTION 'Transición no permitida: estado % es terminal', OLD.estado;
  END IF;

  -- Mapa de transiciones permitidas
  IF (OLD.estado = 'BORRADOR'       AND NEW.estado IN ('ENVIADO','ANULADO')) OR
     (OLD.estado = 'ENVIADO'        AND NEW.estado IN ('EN_PREPARACION','RECHAZADO','ANULADO')) OR
     (OLD.estado = 'EN_PREPARACION' AND NEW.estado IN ('LISTO_RETIRO','RECHAZADO','ANULADO')) OR
     (OLD.estado = 'LISTO_RETIRO'   AND NEW.estado IN ('ENTREGADO','ANULADO'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transición no permitida: % → %', OLD.estado, NEW.estado;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ordenes_pedido_validar_transicion ON ordenes_pedido;
CREATE TRIGGER ordenes_pedido_validar_transicion
  BEFORE UPDATE OF estado ON ordenes_pedido
  FOR EACH ROW EXECUTE FUNCTION validar_transicion_pedido();

-- =====================================================
-- TRIGGER: bloquear edición de líneas fuera de BORRADOR
-- =====================================================
-- La función entregar_orden_pedido necesita actualizar cantidad_entregada
-- al cerrar el pedido, así que esa actualización se hace con
-- session_replication_role='replica' (bypass de triggers) dentro de la function.
CREATE OR REPLACE FUNCTION bloquear_edicion_lineas_post_borrador()
RETURNS TRIGGER AS $$
DECLARE
  v_estado estado_orden_pedido;
  v_orden_id UUID;
BEGIN
  -- Bypass cuando se está ejecutando entregar_orden_pedido (GUC local)
  IF current_setting('app.entregando_orden_pedido', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_orden_id := COALESCE(NEW.orden_id, OLD.orden_id);
  SELECT estado INTO v_estado FROM ordenes_pedido WHERE id = v_orden_id;

  IF v_estado IS NULL THEN
    RETURN COALESCE(NEW, OLD); -- la orden no existe (caso CASCADE), permitir
  END IF;

  IF v_estado <> 'BORRADOR' THEN
    RAISE EXCEPTION 'No se pueden modificar líneas de una orden en estado %', v_estado;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lineas_bloquear_post_borrador ON ordenes_pedido_lineas;
CREATE TRIGGER lineas_bloquear_post_borrador
  BEFORE UPDATE OR DELETE ON ordenes_pedido_lineas
  FOR EACH ROW EXECUTE FUNCTION bloquear_edicion_lineas_post_borrador();

-- =====================================================
-- TRIGGER: updated_at automático
-- =====================================================
DROP TRIGGER IF EXISTS ordenes_pedido_updated_at ON ordenes_pedido;
CREATE TRIGGER ordenes_pedido_updated_at
  BEFORE UPDATE ON ordenes_pedido
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- FUNCIÓN entregar_orden_pedido
-- Materializa el pedido como despachos PEPS reales
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
  v_cantidad_a_entregar NUMERIC;
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

  PERFORM set_config('app.entregando_orden_pedido', '', true);

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

-- =====================================================
-- RLS (consistente con el resto del proyecto)
-- =====================================================
ALTER TABLE ordenes_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_pedido_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contador_consecutivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read ordenes_pedido" ON ordenes_pedido;
DROP POLICY IF EXISTS "Authenticated can read ordenes_pedido_lineas" ON ordenes_pedido_lineas;
DROP POLICY IF EXISTS "Authenticated can read contador_consecutivos" ON contador_consecutivos;
DROP POLICY IF EXISTS "Service role full access ordenes_pedido" ON ordenes_pedido;
DROP POLICY IF EXISTS "Service role full access ordenes_pedido_lineas" ON ordenes_pedido_lineas;
DROP POLICY IF EXISTS "Service role full access contador_consecutivos" ON contador_consecutivos;

CREATE POLICY "Authenticated can read ordenes_pedido"
  ON ordenes_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read ordenes_pedido_lineas"
  ON ordenes_pedido_lineas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read contador_consecutivos"
  ON contador_consecutivos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access ordenes_pedido"
  ON ordenes_pedido FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ordenes_pedido_lineas"
  ON ordenes_pedido_lineas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access contador_consecutivos"
  ON contador_consecutivos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION siguiente_consecutivo TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION entregar_orden_pedido TO authenticated, service_role;
