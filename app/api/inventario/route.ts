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

// Helper: fetch lotes in batches to avoid PostgREST URL length limits
async function fetchLotesInBatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articuloIds: string[],
  bodegaId: string
) {
  if (articuloIds.length === 0) return []

  const BATCH_SIZE = 100
  const allLotes: Array<{
    id: string;
    articulo_id: string;
    cantidad_disponible: number;
    fecha_vencimiento: string | null;
    bodega_id: string | null;
  }> = []

  for (let i = 0; i < articuloIds.length; i += BATCH_SIZE) {
    const batch = articuloIds.slice(i, i + BATCH_SIZE)
    let q = supabase
      .from('lotes')
      .select('id, articulo_id, cantidad_disponible, fecha_vencimiento, bodega_id')
      .in('articulo_id', batch)
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    if (bodegaId) {
      q = q.eq('bodega_id', bodegaId)
    }

    const { data } = await q
    if (data) allLotes.push(...data)
  }

  return allLotes
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
    const limite = Math.min(Math.max(parseInt(searchParams.get('limite') || '50') || 50, 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

    // Obtener bodegas para mapear IDs a nombres/codigos
    const { data: bodegasData } = await supabase
      .from('bodegas')
      .select('id, codigo, nombre')
      .eq('activo', true)

    const bodegasMap = new Map(
      (bodegasData || []).map(b => [b.id, { codigo: b.codigo, nombre: b.nombre }])
    )

    let articulos: Array<Record<string, unknown>> = []
    let totalCount = 0

    if (soloConStock) {
      // Strategy: query lotes first to find which articles have stock,
      // then fetch only those articles. This avoids fetching all 1000+ articles.
      let lotesQuery = supabase
        .from('lotes')
        .select('articulo_id')
        .eq('activo', true)
        .gt('cantidad_disponible', 0)

      if (bodegaId) {
        lotesQuery = lotesQuery.eq('bodega_id', bodegaId)
      }

      const { data: lotesWithStock } = await lotesQuery

      // Get unique article IDs that have stock
      const articleIdsWithStock = [...new Set((lotesWithStock || []).map(l => l.articulo_id))]

      if (articleIdsWithStock.length === 0) {
        // No articles with stock — return empty
        return NextResponse.json({
          success: true,
          inventario: [],
          estadisticas: {
            totalArticulos: 0,
            articulosConStock: 0,
            articulosSinStock: 0,
            articulosStockBajo: 0,
            articulosConAlertaVencimiento: 0,
          },
          bodegaSeleccionada: bodegaId ? bodegasMap.get(bodegaId) : null,
          paginacion: { total: 0, limite, offset, paginas: 0 },
        })
      }

      // Fetch those articles in batches (to avoid URL length limits)
      const BATCH_SIZE = 100
      const allArticulos: Array<Record<string, unknown>> = []
      for (let i = 0; i < articleIdsWithStock.length; i += BATCH_SIZE) {
        const batch = articleIdsWithStock.slice(i, i + BATCH_SIZE)
        let q = supabase
          .from('articulos')
          .select('*')
          .eq('activo', true)
          .in('id', batch)

        if (busqueda) {
          const safeBusqueda = sanitizePostgrestValue(busqueda)
          q = q.or(`sku.ilike.%${safeBusqueda}%,nombre.ilike.%${safeBusqueda}%,descripcion_sigaf.ilike.%${safeBusqueda}%`)
        }

        const { data } = await q
        if (data) allArticulos.push(...data)
      }

      articulos = allArticulos
      totalCount = allArticulos.length
    } else {
      // Normal path: paginate articles at DB level
      let query = supabase
        .from('articulos')
        .select('*', { count: 'exact' })
        .eq('activo', true)
        .range(offset, offset + limite - 1)

      if (busqueda) {
        const safeBusqueda = sanitizePostgrestValue(busqueda)
        query = query.or(`sku.ilike.%${safeBusqueda}%,nombre.ilike.%${safeBusqueda}%,descripcion_sigaf.ilike.%${safeBusqueda}%`)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error al obtener articulos:', error)
        return NextResponse.json(
          { success: false, error: 'Error al obtener inventario' },
          { status: 500 }
        )
      }

      articulos = data || []
      totalCount = count || 0
    }

    // Fecha limite para alertas (30 dias)
    const fechaLimiteAlerta = new Date()
    fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + 30)

    // Batch-fetch all lotes for the returned articles
    const articuloIds = articulos.map(a => a.id as string)
    const allLotes = await fetchLotesInBatches(supabase, articuloIds, bodegaId)

    // Group lotes by articulo_id
    const lotesByArticulo = new Map<string, typeof allLotes>()
    for (const lote of allLotes) {
      const list = lotesByArticulo.get(lote.articulo_id) || []
      list.push(lote)
      lotesByArticulo.set(lote.articulo_id, list)
    }

    // Process articles using grouped lotes
    const inventario: ArticuloInventario[] = articulos.map((articulo) => {
      const lotesArray = lotesByArticulo.get(articulo.id as string) || []
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
        id: articulo.id as string,
        sku: articulo.sku as string,
        nombre: articulo.nombre as string,
        descripcionSIGAF: (articulo.descripcion_sigaf as string | null),
        unidadMedida: articulo.unidad_medida as string,
        stockMinimo: articulo.stock_minimo as number | null,
        stockTotal,
        totalLotes: lotesArray.length,
        lotesProximosAVencer,
        lotesVencidos,
        alertaStockBajo: articulo.stock_minimo !== null && stockTotal <= (articulo.stock_minimo as number),
        alertaVencimiento: lotesProximosAVencer > 0 || lotesVencidos > 0,
        bodegas,
      }
    })

    // Filter out articles without stock (for soloConStock, they should all have stock
    // but the lotes query might have returned slightly stale data)
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

    // Apply in-memory pagination for soloConStock path
    const totalAfterFilter = inventarioFiltrado.length
    if (soloConStock) {
      inventarioFiltrado = inventarioFiltrado.slice(offset, offset + limite)
    }

    // Estadisticas generales
    const effectiveTotal = soloConStock ? totalAfterFilter : totalCount
    const estadisticas = {
      totalArticulos: effectiveTotal,
      articulosConStock: soloConStock ? totalAfterFilter : inventarioFiltrado.filter((a) => a.stockTotal > 0).length,
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
        total: effectiveTotal,
        limite,
        offset,
        paginas: Math.ceil(effectiveTotal / limite),
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
