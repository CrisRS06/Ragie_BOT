-- =====================================================
-- Migration 006: Soporte para Múltiples Bodegas
-- =====================================================

-- =====================================================
-- TABLA: bodegas
-- =====================================================
CREATE TABLE IF NOT EXISTS bodegas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  responsable TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bodegas_codigo ON bodegas(codigo);
CREATE INDEX IF NOT EXISTS idx_bodegas_activo ON bodegas(activo);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS bodegas_updated_at ON bodegas;
CREATE TRIGGER bodegas_updated_at
  BEFORE UPDATE ON bodegas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- DATOS INICIALES
-- =====================================================
INSERT INTO bodegas (codigo, nombre) VALUES
  ('BOD-ALB', 'Programa de Albergues'),
  ('BOD-OFL', 'Oficinas Locales'),
  ('BOD-DAR', 'Oficinas del Darih')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- AGREGAR bodega_id A TABLAS EXISTENTES
-- =====================================================

-- Agregar a lotes
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES bodegas(id);
CREATE INDEX IF NOT EXISTS idx_lotes_bodega ON lotes(bodega_id);

-- Actualizar índice PEPS para incluir bodega
DROP INDEX IF EXISTS idx_lotes_peps;
CREATE INDEX idx_lotes_peps ON lotes(articulo_id, bodega_id, fecha_ingreso ASC);

-- Agregar a movimientos (para histórico)
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES bodegas(id);
CREATE INDEX IF NOT EXISTS idx_movimientos_bodega ON movimientos(bodega_id);

-- Agregar a documentos_recepcion (para recepciones multi-producto)
ALTER TABLE documentos_recepcion ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES bodegas(id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE bodegas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read bodegas" ON bodegas;
CREATE POLICY "Authenticated can read bodegas" ON bodegas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access bodegas" ON bodegas;
CREATE POLICY "Service role full access bodegas" ON bodegas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- ACTUALIZAR FUNCIÓN receive_inventory()
-- =====================================================
CREATE OR REPLACE FUNCTION receive_inventory(
  p_articulo_id UUID,
  p_cantidad NUMERIC,
  p_fecha_vencimiento DATE,
  p_costo_unitario NUMERIC,
  p_usuario_id UUID,
  p_proveedor TEXT DEFAULT NULL,
  p_numero_lote TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL,
  p_bodega_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_lote_id UUID;
  v_movimiento_id UUID;
BEGIN
  -- Crear lote CON bodega
  INSERT INTO lotes (
    articulo_id, cantidad_inicial, cantidad_disponible,
    fecha_vencimiento, costo_unitario, proveedor, numero_lote, bodega_id
  )
  VALUES (
    p_articulo_id, p_cantidad, p_cantidad,
    p_fecha_vencimiento, p_costo_unitario, p_proveedor, p_numero_lote, p_bodega_id
  )
  RETURNING id INTO v_lote_id;

  -- Crear movimiento CON bodega
  INSERT INTO movimientos (
    tipo, articulo_id, lote_id, cantidad,
    costo_unitario_peps, usuario_id, documento_referencia, bodega_id
  )
  VALUES (
    'ENTRADA', p_articulo_id, v_lote_id, p_cantidad,
    p_costo_unitario, p_usuario_id, p_documento, p_bodega_id
  )
  RETURNING id INTO v_movimiento_id;

  -- Audit log con bodega
  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
  VALUES (
    p_usuario_id, 'RECEPCION', 'lote', v_lote_id::text,
    jsonb_build_object(
      'articulo_id', p_articulo_id,
      'cantidad', p_cantidad,
      'costo', p_costo_unitario,
      'bodega_id', p_bodega_id
    )
  );

  RETURN v_lote_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ACTUALIZAR FUNCIÓN dispatch_peps()
-- =====================================================
CREATE OR REPLACE FUNCTION dispatch_peps(
  p_articulo_id UUID,
  p_cantidad NUMERIC,
  p_usuario_id UUID,
  p_receptor TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_bodega_id UUID DEFAULT NULL
)
RETURNS TABLE(
  lote_id UUID,
  cantidad_consumida NUMERIC,
  costo_unitario NUMERIC
) AS $$
DECLARE
  v_remaining NUMERIC := p_cantidad;
  v_lote RECORD;
  v_movimiento_id UUID;
BEGIN
  -- Validar stock FILTRANDO POR BODEGA si se especifica
  IF (SELECT COALESCE(SUM(l.cantidad_disponible), 0)
      FROM lotes l
      WHERE l.articulo_id = p_articulo_id
        AND l.cantidad_disponible > 0
        AND l.activo = true
        AND (p_bodega_id IS NULL OR l.bodega_id = p_bodega_id)
     ) < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para el articulo en la bodega especificada';
  END IF;

  -- Procesar lotes en orden FIFO, FILTRANDO POR BODEGA
  FOR v_lote IN
    SELECT l.id, l.cantidad_disponible, l.costo_unitario AS lote_costo, l.bodega_id
    FROM lotes l
    WHERE l.articulo_id = p_articulo_id
      AND l.cantidad_disponible > 0
      AND l.activo = true
      AND (p_bodega_id IS NULL OR l.bodega_id = p_bodega_id)
    ORDER BY l.fecha_ingreso ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    lote_id := v_lote.id;
    cantidad_consumida := LEAST(v_lote.cantidad_disponible, v_remaining);
    costo_unitario := v_lote.lote_costo;

    -- Actualizar lote
    UPDATE lotes
    SET cantidad_disponible = lotes.cantidad_disponible - cantidad_consumida,
        agotado = CASE WHEN lotes.cantidad_disponible - cantidad_consumida <= 0 THEN true ELSE false END
    WHERE lotes.id = v_lote.id;

    -- Crear movimiento CON bodega del lote
    INSERT INTO movimientos (
      tipo, articulo_id, lote_id, cantidad, costo_unitario_peps,
      usuario_id, receptor_nombre, documento_referencia, observaciones, bodega_id
    )
    VALUES (
      'SALIDA', p_articulo_id, v_lote.id, cantidad_consumida, v_lote.lote_costo,
      p_usuario_id, p_receptor, p_documento, p_observaciones, v_lote.bodega_id
    )
    RETURNING id INTO v_movimiento_id;

    v_remaining := v_remaining - cantidad_consumida;
    RETURN NEXT;
  END LOOP;

  -- Audit log con bodega
  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
  VALUES (
    p_usuario_id, 'DESPACHO_PEPS', 'movimiento', v_movimiento_id::text,
    jsonb_build_object(
      'articulo_id', p_articulo_id,
      'cantidad', p_cantidad,
      'receptor', p_receptor,
      'bodega_id', p_bodega_id
    )
  );
END;
$$ LANGUAGE plpgsql;
