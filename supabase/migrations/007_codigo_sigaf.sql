-- =====================================================
-- Migration 007: Agregar codigo_sigaf a articulos
-- =====================================================

-- Agregar columna codigo_sigaf a articulos
-- (descripcion_sigaf ya existe)
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS codigo_sigaf TEXT;
CREATE INDEX IF NOT EXISTS idx_articulos_codigo_sigaf ON articulos(codigo_sigaf);
