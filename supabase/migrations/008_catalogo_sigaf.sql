-- =====================================================
-- Migration 008: Catálogo de Códigos SIGAF
-- =====================================================

-- Tabla para catálogo de códigos SIGAF
CREATE TABLE IF NOT EXISTS catalogo_sigaf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  partida TEXT,
  precio_unitario NUMERIC,
  iva_percent NUMERIC DEFAULT 0.13,
  clasificacion TEXT,
  contratacion TEXT,
  contratista TEXT,
  plazo_entrega TEXT,
  analista TEXT,
  observaciones TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_catalogo_sigaf_codigo ON catalogo_sigaf(codigo);
CREATE INDEX IF NOT EXISTS idx_catalogo_sigaf_activo ON catalogo_sigaf(activo);

-- Índice para búsqueda full-text en descripción
CREATE INDEX IF NOT EXISTS idx_catalogo_sigaf_descripcion
  ON catalogo_sigaf USING gin(to_tsvector('spanish', descripcion));

-- RLS
ALTER TABLE catalogo_sigaf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read catalogo_sigaf" ON catalogo_sigaf;
CREATE POLICY "Authenticated can read catalogo_sigaf" ON catalogo_sigaf
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access catalogo_sigaf" ON catalogo_sigaf;
CREATE POLICY "Service role full access catalogo_sigaf" ON catalogo_sigaf
  FOR ALL TO service_role USING (true) WITH CHECK (true);
