import { describe, it, expect } from 'vitest'
import { articulosInactivos } from '@/lib/orden-pedido/articulos-activos'

describe('articulosInactivos', () => {
  it('devuelve vacio si todos estan activos', () => {
    expect(articulosInactivos(['a', 'b'], [{ id: 'a', activo: true }, { id: 'b', activo: true }])).toEqual([])
  })
  it('detecta un articulo desactivado', () => {
    expect(articulosInactivos(['a', 'b'], [{ id: 'a', activo: true }, { id: 'b', activo: false }])).toEqual(['b'])
  })
  it('detecta un articulo inexistente (no vino en las filas)', () => {
    expect(articulosInactivos(['a', 'x'], [{ id: 'a', activo: true }])).toEqual(['x'])
  })
  it('deduplica ids repetidos', () => {
    expect(articulosInactivos(['b', 'b'], [{ id: 'b', activo: false }])).toEqual(['b'])
  })
})
