-- =====================================================
-- Migración 012: Mover el rol de user_metadata a app_metadata
-- =====================================================
-- Hallazgo de auditoría (H5): el código leía el rol con fallback a
-- `user_metadata`, que es editable por el propio usuario vía
-- `supabase.auth.updateUser()` → permitía auto-escalada de privilegios.
--
-- El código ahora lee el rol EXCLUSIVAMENTE de `app_metadata` (solo
-- modificable con service_role). Esta migración garantiza que todo
-- usuario existente tenga su rol en `app_metadata` antes de ese cambio,
-- para que nadie pierda su rol.
--
-- Idempotente: solo copia el rol cuando falta en app_metadata.
-- =====================================================

UPDATE auth.users
SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('rol', raw_user_meta_data->>'rol')
WHERE raw_user_meta_data->>'rol' IS NOT NULL
  AND (raw_app_meta_data->>'rol') IS NULL;
