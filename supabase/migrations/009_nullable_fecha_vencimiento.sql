-- Migration 009: Make fecha_vencimiento nullable in lotes table
-- This allows creating lots without expiration dates

-- 1. Make fecha_vencimiento nullable
ALTER TABLE lotes ALTER COLUMN fecha_vencimiento DROP NOT NULL;

-- 2. Recreate receive_inventory function with optional fecha_vencimiento
-- Drop existing overloads first
DROP FUNCTION IF EXISTS receive_inventory(uuid, integer, date, numeric, uuid, text, text, text);
DROP FUNCTION IF EXISTS receive_inventory(uuid, integer, date, numeric, uuid, text, text, text, uuid);

CREATE OR REPLACE FUNCTION receive_inventory(
  p_articulo_id UUID,
  p_cantidad INTEGER,
  p_costo_unitario NUMERIC DEFAULT 0,
  p_usuario_id UUID DEFAULT NULL,
  p_fecha_vencimiento DATE DEFAULT NULL,
  p_proveedor TEXT DEFAULT NULL,
  p_numero_lote TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL,
  p_bodega_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lote_id UUID;
  v_movimiento_id UUID;
BEGIN
  -- Validate article exists
  IF NOT EXISTS (SELECT 1 FROM articulos WHERE id = p_articulo_id AND activo = true) THEN
    RAISE EXCEPTION 'Articulo no encontrado o inactivo: %', p_articulo_id;
  END IF;

  -- Validate quantity
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  -- Create lot
  INSERT INTO lotes (
    articulo_id,
    cantidad_inicial,
    cantidad_disponible,
    fecha_ingreso,
    fecha_vencimiento,
    costo_unitario,
    proveedor,
    numero_lote,
    bodega_id,
    activo,
    agotado
  ) VALUES (
    p_articulo_id,
    p_cantidad,
    p_cantidad,
    CURRENT_DATE,
    p_fecha_vencimiento,
    p_costo_unitario,
    p_proveedor,
    p_numero_lote,
    p_bodega_id,
    true,
    false
  )
  RETURNING id INTO v_lote_id;

  -- Create ENTRADA movement
  INSERT INTO movimientos (
    tipo,
    articulo_id,
    lote_id,
    cantidad,
    costo_unitario_peps,
    usuario_id,
    documento_referencia,
    observaciones,
    bodega_id
  ) VALUES (
    'ENTRADA',
    p_articulo_id,
    v_lote_id,
    p_cantidad,
    p_costo_unitario,
    p_usuario_id,
    p_documento,
    'Recepcion de inventario',
    p_bodega_id
  )
  RETURNING id INTO v_movimiento_id;

  -- Audit log
  INSERT INTO audit_log (
    usuario_id,
    accion,
    entidad,
    entidad_id,
    datos_nuevos
  ) VALUES (
    p_usuario_id,
    'RECEPCION',
    'lotes',
    v_lote_id,
    jsonb_build_object(
      'articulo_id', p_articulo_id,
      'cantidad', p_cantidad,
      'fecha_vencimiento', p_fecha_vencimiento,
      'costo_unitario', p_costo_unitario,
      'proveedor', p_proveedor,
      'numero_lote', p_numero_lote,
      'bodega_id', p_bodega_id,
      'movimiento_id', v_movimiento_id
    )
  );

  RETURN v_lote_id;
END;
$$;
