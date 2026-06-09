-- =============================================================================
-- Saneo de catálogo: desactivar artículos FANTASMA con nombre duplicado
-- =============================================================================
-- Fecha: 2026-06-08
-- Proyecto Supabase prod: tzsdxujlfcuksqcyrvay (inventario-peps)
-- ESTADO: APLICADO a prod el 2026-06-08 -> 61 filas desactivadas, 0 nombres
--         duplicados restantes, 9 sobrevivientes intactos. Reversa: -undo.sql.
--
-- PROBLEMA
--   El catálogo (importado del SIGAF) tiene 20 nombres repetidos en 70 filas
--   activas. Cada nombre genérico tiene varios códigos SIGAF; casi siempre solo
--   uno tiene stock/historial y los demás nunca se usaron. Eso hace que en los
--   buscadores aparezcan entradas idénticas y se preste a error (agregar "el
--   mismo" artículo dos veces, o recibir mercadería en el código equivocado).
--
-- QUÉ HACE ESTE SCRIPT
--   Desactiva (activo=false, REVERSIBLE) exactamente los 61 artículos que son
--   FANTASMAS PUROS: tienen nombre duplicado, stock 0 y CERO huella en las 5
--   tablas que referencian articulos (lotes, movimientos, ordenes_pedido_lineas,
--   detalles_recepcion, detalles_corte). No se borra nada; solo se ocultan (toda
--   la app filtra por activo=true). Para revertir: ver el script -undo.sql.
--
-- SEGURIDAD (poka-yoke)
--   - El UPDATE está fijado a una lista EXPLÍCITA de 61 ids (revisada a mano) Y
--     re-verifica en el momento de aplicar que cada id sigue teniendo huella
--     CERO. Si entre la investigación y la aplicación alguno recibió stock o
--     movimiento, se SALTA solo (no se puede desactivar algo con historial).
--   - Idempotente: correrlo de nuevo no afecta filas ya desactivadas.
--   - Transaccional: si algo falla, no commitea nada.
--   - NO toca los 9 sobrevivientes con historial (incl. "Hilo dental ...626",
--     que tiene stock 0 pero SÍ historial -> es producto real, no fantasma).
--
-- VERIFICADO (read-only) el 2026-06-08:
--   61 fantasmas (huella 0)  |  9 sobrevivientes con historial
--   11 nombres grupo 100% muerto (escenario B)  |  9 nombres con sobreviviente (A)
--   Tras aplicar: 0 nombres duplicados activos.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ESCENARIO A (9): gemelo muerto; el grupo conserva 1 fila viva con historial.
-- ESCENARIO B (52): grupo 100% muerto (foam, láminas, muebles, cascos, etc.).
-- Lista única de 61 ids. El guard NOT EXISTS asegura huella cero al aplicar.
-- ---------------------------------------------------------------------------
WITH objetivo(id) AS (
  VALUES
  -- Escenario A: gemelo muerto (queda 1 vivo) ------------------------------
  ('1bf41045-b867-4674-b926-6f3dd1215777'::uuid), -- CEPILLO DE DIENTES NIÑOS  5313150392046649-002
  ('b26c220d-e0ab-4824-b492-0012bcc02542'::uuid), -- Champú para el cabello    5313162892222557-001
  ('07514c3f-9b31-4103-bbaa-838560e1fcb2'::uuid), -- COLCHONETA EJERCICIO      4922150692098090-002
  ('9f6045ff-5d9d-47a2-8bd2-e450fa284c1c'::uuid), -- Gel fijador anticaspa     5313160292222580-001
  ('db19845d-2338-48d0-bc3b-e0da77901674'::uuid), -- GUANTES palma acolchonada 4618150492320954-001
  ('d5b108c3-fd1c-49ed-89a5-961abfb70b66'::uuid), -- Hilo dental encerado      5313150492087124-001
  ('9f8f5448-fdc8-4ea4-857d-2b4953124838'::uuid), -- Jabón líq. antibacterial  5313160892222526-001
  ('930fd83e-b165-4d29-b219-ad791b699cd6'::uuid), -- POST-IT                   1411153092035644-001
  ('998f7f3b-c54b-49b7-b5e1-382b61aec10a'::uuid), -- Protectores diarios       5313161592073600-001
  -- Escenario B: grupo 100% muerto -----------------------------------------
  ('68291225-cac0-417f-b534-37c1480f98fb'::uuid), -- CASCO ACOLCHADO  ...793
  ('8fcede1b-2d11-4bc5-984a-ad4f39dea0b6'::uuid), -- CASCO ACOLCHADO  ...794
  ('d936ce09-948c-4f3e-87cd-7364ecf31d3f'::uuid), -- CASCO ACOLCHADO  ...798
  ('1f1fe56d-8875-435c-aa54-6277989b9f4b'::uuid), -- Champú para bebé ...034
  ('23061521-9cdd-4932-8afc-4cc0bb683400'::uuid), -- Champú para bebé ...559
  ('b586f29d-ae66-4f31-b573-b28aad845db2'::uuid), -- Desodorante hombre ...702
  ('04767298-4bee-45a0-9af1-1347b448bcc0'::uuid), -- Desodorante hombre ...705
  ('ddf4e2ae-4bd8-488f-ac3b-cf8427006760'::uuid), -- Desodorante mujer  ...703
  ('5b63749f-bfa1-4c63-9524-baea4b25801e'::uuid), -- Desodorante mujer  ...704
  ('1cb8afc4-afa8-4a62-859a-1bd3dee7b42a'::uuid), -- ESPUMA POLIURETANO ...389009
  ('8395b523-5332-438d-a8ed-2527ea0d8eaa'::uuid), -- ESPUMA POLIURETANO ...395882
  ('36741bad-fc6d-4c26-a6ae-c3d83fbafa98'::uuid), -- ESPUMA POLIURETANO ...398294
  ('0b24ebdd-ae02-43e4-9276-7889436cba22'::uuid), -- ESPUMA POLIURETANO ...398297
  ('44a0f10b-fcda-4bce-b0a1-593d62ba0a3c'::uuid), -- ESPUMA POLIURETANO ...398298
  ('87355ca8-c799-4789-9b01-34d30db14e8f'::uuid), -- ESPUMA POLIURETANO ...398300
  ('f88b2450-deda-47bd-be33-8c02de738c6f'::uuid), -- ESPUMA POLIURETANO ...398301
  ('de62f3d4-dd4c-4267-9dc0-a963feb02ee5'::uuid), -- ESPUMA POLIURETANO ...398302
  ('4426b989-e25e-42e6-8203-48739859aac7'::uuid), -- ESPUMA POLIURETANO ...398303
  ('b335ddde-177e-44a2-97cc-d949f13b6fad'::uuid), -- ESPUMA POLIURETANO ...398304
  ('78b513e0-5d77-426c-aaf2-0c8bd0e4d1d4'::uuid), -- LÁMINA FOAM ESTAMPADO CARTA ...414174
  ('b4f45ba1-34d8-4272-a557-7113efc68dda'::uuid), -- LÁMINA FOAM ESTAMPADO CARTA ...414180
  ('6953280d-169d-4929-bd0e-83e323dcd312'::uuid), -- LÁMINA FOAM 50x70 ...395881
  ('751fee32-458f-404c-aef5-415d3b1d0200'::uuid), -- LÁMINA FOAM 50x70 ...398315
  ('98c70564-0c47-47ad-a908-625f19646584'::uuid), -- LÁMINA FOAM 50x70 ...398316
  ('f1eedf15-61a7-4cd7-8f94-a3dead59cb12'::uuid), -- LÁMINA FOAM 50x70 ...398317
  ('685fc540-47de-4957-ba01-1c2432ddac04'::uuid), -- LÁMINA FOAM 50x70 ...398318
  ('eb00a766-24a0-4b12-a58f-deade7b9827c'::uuid), -- LÁMINA FOAM 50x70 ...398319
  ('4bc9d001-39c3-4094-a7a0-609f294b5247'::uuid), -- LÁMINA FOAM 50x70 ...398320
  ('95827279-59b6-45ab-999e-249983ca4cd1'::uuid), -- LÁMINA FOAM 50x70 ...398321
  ('5284337f-0a89-41b1-b804-b12aa54fc582'::uuid), -- LÁMINA FOAM 50x70 ...398322
  ('6645e754-dec1-4010-9f01-0d3588b6e03e'::uuid), -- LÁMINA FOAM 50x70 ...398323
  ('59ecc9af-bd7d-4c15-8de2-e9ccc91df643'::uuid), -- LÁMINA FOAM 50x70 ...398324
  ('c2de366d-b304-467a-914b-c96376680487'::uuid), -- LÁMINA FOAM 50x70 ...398325
  ('13dfd9cf-bef4-4303-90ea-75723fbf21d1'::uuid), -- LÁMINA FOAM CARTA ...398307
  ('99e9ad6c-dcfd-4720-8ecd-b09976bc8696'::uuid), -- LÁMINA FOAM CARTA ...398308
  ('7f025b7b-b99e-4664-adc7-0c033707e47e'::uuid), -- LÁMINA FOAM CARTA ...398309
  ('056b24ba-dbf2-4eb7-81c3-bac55d6c4b2d'::uuid), -- LÁMINA FOAM CARTA ...398310
  ('5b8bfb7b-9a27-4a59-833d-001e608caf21'::uuid), -- LÁMINA FOAM CARTA ...398311
  ('e5132dd6-ea3d-4f4c-827e-31a648cfe9a6'::uuid), -- LÁMINA FOAM CARTA ...398312
  ('7bcd8170-d2bc-40e2-9bd4-c2d8d7897786'::uuid), -- LÁMINA FOAM CARTA ...398313
  ('c3032475-5607-4ec1-be62-bcf83ea6e7fa'::uuid), -- LÁMINA FOAM CARTA ...398314
  ('50d2105f-15db-4ae1-8b67-d7f599c7ed60'::uuid), -- LÁMINA FOAM CARTA ...398326
  ('12b1ae07-bbcc-4086-b53d-e098318e261c'::uuid), -- LÁMINA FOAM CARTA ...398327
  ('dd088aaf-bebf-4835-91eb-d483d203c72c'::uuid), -- LÁMINA FOAM CARTA ...398328
  ('c9f3cc8d-a7b5-41f8-9df3-da17f8de113d'::uuid), -- LÁMINA FOAM CARTA ...398329
  ('2a2112f0-b413-4aaa-9eeb-8ef820be6189'::uuid), -- Mesa auxiliar fotocop. ...247099
  ('b35b6c78-3e3c-4eb1-a025-46a1f121e3e0'::uuid), -- Mesa auxiliar fotocop. ...247230
  ('fd3400ca-aec0-48e2-a5bd-d40af85de07e'::uuid), -- Mesa de Reuniones ...247242
  ('0a90b481-feec-465d-b230-1a4ee9b7dc9c'::uuid), -- Mesa de Reuniones ...247245
  ('d656ebd4-b43e-4dd6-9c98-579c0299f7b5'::uuid), -- Mesa de Reuniones ...247481
  ('5d9a7c77-b97c-482d-809e-1accdf466ceb'::uuid), -- Sillón blando ...246754
  ('7c53115a-86d8-493f-8d07-1bc3a3dd78e9'::uuid)  -- Sillón blando ...246767
)
UPDATE articulos a
SET activo = false
FROM objetivo o
WHERE a.id = o.id
  AND a.activo = true
  -- Re-verificación de huella cero AL MOMENTO de aplicar (no tocar si tiene historial)
  AND NOT EXISTS (SELECT 1 FROM lotes l                 WHERE l.articulo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM movimientos m           WHERE m.articulo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM ordenes_pedido_lineas p WHERE p.articulo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM detalles_recepcion r    WHERE r.articulo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM detalles_corte d        WHERE d.articulo_id = a.id);

-- Verificación post-aplicación (debe imprimir 0 nombres duplicados restantes).
DO $$
DECLARE v_dups int;
BEGIN
  SELECT count(*) INTO v_dups FROM (
    SELECT nombre FROM articulos WHERE activo = true GROUP BY nombre HAVING count(*) > 1
  ) t;
  RAISE NOTICE 'Nombres duplicados activos restantes: % (esperado: 0)', v_dups;
END $$;

COMMIT;
