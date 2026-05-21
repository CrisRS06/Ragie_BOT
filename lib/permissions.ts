/**
 * Single source of truth for roles and permissions.
 * Shared by server (lib/supabase/auth.ts) and client (hooks/useRoleAccess.ts).
 */

export type RolUsuario = 'ADMINISTRADOR' | 'OPERADOR' | 'AUDITOR'

export const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  ADMINISTRADOR: [
    'articulos.crear',
    'articulos.editar',
    'articulos.eliminar',
    'inventario.ver',
    'recepciones.crear',
    'recepciones.anular',
    'despachos.crear',
    'despachos.anular',
    'despachos.excepcion_peps',
    'ajustes.crear',
    'cortes.crear',
    'informes.generar',
    'bitacora.ver',
    'bitacora.verificar',
    'usuarios.gestionar',
    'bodegas.gestionar',
    'proveedores.gestionar',
    'unidades_receptoras.gestionar',
    'configuracion.gestionar',
    'catalogo.gestionar',
    'admin.acceso',
    'pedidos.crear',
    'pedidos.ver_propios',
    'pedidos.ver_todos',
    'pedidos.aceptar',
    'pedidos.marcar_listo',
    'pedidos.entregar',
    'pedidos.rechazar',
    'pedidos.anular_propio',
    'pedidos.anular_cualquiera',
  ],
  OPERADOR: [
    'articulos.ver',
    'recepciones.crear',
    'recepciones.anular',
    'despachos.crear',
    'despachos.anular',
    'ajustes.crear',
    'cortes.crear',
    'inventario.ver',
    'pedidos.crear',
    'pedidos.ver_propios',
    'pedidos.ver_todos',
    'pedidos.aceptar',
    'pedidos.marcar_listo',
    'pedidos.entregar',
    'pedidos.rechazar',
    'pedidos.anular_propio',
  ],
  AUDITOR: [
    'articulos.ver',
    'inventario.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
    'bitacora.verificar',
    'bitacora.exportar',
    'pedidos.crear',
    'pedidos.ver_propios',
    'pedidos.anular_propio',
  ],
}

export function hasPermission(rol: RolUsuario, permission: string): boolean {
  const permisos = PERMISOS_POR_ROL[rol] || []
  return permisos.includes(permission)
}
