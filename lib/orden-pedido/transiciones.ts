/**
 * Máquina de transiciones para Órdenes de Pedido.
 * Espejo client-side de la matriz validada por el trigger PG `validar_transicion_pedido`.
 * Determina qué acciones puede ejecutar un usuario según su rol, el estado actual,
 * y si es o no el solicitante original.
 */

import type { RolUsuario } from '../permissions'

export type EstadoPedido =
  | 'BORRADOR'
  | 'ENVIADO'
  | 'EN_PREPARACION'
  | 'LISTO_RETIRO'
  | 'ENTREGADO'
  | 'RECHAZADO'
  | 'ANULADO'

export type AccionPedido =
  | 'enviar'
  | 'aceptar'
  | 'marcar_listo'
  | 'entregar'
  | 'rechazar'
  | 'anular'
  | 'reabrir'

export const ESTADOS_TERMINALES: EstadoPedido[] = ['ENTREGADO', 'RECHAZADO', 'ANULADO']

/** Transiciones de estado permitidas (independiente del rol). */
export const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  BORRADOR: ['ENVIADO', 'ANULADO'],
  ENVIADO: ['EN_PREPARACION', 'RECHAZADO', 'ANULADO', 'BORRADOR'],
  EN_PREPARACION: ['LISTO_RETIRO', 'RECHAZADO', 'ANULADO'],
  LISTO_RETIRO: ['ENTREGADO', 'ANULADO'],
  ENTREGADO: [],
  RECHAZADO: [],
  ANULADO: [],
}

/** Estado resultante de cada acción. */
const ESTADO_DESTINO: Record<AccionPedido, EstadoPedido> = {
  enviar: 'ENVIADO',
  aceptar: 'EN_PREPARACION',
  marcar_listo: 'LISTO_RETIRO',
  entregar: 'ENTREGADO',
  rechazar: 'RECHAZADO',
  anular: 'ANULADO',
  reabrir: 'BORRADOR',
}

/**
 * ¿Puede `rol` ejecutar `accion` sobre una orden en `estado`?
 * `esSolicitante` indica si el usuario es el creador original — solo el solicitante
 * (o un ADMIN) puede anular su propia orden en BORRADOR/ENVIADO.
 */
export function puedeTransicionar(
  estado: EstadoPedido,
  accion: AccionPedido,
  rol: RolUsuario,
  esSolicitante: boolean
): boolean {
  const destino = ESTADO_DESTINO[accion]
  if (!TRANSICIONES_VALIDAS[estado].includes(destino)) return false

  if (rol === 'ADMINISTRADOR') return true

  switch (accion) {
    case 'enviar':
      // Solo el solicitante envía su borrador
      return esSolicitante && estado === 'BORRADOR'

    case 'aceptar':
    case 'marcar_listo':
    case 'entregar':
    case 'rechazar':
      // Operaciones del bodeguero
      return rol === 'OPERADOR'

    case 'anular':
      // El solicitante puede anular sus BORRADOR/ENVIADO
      // El OPERADOR puede anular un LISTO_RETIRO "no retirado"
      if (esSolicitante && (estado === 'BORRADOR' || estado === 'ENVIADO')) return true
      if (rol === 'OPERADOR' && estado === 'LISTO_RETIRO') return true
      return false

    case 'reabrir':
      // Devolver a borrador para corregir: solo el solicitante (o ADMIN) y solo
      // mientras el bodeguero no lo haya aceptado (estado ENVIADO).
      return esSolicitante && estado === 'ENVIADO'
  }
}

/** Acciones disponibles para el usuario en un estado dado. Útil para construir UI. */
export function accionesDisponibles(
  estado: EstadoPedido,
  rol: RolUsuario,
  esSolicitante: boolean
): AccionPedido[] {
  const acciones: AccionPedido[] = ['enviar', 'aceptar', 'marcar_listo', 'entregar', 'rechazar', 'anular', 'reabrir']
  return acciones.filter((a) => puedeTransicionar(estado, a, rol, esSolicitante))
}

/** Etiqueta humana para mostrar en UI. */
export const LABEL_ESTADO: Record<EstadoPedido, string> = {
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  EN_PREPARACION: 'En preparación',
  LISTO_RETIRO: 'Listo para retiro',
  ENTREGADO: 'Entregado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
}

export const LABEL_ACCION: Record<AccionPedido, string> = {
  enviar: 'Enviar',
  aceptar: 'Aceptar y preparar',
  marcar_listo: 'Marcar como listo',
  entregar: 'Entregar',
  rechazar: 'Rechazar',
  anular: 'Anular',
  reabrir: 'Devolver a borrador',
}
