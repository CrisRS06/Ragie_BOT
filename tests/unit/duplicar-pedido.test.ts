import { describe, it, expect } from 'vitest'
import {
  construirValoresDuplicado,
  hayLineasInactivas,
  type PedidoOrigen,
} from '@/lib/orden-pedido/duplicar'
import type { Articulo } from '@/components/ui/articulo-selector'

function artStub(id: string): Articulo {
  return {
    id, sku: `SKU-${id}`, nombre: `Articulo ${id}`, descripcion: null, descripcionSIGAF: null,
    codigoSIGAF: null, unidadMedida: 'UND', ivaPercent: 0.13, stockMinimo: null, marca: null,
    stockTotal: 100, lotesActivos: 1,
  }
}

const pedidoBase: PedidoOrigen = {
  bodega: { id: 'bod-1' },
  observaciones: 'obs original',
  lineas: [
    { articuloId: 'a1', cantidadSolicitada: 50, articulo: { id: 'a1', sku: 'SKU-a1', nombre: 'Articulo a1', activo: true } },
    { articuloId: 'a2', cantidadSolicitada: 30, articulo: { id: 'a2', sku: 'SKU-a2', nombre: 'Articulo a2', activo: true } },
  ],
}

describe('construirValoresDuplicado', () => {
  it('copia bodega, observaciones y lineas; deja la unidad receptora VACIA', () => {
    const catalogo = new Map<string, Articulo>([['a1', artStub('a1')], ['a2', artStub('a2')]])
    const v = construirValoresDuplicado(pedidoBase, catalogo)
    expect(v.bodegaId).toBe('bod-1')
    expect(v.observaciones).toBe('obs original')
    expect(v.unidadReceptoraId).toBe('')
    expect(v.lineas).toHaveLength(2)
    expect(v.lineas[0]).toMatchObject({ articuloId: 'a1', cantidad: '50', inactivo: false })
    expect(v.lineas[0].articulo?.id).toBe('a1')
  })

  it('marca inactivo=true y articulo=null cuando el articulo del origen esta desactivado', () => {
    const pedido: PedidoOrigen = {
      ...pedidoBase,
      lineas: [{ articuloId: 'a1', cantidadSolicitada: 50, articulo: { id: 'a1', sku: 'SKU-a1', nombre: 'Pan dulce', activo: false } }],
    }
    const v = construirValoresDuplicado(pedido, new Map())
    expect(v.lineas[0].inactivo).toBe(true)
    expect(v.lineas[0].articulo).toBeNull()
    expect(v.lineas[0].etiqueta).toBe('SKU-a1 - Pan dulce')
  })

  it('marca inactivo=true cuando el articulo ya no existe (articulo null en el origen)', () => {
    const pedido: PedidoOrigen = {
      ...pedidoBase,
      lineas: [{ articuloId: 'a9', cantidadSolicitada: 10, articulo: null }],
    }
    const v = construirValoresDuplicado(pedido, new Map())
    expect(v.lineas[0].inactivo).toBe(true)
    expect(v.lineas[0].etiqueta).toBe('Articulo desconocido')
  })

  it('bodega null produce bodegaId vacio', () => {
    const v = construirValoresDuplicado({ ...pedidoBase, bodega: null }, new Map())
    expect(v.bodegaId).toBe('')
  })
})

describe('hayLineasInactivas', () => {
  it('true si alguna linea esta inactiva', () => {
    expect(hayLineasInactivas([{ inactivo: false }, { inactivo: true }])).toBe(true)
  })
  it('false si ninguna lo esta', () => {
    expect(hayLineasInactivas([{ inactivo: false }, {}])).toBe(false)
  })
})
