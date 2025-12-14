/**
 * Helper de Autenticación Simplificada
 *
 * NOTA: Esta es una implementación simplificada para el MVP.
 * En producción, se debe implementar autenticación real con JWT/sesiones.
 */

/**
 * Usuario administrador hardcodeado para el MVP
 */
export const ADMIN_USER = {
  id: 'admin-001',
  email: 'admin@pani.go.cr',
  nombre: 'Administrador Sistema',
  rol: 'ADMINISTRADOR_CONTRATISTA' as const,
  activo: true,
};

/**
 * Roles disponibles en el sistema
 */
export type RolUsuario =
  | 'ADMINISTRADOR_CONTRATISTA'
  | 'OPERADOR_BODEGA'
  | 'FISCALIZADOR_PANI'
  | 'AUDITOR';

/**
 * Interfaz de usuario autenticado
 */
export interface UsuarioAuth {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
}

/**
 * Obtiene el usuario actual (simplificado - siempre retorna admin)
 * En producción, esto leería de la sesión/JWT
 */
export function getCurrentUser(): UsuarioAuth {
  return ADMIN_USER;
}

/**
 * Obtiene el ID del usuario actual para operaciones de bitácora
 */
export function getCurrentUserId(): string {
  return ADMIN_USER.id;
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(requiredRole: RolUsuario): boolean {
  const user = getCurrentUser();
  return user.rol === requiredRole;
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export function hasAnyRole(roles: RolUsuario[]): boolean {
  const user = getCurrentUser();
  return roles.includes(user.rol);
}

/**
 * Permisos por rol
 */
export const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  ADMINISTRADOR_CONTRATISTA: [
    'articulos.crear',
    'articulos.editar',
    'articulos.eliminar',
    'recepciones.crear',
    'despachos.crear',
    'despachos.excepcion_peps',
    'cortes.crear',
    'informes.generar',
    'bitacora.ver',
    'bitacora.verificar',
    'usuarios.gestionar',
  ],
  OPERADOR_BODEGA: [
    'articulos.ver',
    'recepciones.crear',
    'despachos.crear',
    'inventario.ver',
    'cortes.ver',
  ],
  FISCALIZADOR_PANI: [
    'articulos.ver',
    'inventario.ver',
    'cortes.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
  ],
  AUDITOR: [
    'articulos.ver',
    'inventario.ver',
    'cortes.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
    'bitacora.verificar',
    'bitacora.exportar',
  ],
};

/**
 * Verifica si el usuario tiene un permiso específico
 */
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser();
  const permisos = PERMISOS_POR_ROL[user.rol] || [];
  return permisos.includes(permission);
}

/**
 * Obtiene todos los permisos del usuario actual
 */
export function getUserPermissions(): string[] {
  const user = getCurrentUser();
  return PERMISOS_POR_ROL[user.rol] || [];
}

/**
 * Información del usuario para mostrar en UI
 */
export function getUserDisplayInfo(): { nombre: string; email: string; rolDisplay: string } {
  const user = getCurrentUser();

  const rolDisplayMap: Record<RolUsuario, string> = {
    ADMINISTRADOR_CONTRATISTA: 'Administrador',
    OPERADOR_BODEGA: 'Operador de Bodega',
    FISCALIZADOR_PANI: 'Fiscalizador PANI',
    AUDITOR: 'Auditor',
  };

  return {
    nombre: user.nombre,
    email: user.email,
    rolDisplay: rolDisplayMap[user.rol],
  };
}
