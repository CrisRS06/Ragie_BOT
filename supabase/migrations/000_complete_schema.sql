-- =====================================================
-- PEPS Inventory System - Complete Database Schema
-- =====================================================

-- =====================================================
-- ENUMS (create if not exists)
-- =====================================================
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('ADMINISTRADOR', 'OPERADOR', 'AUDITOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Table: perfiles (User profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'OPERADOR',
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: articulos (Products/Items)
CREATE TABLE IF NOT EXISTS articulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  descripcion_sigaf TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  iva_percent NUMERIC DEFAULT 0.13,
  activo BOOLEAN DEFAULT true,
  stock_minimo NUMERIC,
  marca TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articulos_sku ON articulos(sku);
CREATE INDEX IF NOT EXISTS idx_articulos_activo ON articulos(activo);

-- Table: lotes (Batches for PEPS/FIFO)
CREATE TABLE IF NOT EXISTS lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id UUID NOT NULL REFERENCES articulos(id) ON DELETE RESTRICT,
  cantidad_inicial NUMERIC NOT NULL,
  cantidad_disponible NUMERIC NOT NULL,
  fecha_ingreso TIMESTAMPTZ DEFAULT now(),
  fecha_vencimiento DATE NOT NULL,
  numero_lote TEXT,
  proveedor TEXT,
  costo_unitario NUMERIC,
  ubicacion TEXT,
  activo BOOLEAN DEFAULT true,
  agotado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lotes_peps ON lotes(articulo_id, fecha_ingreso ASC);
CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_lotes_activo ON lotes(activo, cantidad_disponible);

-- Table: proveedores (Suppliers)
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  ruc TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  contacto TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_codigo ON proveedores(codigo);

-- Table: unidades_receptoras (Receiving units/locations)
CREATE TABLE IF NOT EXISTS unidades_receptoras (
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

CREATE INDEX IF NOT EXISTS idx_unidades_receptoras_codigo ON unidades_receptoras(codigo);

-- Table: movimientos (Inventory movements)
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  articulo_id UUID NOT NULL REFERENCES articulos(id),
  lote_id UUID REFERENCES lotes(id),
  cantidad NUMERIC NOT NULL,
  unidad_medida TEXT,
  costo_unitario_peps NUMERIC,
  usuario_id UUID REFERENCES auth.users(id),
  receptor_nombre TEXT,
  receptor_cedula TEXT,
  unidad_receptora_id UUID REFERENCES unidades_receptoras(id),
  documento_referencia TEXT,
  observaciones TEXT,
  motivo TEXT,
  motivo_anulacion TEXT,
  anulado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(created_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_articulo ON movimientos(articulo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_lote ON movimientos(lote_id);

-- Table: configuracion (System configuration)
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'string',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: documentos_recepcion (Reception documents)
CREATE TABLE IF NOT EXISTS documentos_recepcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id),
  documento_externo TEXT,
  fecha_documento DATE,
  observaciones TEXT,
  estado TEXT DEFAULT 'BORRADOR',
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_recepcion_numero ON documentos_recepcion(numero);
CREATE INDEX IF NOT EXISTS idx_documentos_recepcion_estado ON documentos_recepcion(estado);

-- Table: detalles_recepcion (Reception document details)
CREATE TABLE IF NOT EXISTS detalles_recepcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos_recepcion(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulos(id),
  cantidad NUMERIC NOT NULL,
  costo_unitario NUMERIC,
  fecha_vencimiento DATE,
  numero_lote_proveedor TEXT,
  ubicacion TEXT,
  lote_id UUID REFERENCES lotes(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detalles_recepcion_documento ON detalles_recepcion(documento_id);

-- Table: informes (Reports)
CREATE TABLE IF NOT EXISTS informes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fin DATE,
  datos JSONB,
  hash_firma TEXT,
  generado_por_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_informes_tipo ON informes(tipo);
CREATE INDEX IF NOT EXISTS idx_informes_fecha ON informes(created_at);

-- Table: cortes (Inventory cuts/snapshots)
CREATE TABLE IF NOT EXISTS cortes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT,
  motivo TEXT,
  hash_snapshot TEXT,
  total_articulos INTEGER,
  total_lotes INTEGER,
  periodo_inicio DATE,
  periodo_fin DATE,
  completado BOOLEAN DEFAULT false,
  solicitado_por_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cortes_fecha ON cortes(created_at);
CREATE INDEX IF NOT EXISTS idx_cortes_tipo ON cortes(tipo);

-- Table: detalles_corte (Cut details)
CREATE TABLE IF NOT EXISTS detalles_corte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corte_id UUID NOT NULL REFERENCES cortes(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulos(id),
  lote_id UUID REFERENCES lotes(id),
  cantidad NUMERIC NOT NULL,
  fecha_vencimiento DATE,
  ubicacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_detalles_corte_corte ON detalles_corte(corte_id);

-- Table: audit_log (Immutable audit trail)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_fecha ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_accion ON audit_log(accion);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Prevent modification of audit_log
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable ON audit_log;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articulos_updated_at ON articulos;
CREATE TRIGGER articulos_updated_at
  BEFORE UPDATE ON articulos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS perfiles_updated_at ON perfiles;
CREATE TRIGGER perfiles_updated_at
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS proveedores_updated_at ON proveedores;
CREATE TRIGGER proveedores_updated_at
  BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS unidades_receptoras_updated_at ON unidades_receptoras;
CREATE TRIGGER unidades_receptoras_updated_at
  BEFORE UPDATE ON unidades_receptoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS configuracion_updated_at ON configuracion;
CREATE TRIGGER configuracion_updated_at
  BEFORE UPDATE ON configuracion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS documentos_recepcion_updated_at ON documentos_recepcion;
CREATE TRIGGER documentos_recepcion_updated_at
  BEFORE UPDATE ON documentos_recepcion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- PEPS FUNCTIONS
-- =====================================================

-- Function: PEPS Dispatch (FIFO)
CREATE OR REPLACE FUNCTION dispatch_peps(
  p_articulo_id UUID,
  p_cantidad NUMERIC,
  p_usuario_id UUID,
  p_receptor TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL
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
  -- Validate available stock
  IF (SELECT COALESCE(SUM(cantidad_disponible), 0)
      FROM lotes WHERE articulo_id = p_articulo_id AND cantidad_disponible > 0 AND activo = true) < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para el articulo';
  END IF;

  -- Process batches in FIFO order
  FOR v_lote IN
    SELECT id, cantidad_disponible, costo_unitario
    FROM lotes
    WHERE articulo_id = p_articulo_id
      AND cantidad_disponible > 0
      AND activo = true
    ORDER BY fecha_ingreso ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Calculate amount to consume from this batch
    lote_id := v_lote.id;
    cantidad_consumida := LEAST(v_lote.cantidad_disponible, v_remaining);
    costo_unitario := v_lote.costo_unitario;

    -- Update batch
    UPDATE lotes
    SET cantidad_disponible = cantidad_disponible - cantidad_consumida,
        agotado = CASE WHEN cantidad_disponible - cantidad_consumida <= 0 THEN true ELSE false END
    WHERE id = v_lote.id;

    -- Create movement
    INSERT INTO movimientos (tipo, articulo_id, lote_id, cantidad, costo_unitario_peps, usuario_id, receptor_nombre, documento_referencia, observaciones)
    VALUES ('SALIDA', p_articulo_id, v_lote.id, cantidad_consumida, v_lote.costo_unitario, p_usuario_id, p_receptor, p_documento, p_observaciones)
    RETURNING id INTO v_movimiento_id;

    v_remaining := v_remaining - cantidad_consumida;
    RETURN NEXT;
  END LOOP;

  -- Register in audit_log
  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
  VALUES (p_usuario_id, 'DESPACHO_PEPS', 'movimiento', v_movimiento_id::text,
          jsonb_build_object('articulo_id', p_articulo_id, 'cantidad', p_cantidad, 'receptor', p_receptor));
END;
$$ LANGUAGE plpgsql;

-- Function: Receive Inventory
CREATE OR REPLACE FUNCTION receive_inventory(
  p_articulo_id UUID,
  p_cantidad NUMERIC,
  p_fecha_vencimiento DATE,
  p_costo_unitario NUMERIC,
  p_usuario_id UUID,
  p_proveedor TEXT DEFAULT NULL,
  p_numero_lote TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_lote_id UUID;
  v_movimiento_id UUID;
BEGIN
  -- Create batch
  INSERT INTO lotes (articulo_id, cantidad_inicial, cantidad_disponible, fecha_vencimiento, costo_unitario, proveedor, numero_lote)
  VALUES (p_articulo_id, p_cantidad, p_cantidad, p_fecha_vencimiento, p_costo_unitario, p_proveedor, p_numero_lote)
  RETURNING id INTO v_lote_id;

  -- Create movement
  INSERT INTO movimientos (tipo, articulo_id, lote_id, cantidad, costo_unitario_peps, usuario_id, documento_referencia)
  VALUES ('ENTRADA', p_articulo_id, v_lote_id, p_cantidad, p_costo_unitario, p_usuario_id, p_documento)
  RETURNING id INTO v_movimiento_id;

  -- Audit log
  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_nuevos)
  VALUES (p_usuario_id, 'RECEPCION', 'lote', v_lote_id::text,
          jsonb_build_object('articulo_id', p_articulo_id, 'cantidad', p_cantidad, 'costo', p_costo_unitario));

  RETURN v_lote_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Adjust Inventory
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_lote_id UUID,
  p_cantidad_ajuste NUMERIC,
  p_usuario_id UUID,
  p_observaciones TEXT
)
RETURNS UUID AS $$
DECLARE
  v_lote RECORD;
  v_movimiento_id UUID;
  v_nueva_cantidad NUMERIC;
BEGIN
  -- Get current batch info
  SELECT * INTO v_lote FROM lotes WHERE id = p_lote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;

  v_nueva_cantidad := v_lote.cantidad_disponible + p_cantidad_ajuste;

  IF v_nueva_cantidad < 0 THEN
    RAISE EXCEPTION 'El ajuste resultaria en cantidad negativa';
  END IF;

  -- Update batch
  UPDATE lotes
  SET cantidad_disponible = v_nueva_cantidad,
      agotado = CASE WHEN v_nueva_cantidad <= 0 THEN true ELSE false END
  WHERE id = p_lote_id;

  -- Create adjustment movement
  INSERT INTO movimientos (tipo, articulo_id, lote_id, cantidad, costo_unitario_peps, usuario_id, observaciones, motivo)
  VALUES ('AJUSTE', v_lote.articulo_id, p_lote_id, ABS(p_cantidad_ajuste), v_lote.costo_unitario, p_usuario_id, p_observaciones, 'AJUSTE_INVENTARIO')
  RETURNING id INTO v_movimiento_id;

  -- Audit log
  INSERT INTO audit_log (usuario_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos)
  VALUES (p_usuario_id, 'AJUSTE_INVENTARIO', 'lote', p_lote_id::text,
          jsonb_build_object('cantidad_disponible', v_lote.cantidad_disponible),
          jsonb_build_object('cantidad_disponible', v_nueva_cantidad, 'ajuste', p_cantidad_ajuste));

  RETURN v_movimiento_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades_receptoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_recepcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_recepcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE informes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_corte ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated can read articulos" ON articulos;
DROP POLICY IF EXISTS "Authenticated can read lotes" ON lotes;
DROP POLICY IF EXISTS "Authenticated can read movimientos" ON movimientos;
DROP POLICY IF EXISTS "Authenticated can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated can read perfiles" ON perfiles;
DROP POLICY IF EXISTS "Authenticated can read proveedores" ON proveedores;
DROP POLICY IF EXISTS "Authenticated can read unidades_receptoras" ON unidades_receptoras;
DROP POLICY IF EXISTS "Authenticated can read configuracion" ON configuracion;
DROP POLICY IF EXISTS "Authenticated can read documentos_recepcion" ON documentos_recepcion;
DROP POLICY IF EXISTS "Authenticated can read detalles_recepcion" ON detalles_recepcion;
DROP POLICY IF EXISTS "Authenticated can read informes" ON informes;
DROP POLICY IF EXISTS "Authenticated can read cortes" ON cortes;
DROP POLICY IF EXISTS "Authenticated can read detalles_corte" ON detalles_corte;

DROP POLICY IF EXISTS "Service role full access articulos" ON articulos;
DROP POLICY IF EXISTS "Service role full access lotes" ON lotes;
DROP POLICY IF EXISTS "Service role full access movimientos" ON movimientos;
DROP POLICY IF EXISTS "Service role full access audit_log" ON audit_log;
DROP POLICY IF EXISTS "Service role full access perfiles" ON perfiles;
DROP POLICY IF EXISTS "Service role full access proveedores" ON proveedores;
DROP POLICY IF EXISTS "Service role full access unidades_receptoras" ON unidades_receptoras;
DROP POLICY IF EXISTS "Service role full access configuracion" ON configuracion;
DROP POLICY IF EXISTS "Service role full access documentos_recepcion" ON documentos_recepcion;
DROP POLICY IF EXISTS "Service role full access detalles_recepcion" ON detalles_recepcion;
DROP POLICY IF EXISTS "Service role full access informes" ON informes;
DROP POLICY IF EXISTS "Service role full access cortes" ON cortes;
DROP POLICY IF EXISTS "Service role full access detalles_corte" ON detalles_corte;

-- Policies: Authenticated users can read all data
CREATE POLICY "Authenticated can read articulos" ON articulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read lotes" ON lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read movimientos" ON movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read audit_log" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read perfiles" ON perfiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read proveedores" ON proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read unidades_receptoras" ON unidades_receptoras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read configuracion" ON configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read documentos_recepcion" ON documentos_recepcion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read detalles_recepcion" ON detalles_recepcion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read informes" ON informes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read cortes" ON cortes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read detalles_corte" ON detalles_corte FOR SELECT TO authenticated USING (true);

-- Policies: Service role can do everything (used by server-side code)
CREATE POLICY "Service role full access articulos" ON articulos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access lotes" ON lotes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access movimientos" ON movimientos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access audit_log" ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access perfiles" ON perfiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access proveedores" ON proveedores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access unidades_receptoras" ON unidades_receptoras FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access configuracion" ON configuracion FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access documentos_recepcion" ON documentos_recepcion FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access detalles_recepcion" ON detalles_recepcion FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access informes" ON informes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access cortes" ON cortes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access detalles_corte" ON detalles_corte FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default configuration (only if not exists)
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
  ('nombre_empresa', 'Sistema PEPS - Bodegaje PANI', 'string', 'Nombre de la empresa'),
  ('dias_alerta_vencimiento', '30', 'number', 'Dias antes del vencimiento para alertar'),
  ('formato_fecha', 'dd/MM/yyyy', 'string', 'Formato de fecha para reportes'),
  ('moneda', 'CRC', 'string', 'Codigo de moneda'),
  ('iva_default', '0.13', 'number', 'Porcentaje de IVA por defecto')
ON CONFLICT (clave) DO NOTHING;

-- Insert default units (only if not exists)
INSERT INTO unidades_receptoras (codigo, nombre, direccion, responsable) VALUES
  ('ALB-001', 'Albergue Central', 'San Jose, Costa Rica', 'Coordinador General'),
  ('ALB-002', 'Albergue Norte', 'Heredia, Costa Rica', 'Coordinador Norte'),
  ('ALB-003', 'Albergue Sur', 'Cartago, Costa Rica', 'Coordinador Sur')
ON CONFLICT (codigo) DO NOTHING;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION dispatch_peps TO authenticated;
GRANT EXECUTE ON FUNCTION dispatch_peps TO service_role;
GRANT EXECUTE ON FUNCTION receive_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION receive_inventory TO service_role;
GRANT EXECUTE ON FUNCTION adjust_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_inventory TO service_role;
