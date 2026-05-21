/**
 * Resuelve nombre/email de usuarios a partir de sus IDs.
 *
 * La identidad del sistema vive en Supabase Auth (user_metadata / app_metadata),
 * no en la tabla `perfiles` — que puede estar incompleta. Este helper consulta
 * Auth como fuente de verdad para evitar mostrar "Desconocido".
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface UsuarioResuelto {
  id: string
  nombre: string
  email: string | null
}

/** Resuelve un set de IDs de usuario a un Map id → { nombre, email }. */
export async function resolverUsuarios(ids: string[]): Promise<Map<string, UsuarioResuelto>> {
  const unicos = [...new Set(ids.filter(Boolean))]
  const mapa = new Map<string, UsuarioResuelto>()
  if (unicos.length === 0) return mapa

  // Una consulta puntual por ID (son pocos por request, máx ~3). Escala sin
  // límite de paginación y deja registrado cualquier fallo de Auth.
  const resultados = await Promise.all(
    unicos.map(async (id) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(id)
      if (error || !data?.user) {
        console.error('Fallo resolviendo usuario', id, error)
        return null
      }
      return data.user
    })
  )

  for (const u of resultados) {
    if (!u) continue
    const nombre =
      (u.user_metadata?.nombre as string | undefined) ||
      (u.app_metadata?.nombre as string | undefined) ||
      u.email?.split('@')[0] ||
      'Usuario'
    mapa.set(u.id, { id: u.id, nombre, email: u.email ?? null })
  }
  return mapa
}

/** Resuelve un solo usuario. Devuelve null si no existe. */
export async function resolverUsuario(id: string | null): Promise<UsuarioResuelto | null> {
  if (!id) return null
  const mapa = await resolverUsuarios([id])
  return mapa.get(id) ?? null
}
