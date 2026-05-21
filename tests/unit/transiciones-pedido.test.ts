/**
 * Unit tests para la máquina de transiciones de Órdenes de Pedido.
 * Cubre todas las combinaciones rol × estado × acción documentadas en el plan.
 */

import { describe, it, expect } from 'vitest'
import {
  puedeTransicionar,
  accionesDisponibles,
  TRANSICIONES_VALIDAS,
  ESTADOS_TERMINALES,
  type EstadoPedido,
  type AccionPedido,
} from '@/lib/orden-pedido/transiciones'
import type { RolUsuario } from '@/lib/permissions'

const TODOS_ESTADOS: EstadoPedido[] = [
  'BORRADOR', 'ENVIADO', 'EN_PREPARACION', 'LISTO_RETIRO',
  'ENTREGADO', 'RECHAZADO', 'ANULADO',
]
const TODAS_ACCIONES: AccionPedido[] = [
  'enviar', 'aceptar', 'marcar_listo', 'entregar', 'rechazar', 'anular',
]
const TODOS_ROLES: RolUsuario[] = ['ADMINISTRADOR', 'OPERADOR', 'AUDITOR']

describe('TRANSICIONES_VALIDAS', () => {
  it('estados terminales no tienen transiciones de salida', () => {
    for (const t of ESTADOS_TERMINALES) {
      expect(TRANSICIONES_VALIDAS[t]).toEqual([])
    }
  })

  it('BORRADOR sólo va a ENVIADO o ANULADO', () => {
    expect(TRANSICIONES_VALIDAS.BORRADOR).toEqual(['ENVIADO', 'ANULADO'])
  })

  it('ENVIADO puede ir a EN_PREPARACION, RECHAZADO o ANULADO', () => {
    expect(TRANSICIONES_VALIDAS.ENVIADO).toEqual(['EN_PREPARACION', 'RECHAZADO', 'ANULADO'])
  })

  it('EN_PREPARACION puede ir a LISTO_RETIRO, RECHAZADO o ANULADO', () => {
    expect(TRANSICIONES_VALIDAS.EN_PREPARACION).toEqual(['LISTO_RETIRO', 'RECHAZADO', 'ANULADO'])
  })

  it('LISTO_RETIRO sólo va a ENTREGADO o ANULADO', () => {
    expect(TRANSICIONES_VALIDAS.LISTO_RETIRO).toEqual(['ENTREGADO', 'ANULADO'])
  })
})

