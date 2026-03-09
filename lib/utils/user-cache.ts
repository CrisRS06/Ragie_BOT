/**
 * Cached user name lookup.
 * Avoids repeated listUsers() calls across API routes within a short window.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

let cachedMap: Map<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

export async function getUserNameMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cachedMap && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedMap
  }

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const map = new Map<string, string>()
  for (const u of users || []) {
    map.set(
      u.id,
      u.app_metadata?.nombre || u.user_metadata?.nombre || u.email || 'Desconocido'
    )
  }

  cachedMap = map
  cacheTimestamp = now
  return map
}
