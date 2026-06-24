/**
 * Logica pura para duplicar un pedido: transforma un pedido origen en los
 * valores iniciales del PedidoForm. Copia lineas (articulo + cantidad) y
 * observaciones; deja la unidad receptora VACIA (hay que elegir la sucursal
 * destino). Marca como `inactivo` toda linea cuyo articulo este desactivado o
 * ya no exista, para que el form la resalte y bloquee el guardado.
 */

import type { Articulo } from '@/components/ui/articulo-selector'

export interface LineaInicial {
  articuloId: string
  articulo: Articulo | null
  cantidad: string
  inactivo?: boolean
  etiqueta?: string
}

export interface ValoresDuplicado {
  bodegaId: string
  unidadReceptoraId: string
  observaciones: string
  lineas: LineaInicial[]
}

export interface PedidoOrigen {
  bodega: { id: string } | null
  observaciones: string | null
  lineas: {
    articuloId: string
    cantidadSolicitada: number
    articulo: { id: string; sku: string; nombre: string; activo: boolean } | null
  }[]
}

export function construirValoresDuplicado(
  pedido: PedidoOrigen,
  articulosPorId: Map<string, Articulo>
): ValoresDuplicado {
  return {
    bodegaId: pedido.bodega?.id ?? '',
    unidadReceptoraId: '',
    observaciones: pedido.observaciones ?? '',
    lineas: pedido.lineas.map((l) => {
      const inactivo = l.articulo ? l.articulo.activo !== true : true
      return {
        articuloId: l.articuloId,
        articulo: inactivo ? null : articulosPorId.get(l.articuloId) ?? null,
        cantidad: String(l.cantidadSolicitada),
        inactivo,
        etiqueta: l.articulo ? `${l.articulo.sku} - ${l.articulo.nombre}` : 'Articulo desconocido',
      }
    }),
  }
}

export function hayLineasInactivas(lineas: { inactivo?: boolean }[]): boolean {
  return lineas.some((l) => l.inactivo === true)
}