describe('puedeTransicionar — reglas por rol', () => {
  describe('ADMINISTRADOR', () => {
    it('puede ejecutar cualquier acción permitida por el estado', () => {
      for (const estado of TODOS_ESTADOS) {
        for (const accion of TODAS_ACCIONES) {
          const destinoValido = TRANSICIONES_VALIDAS[estado].some((d) => {
            return ({
              enviar: 'ENVIADO',
              aceptar: 'EN_PREPARACION',
              marcar_listo: 'LISTO_RETIRO',
              entregar: 'ENTREGADO',
              rechazar: 'RECHAZADO',
              anular: 'ANULADO',
            } as const)[accion] === d
          })
          // Probamos como no-solicitante para no enmascarar reglas
          expect(puedeTransicionar(estado, accion, 'ADMINISTRADOR', false)).toBe(destinoValido)
        }
      }
    })
  })

  describe('AUDITOR (solicitante)', () => {
    it('SÍ puede enviar su propio BORRADOR', () => {
      expect(puedeTransicionar('BORRADOR', 'enviar', 'AUDITOR', true)).toBe(true)
    })
    it('NO puede enviar si no es solicitante', () => {
      expect(puedeTransicionar('BORRADOR', 'enviar', 'AUDITOR', false)).toBe(false)
    })
    it('puede anular su propio BORRADOR o ENVIADO', () => {
      expect(puedeTransicionar('BORRADOR', 'anular', 'AUDITOR', true)).toBe(true)
      expect(puedeTransicionar('ENVIADO', 'anular', 'AUDITOR', true)).toBe(true)
    })
    it('NO puede anular un EN_PREPARACION (ya está en bodega)', () => {
      expect(puedeTransicionar('EN_PREPARACION', 'anular', 'AUDITOR', true)).toBe(false)
    })
    it('NO puede aceptar ni entregar (operaciones del bodeguero)', () => {
      expect(puedeTransicionar('ENVIADO', 'aceptar', 'AUDITOR', true)).toBe(false)
      expect(puedeTransicionar('LISTO_RETIRO', 'entregar', 'AUDITOR', true)).toBe(false)
    })
  })

  describe('OPERADOR', () => {
    it('puede aceptar, marcar listo, entregar y rechazar', () => {
      expect(puedeTransicionar('ENVIADO', 'aceptar', 'OPERADOR', false)).toBe(true)
      expect(puedeTransicionar('EN_PREPARACION', 'marcar_listo', 'OPERADOR', false)).toBe(true)
      expect(puedeTransicionar('LISTO_RETIRO', 'entregar', 'OPERADOR', false)).toBe(true)
      expect(puedeTransicionar('ENVIADO', 'rechazar', 'OPERADOR', false)).toBe(true)
      expect(puedeTransicionar('EN_PREPARACION', 'rechazar', 'OPERADOR', false)).toBe(true)
    })
    it('puede anular LISTO_RETIRO no retirado pero NO un BORRADOR ajeno', () => {
      expect(puedeTransicionar('LISTO_RETIRO', 'anular', 'OPERADOR', false)).toBe(true)
      expect(puedeTransicionar('BORRADOR', 'anular', 'OPERADOR', false)).toBe(false)
    })
    it('NO puede enviar (eso es del solicitante)', () => {
      expect(puedeTransicionar('BORRADOR', 'enviar', 'OPERADOR', false)).toBe(false)
    })
  })

  describe('Estados terminales — todos los roles bloqueados', () => {
    it('ningún rol puede ejecutar ninguna acción sobre estados terminales', () => {
      for (const estado of ESTADOS_TERMINALES) {
        for (const rol of TODOS_ROLES) {
          for (const accion of TODAS_ACCIONES) {
            expect(puedeTransicionar(estado, accion, rol, true)).toBe(false)
          }
        }
      }
    })
  })
})

describe('accionesDisponibles', () => {
  it('AUDITOR solicitante en BORRADOR ve enviar y anular', () => {
    const arr = accionesDisponibles('BORRADOR', 'AUDITOR', true)
    expect(arr.sort()).toEqual(['anular', 'enviar'].sort())
  })

  it('OPERADOR en ENVIADO ve aceptar y rechazar', () => {
    const arr = accionesDisponibles('ENVIADO', 'OPERADOR', false)
    expect(arr.sort()).toEqual(['aceptar', 'rechazar'].sort())
  })

  it('OPERADOR en EN_PREPARACION ve marcar_listo y rechazar', () => {
    const arr = accionesDisponibles('EN_PREPARACION', 'OPERADOR', false)
    expect(arr.sort()).toEqual(['marcar_listo', 'rechazar'].sort())
  })

  it('OPERADOR en LISTO_RETIRO ve entregar y anular', () => {
    const arr = accionesDisponibles('LISTO_RETIRO', 'OPERADOR', false)
    expect(arr.sort()).toEqual(['anular', 'entregar'].sort())
  })

  it('cualquier rol ve lista vacía en estado terminal', () => {
    for (const e of ESTADOS_TERMINALES) {
      expect(accionesDisponibles(e, 'ADMINISTRADOR', true)).toEqual([])
    }
  })

  it('ADMINISTRADOR siempre tiene al menos las mismas acciones que un operador o más', () => {
    for (const estado of TODOS_ESTADOS) {
      const admin = accionesDisponibles(estado, 'ADMINISTRADOR', false)
      const operador = accionesDisponibles(estado, 'OPERADOR', false)
      for (const a of operador) {
        expect(admin).toContain(a)
      }
    }
  })
})
