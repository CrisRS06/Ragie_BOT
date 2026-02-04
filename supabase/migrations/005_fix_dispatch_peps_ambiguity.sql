-- Migration 005: Fix column ambiguity in dispatch_peps function
-- Issue: 'costo_unitario' is both a RETURNS TABLE column and a lotes table column
-- Solution: Qualify column references with table alias

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
  IF (SELECT COALESCE(SUM(l.cantidad_disponible), 0)
      FROM lotes l WHERE l.articulo_id = p_articulo_id AND l.cantidad_disponible > 0 AND l.activo = true) < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente para el articulo';
  END IF;

  -- Process batches in FIFO order
  FOR v_lote IN
    SELECT l.id, l.cantidad_disponible, l.costo_unitario AS lote_costo
    FROM lotes l
    WHERE l.articulo_id = p_articulo_id
      AND l.cantidad_disponible > 0
      AND l.activo = true
    ORDER BY l.fecha_ingreso ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Calculate amount to consume from this batch
    lote_id := v_lote.id;
    cantidad_consumida := LEAST(v_lote.cantidad_disponible, v_remaining);
    costo_unitario := v_lote.lote_costo;

    -- Update batch
    UPDATE lotes
    SET cantidad_disponible = lotes.cantidad_disponible - cantidad_consumida,
        agotado = CASE WHEN lotes.cantidad_disponible - cantidad_consumida <= 0 THEN true ELSE false END
    WHERE lotes.id = v_lote.id;

    -- Create movement
    INSERT INTO movimientos (tipo, articulo_id, lote_id, cantidad, costo_unitario_peps, usuario_id, receptor_nombre, documento_referencia, observaciones)
    VALUES ('SALIDA', p_articulo_id, v_lote.id, cantidad_consumida, v_lote.lote_costo, p_usuario_id, p_receptor, p_documento, p_observaciones)
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

COMMENT ON FUNCTION dispatch_peps IS 'PEPS (FIFO) dispatch function - consumes oldest batches first. Fixed column ambiguity in v005.';
