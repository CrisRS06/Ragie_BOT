/**
 * API: GET /api/inventario
 * Lista todos los articulos con su stock actual y informacion de lotes
 *
 * Parametros:
 * - busqueda: string - Filtrar por SKU, nombre o descripcion SIGAF
 * - soloConStock: boolean - Solo mostrar articulos con stock > 0
 * - bodegaId: string - Filtrar por bodega (vacio = todas)
 * - ordenarPor: string - Campo para ordenar: nombre, sku, stockTotal, estado
 * - orden: string - Direccion: asc, desc
 * - limite: number - Limite de resultados (default 50)
 * - offset: number - Offset para paginacion (default 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizePostgrestValue } from '@/lib/utils/sanitize'

export const dynamic = 'force-dynamic'

interface BodegaStock {
  bodegaId: string;
  bodegaCodigo: string;
  bodegaNombre: string;
  stockEnBodega: number;
}

interface ArticuloInventario {
  id: string;
  sku: string;
  nombre: string;
  descripcionSIGAF: string | null;
  unidadMedida: string;
  stockMinimo: number | null;
  stockTotal: number;
  totalLotes: number;
  lotesProximosAVencer: number;
  lotesVencidos: number;
  alertaStockBajo: boolean;
  alertaVencimiento: boolean;
  bodegas?: BodegaStock[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const busqueda = searchParams.get('busqueda')
    const soloConStock = searchParams.get('soloConStock') === 'true'
    const bodegaId = searchParams.get('bodegaId') || ''
    const ordenarPor = searchParams.get('ordenarPor') || 'nombre'
    const orden = searchParams.get('orden') || 'asc'
    const limite = parseInt(searchParams.get('limite') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Obtener bodegas para mapear IDs a nombres/codigos
    const { data: bodegasData } = await supabase
      .from('bodegas')
      .select('id, codigo, nombre')
      .eq('activo', true)

    const bodegasMap = new Map(
      (bodegasData || []).map(b => [b.id, { codigo: b.codigo, nombre: b.nombre }])
    )

    // Obtener articulos activos (sin ordenar aun, lo haremos despues)
    let query = supabase
      .from('articulos')
      .select('*', { count: 'exact' })
      .eq('activo', true)
      .range(offset, offset + limite - 1)

    if (busqueda) {
      const safeBusqueda = sanitizePostgrestValue(busqueda)
      query = query.or(`sku.ilike.%${safeBusqueda}%,nombre.ilike.%${safeBusqueda}%,descripcion_sigaf.ilike.%${safeBusqueda}%`)
    }

    const { data: articulos, error, count } = await query

    if (error) {
      console.error('Error al obtener articulos:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener inventario' },
        { status: 500 }
      )
    }

    // Fecha limite para alertas (30 dias)
    const fechaLimiteAlerta = new Date()
    fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + 30)

    // Batch-fetch all lotes for the returned articles (fixes N+1)
    const articuloIds = (articulos || []).map(a => a.id)
    let allLotesQuery = supabase
      .from('lotes')
      .select('id, articulo_id, cantidad_disponible, fecha_vencimiento, bodega_id')
      .in('articulo_id', articuloIds)
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    if (bodegaId) {
      allLotesQuery = allLotesQuery.eq('bodega_id', bodegaId)
    }

    const { data: allLotes } = await allLotesQuery

    // Group lotes by articulo_id
    const lotesByArticulo = new Map<string, typeof allLotes>()
    for (const lote of allLotes || []) {
      const list = lotesByArticulo.get(lote.articulo_id) || []
      list.push(lote)
      lotesByArticulo.set(lote.articulo_id, list)
    }

    // Process articles synchronously using grouped lotes
    const inventario: ArticuloInventario[] = (articulos || []).map((articulo) => {
      const lotesArray = lotesByArticulo.get(articulo.id) || []
      const stockTotal = lotesArray.reduce((sum, lote) => sum + Number(lote.cantidad_disponible), 0)

      const lotesProximosAVencer = lotesArray.filter(
        (lote) => lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) <= fechaLimiteAlerta && new Date(lote.fecha_vencimiento) >= new Date()
      ).length

      const lotesVencidos = lotesArray.filter(
        (lote) => lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < new Date()
      ).length

      let bodegas: BodegaStock[] | undefined = undefined
      if (!bodegaId) {
        const stockPorBodega = new Map<string, number>()
        lotesArray.forEach(lote => {
          if (lote.bodega_id) {
            const actual = stockPorBodega.get(lote.bodega_id) || 0
            stockPorBodega.set(lote.bodega_id, actual + Number(lote.cantidad_disponible))
          }
        })

        bodegas = Array.from(stockPorBodega.entries())
          .map(([id, stock]) => {
            const bodegaInfo = bodegasMap.get(id)
            return {
              bodegaId: id,
              bodegaCodigo: bodegaInfo?.codigo || 'N/A',
              bodegaNombre: bodegaInfo?.nombre || 'Desconocida',
              stockEnBodega: stock,
            }
          })
          .filter(b => b.stockEnBodega > 0)
          .sort((a, b) => a.bodegaCodigo.localeCompare(b.bodegaCodigo))
      }

      return {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        descripcionSIGAF: articulo.descripcion_sigaf,
        unidadMedida: articulo.unidad_medida,
        stockMinimo: articulo.stock_minimo,
        stockTotal,
        totalLotes: lotesArray.length,
        lotesProximosAVencer,
        lotesVencidos,
        alertaStockBajo: articulo.stock_minimo !== null && stockTotal <= articulo.stock_minimo,
        alertaVencimiento: lotesProximosAVencer > 0 || lotesVencidos > 0,
        bodegas,
      }
    })

    // Filtrar solo con stock si se solicita
    let inventarioFiltrado = soloConStock
      ? inventario.filter((a) => a.stockTotal > 0)
      : inventario

    // Ordenar resultados
    inventarioFiltrado = [...inventarioFiltrado].sort((a, b) => {
      let comparison = 0

      switch (ordenarPor) {
        case 'sku':
          comparison = a.sku.localeCompare(b.sku)
          break
        case 'stockTotal':
          comparison = a.stockTotal - b.stockTotal
          break
        case 'estado':
          // Ordenar por prioridad: vencidos > stock bajo > proximos a vencer > ok > sin stock
          const getPrioridad = (item: ArticuloInventario) => {
            if (item.lotesVencidos > 0) return 0
            if (item.alertaStockBajo && item.stockTotal > 0) return 1
            if (item.lotesProximosAVencer > 0) return 2
            if (item.stockTotal > 0) return 3
            return 4
          }
          comparison = getPrioridad(a) - getPrioridad(b)
          break
        case 'nombre':
        default:
          comparison = a.nombre.localeCompare(b.nombre)
          break
      }

      return orden === 'desc' ? -comparison : comparison
    })

    // Estadisticas generales
    const estadisticas = {
      totalArticulos: inventarioFiltrado.length,
      articulosConStock: inventarioFiltrado.filter((a) => a.stockTotal > 0).length,
      articulosSinStock: inventarioFiltrado.filter((a) => a.stockTotal === 0).length,
      articulosStockBajo: inventarioFiltrado.filter((a) => a.alertaStockBajo).length,
      articulosConAlertaVencimiento: inventarioFiltrado.filter((a) => a.alertaVencimiento).length,
    }

    return NextResponse.json({
      success: true,
      inventario: inventarioFiltrado,
      estadisticas,
      bodegaSeleccionada: bodegaId ? bodegasMap.get(bodegaId) : null,
      paginacion: {
        total: count || 0,
        limite,
        offset,
        paginas: Math.ceil((count || 0) / limite),
      },
    })
  } catch (error) {
    console.error('Error al obtener inventario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener inventario' },
      { status: 500 }
    )
  }
}
