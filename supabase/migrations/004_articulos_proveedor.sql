-- Migration: Add proveedor_id to articulos and make descripcion_sigaf optional
-- Date: 2026-01-27

-- 1. Make descripcion_sigaf optional (allow NULL)
ALTER TABLE articulos ALTER COLUMN descripcion_sigaf DROP NOT NULL;

-- 2. Add proveedor_id foreign key to articulos
ALTER TABLE articulos
ADD COLUMN proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL;

-- 3. Create index for better query performance
CREATE INDEX idx_articulos_proveedor ON articulos(proveedor_id);

-- Add comment for documentation
COMMENT ON COLUMN articulos.proveedor_id IS 'Proveedor asociado al artículo (opcional)';
COMMENT ON COLUMN articulos.descripcion_sigaf IS 'Descripción SIGAF del artículo (opcional, legacy)';
