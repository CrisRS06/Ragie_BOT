/**
 * Sistema de Autenticacion con Supabase
 */

import { createClient } from './server'
import { supabaseAdmin } from './admin'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PERMISOS_POR_ROL, hasPermission as _hasPermission } from '@/lib/permissions'
import type { RolUsuario } from '@/lib/permissions'

// Re-export for consumers
export type { RolUsuario }
export { PERMISOS_POR_ROL }

/**
 * Interfaz de usuario autenticado
 */
export interface UsuarioAuth {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
}

/**
 * Obtiene el usuario actual desde Supabase Auth (server-side)
 */
export async function getCurrentUser(): Promise<UsuarioAuth | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return mapUserToAuth(user)
  } catch {
    return null
  }
}

/**
 * Obtiene el ID del usuario actual
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id || null
}

/**
 * Mapea un usuario de Supabase a UsuarioAuth.
 * Reads from app_metadata first, falls back to user_metadata.
 */
export function mapUserToAuth(user: User): UsuarioAuth {
  return {
    id: user.id,
    email: user.email || '',
    nombre: user.app_metadata?.nombre || user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
    rol: (user.app_metadata?.rol as RolUsuario) || (user.user_metadata?.rol as RolUsuario) || 'OPERADOR',
  }
}

/**
 * Crear usuario con Supabase Admin
 */
export async function createUser(
  email: string,
  password: string,
  nombre: string,
  rol: RolUsuario = 'OPERADOR'
) {
  const meta = { nombre, rol }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
    app_metadata: meta,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.user
}

/**
 * Verifica si el usuario tiene un rol especifico
 */
export function hasRole(user: UsuarioAuth | null, requiredRole: RolUsuario): boolean {
  if (!user) return false
  return user.rol === requiredRole
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export function hasAnyRole(user: UsuarioAuth | null, roles: RolUsuario[]): boolean {
  if (!user) return false
  return roles.includes(user.rol)
}

/**
 * Verifica si el usuario tiene un permiso especifico
 */
export function hasPermission(user: UsuarioAuth | null, permission: string): boolean {
  if (!user) return false
  return _hasPermission(user.rol, permission)
}

/**
 * Informacion del usuario para mostrar en UI
 */
export function getUserDisplayInfo(user: UsuarioAuth | null): { nombre: string; email: string; rolDisplay: string } | null {
  if (!user) return null

  const rolDisplayMap: Record<RolUsuario, string> = {
    ADMINISTRADOR: 'Administrador',
    OPERADOR: 'Operador de Bodega',
    AUDITOR: 'Auditor',
  }

  return {
    nombre: user.nombre,
    email: user.email,
    rolDisplay: rolDisplayMap[user.rol],
  }
}

/**
 * Verifica autenticacion + autorizacion en una sola llamada para API routes.
 * Retorna el usuario y cliente supabase si tiene permiso, o NextResponse 401/403.
 */
export async function requirePermission(
  permiso: string
): Promise<{ user: UsuarioAuth; supabase: SupabaseClient } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 }
    )
  }

  const usuarioAuth = mapUserToAuth(user)

  if (!hasPermission(usuarioAuth, permiso)) {
    return NextResponse.json(
      { success: false, error: 'No tiene permisos para esta accion' },
      { status: 403 }
    )
  }

  return { user: usuarioAuth, supabase }
}
