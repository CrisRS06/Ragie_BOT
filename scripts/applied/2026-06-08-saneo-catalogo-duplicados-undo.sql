-- =============================================================================
-- REVERSA del saneo de catálogo 2026-06-08
-- Reactiva (activo=true) exactamente los 61 artículos desactivados por
-- 2026-06-08-saneo-catalogo-duplicados.sql. Idempotente y transaccional.
-- =============================================================================

BEGIN;

UPDATE articulos
SET activo = true
WHERE id IN (
  '1bf41045-b867-4674-b926-6f3dd1215777','b26c220d-e0ab-4824-b492-0012bcc02542',
  '07514c3f-9b31-4103-bbaa-838560e1fcb2','9f6045ff-5d9d-47a2-8bd2-e450fa284c1c',
  'db19845d-2338-48d0-bc3b-e0da77901674','d5b108c3-fd1c-49ed-89a5-961abfb70b66',
  '9f8f5448-fdc8-4ea4-857d-2b4953124838','930fd83e-b165-4d29-b219-ad791b699cd6',
  '998f7f3b-c54b-49b7-b5e1-382b61aec10a','68291225-cac0-417f-b534-37c1480f98fb',
  '8fcede1b-2d11-4bc5-984a-ad4f39dea0b6','d936ce09-948c-4f3e-87cd-7364ecf31d3f',
  '1f1fe56d-8875-435c-aa54-6277989b9f4b','23061521-9cdd-4932-8afc-4cc0bb683400',
  'b586f29d-ae66-4f31-b573-b28aad845db2','04767298-4bee-45a0-9af1-1347b448bcc0',
  'ddf4e2ae-4bd8-488f-ac3b-cf8427006760','5b63749f-bfa1-4c63-9524-baea4b25801e',
  '1cb8afc4-afa8-4a62-859a-1bd3dee7b42a','8395b523-5332-438d-a8ed-2527ea0d8eaa',
  '36741bad-fc6d-4c26-a6ae-c3d83fbafa98','0b24ebdd-ae02-43e4-9276-7889436cba22',
  '44a0f10b-fcda-4bce-b0a1-593d62ba0a3c','87355ca8-c799-4789-9b01-34d30db14e8f',
  'f88b2450-deda-47bd-be33-8c02de738c6f','de62f3d4-dd4c-4267-9dc0-a963feb02ee5',
  '4426b989-e25e-42e6-8203-48739859aac7','b335ddde-177e-44a2-97cc-d949f13b6fad',
  '78b513e0-5d77-426c-aaf2-0c8bd0e4d1d4','b4f45ba1-34d8-4272-a557-7113efc68dda',
  '6953280d-169d-4929-bd0e-83e323dcd312','751fee32-458f-404c-aef5-415d3b1d0200',
  '98c70564-0c47-47ad-a908-625f19646584','f1eedf15-61a7-4cd7-8f94-a3dead59cb12',
  '685fc540-47de-4957-ba01-1c2432ddac04','eb00a766-24a0-4b12-a58f-deade7b9827c',
  '4bc9d001-39c3-4094-a7a0-609f294b5247','95827279-59b6-45ab-999e-249983ca4cd1',
  '5284337f-0a89-41b1-b804-b12aa54fc582','6645e754-dec1-4010-9f01-0d3588b6e03e',
  '59ecc9af-bd7d-4c15-8de2-e9ccc91df643','c2de366d-b304-467a-914b-c96376680487',
  '13dfd9cf-bef4-4303-90ea-75723fbf21d1','99e9ad6c-dcfd-4720-8ecd-b09976bc8696',
  '7f025b7b-b99e-4664-adc7-0c033707e47e','056b24ba-dbf2-4eb7-81c3-bac55d6c4b2d',
  '5b8bfb7b-9a27-4a59-833d-001e608caf21','e5132dd6-ea3d-4f4c-827e-31a648cfe9a6',
  '7bcd8170-d2bc-40e2-9bd4-c2d8d7897786','c3032475-5607-4ec1-be62-bcf83ea6e7fa',
  '50d2105f-15db-4ae1-8b67-d7f599c7ed60','12b1ae07-bbcc-4086-b53d-e098318e261c',
  'dd088aaf-bebf-4835-91eb-d483d203c72c','c9f3cc8d-a7b5-41f8-9df3-da17f8de113d',
  '2a2112f0-b413-4aaa-9eeb-8ef820be6189','b35b6c78-3e3c-4eb1-a025-46a1f121e3e0',
  'fd3400ca-aec0-48e2-a5bd-d40af85de07e','0a90b481-feec-465d-b230-1a4ee9b7dc9c',
  'd656ebd4-b43e-4dd6-9c98-579c0299f7b5','5d9a7c77-b97c-482d-809e-1accdf466ceb',
  '7c53115a-86d8-493f-8d07-1bc3a3dd78e9'
);

COMMIT;
