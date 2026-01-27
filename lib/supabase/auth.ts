/**
 * Sistema de Autenticacion con Supabase
 */

import { createClient } from './server'
import { supabaseAdmin } from './admin'
import type { User } from '@supabase/supabase-js'

/**
 * Roles disponibles en el sistema
 */
export type RolUsuario = 'ADMINISTRADOR' | 'OPERADOR' | 'AUDITOR'

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
 * Mapea un usuario de Supabase a UsuarioAuth
 */
export function mapUserToAuth(user: User): UsuarioAuth {
  return {
    id: user.id,
    email: user.email || '',
    nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
    rol: (user.user_metadata?.rol as RolUsuario) || 'OPERADOR',
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
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      rol,
    },
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
 * Permisos por rol
 */
export const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  ADMINISTRADOR: [
    'articulos.crear',
    'articulos.editar',
    'articulos.eliminar',
    'recepciones.crear',
    'despachos.crear',
    'despachos.excepcion_peps',
    'informes.generar',
    'bitacora.ver',
    'bitacora.verificar',
    'usuarios.gestionar',
  ],
  OPERADOR: [
    'articulos.ver',
    'recepciones.crear',
    'despachos.crear',
    'inventario.ver',
  ],
  AUDITOR: [
    'articulos.ver',
    'inventario.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
    'bitacora.verificar',
    'bitacora.exportar',
  ],
}

/**
 * Verifica si el usuario tiene un permiso especifico
 */
export function hasPermission(user: UsuarioAuth | null, permission: string): boolean {
  if (!user) return false
  const permisos = PERMISOS_POR_ROL[user.rol] || []
  return permisos.includes(permission)
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
