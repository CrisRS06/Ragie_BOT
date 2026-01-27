/**
 * API: GET /api/inventario
 * Lista todos los articulos con su stock actual y informacion de lotes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    const limite = parseInt(searchParams.get('limite') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Obtener articulos activos
    let query = supabase
      .from('articulos')
      .select('*', { count: 'exact' })
      .eq('activo', true)
      .order('nombre')
      .range(offset, offset + limite - 1)

    if (busqueda) {
      query = query.or(`sku.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%,descripcion_sigaf.ilike.%${busqueda}%`)
    }

    const { data: articulos, error, count } = await query

    if (error) {
      console.error('Error al obtener articulos:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Fecha limite para alertas (30 dias)
    const fechaLimiteAlerta = new Date()
    fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + 30)

    // Procesar articulos con info de lotes
    const inventario = await Promise.all(
      (articulos || []).map(async (articulo) => {
        // Obtener lotes activos con stock
        const { data: lotes } = await supabase
          .from('lotes')
          .select('id, cantidad_disponible, fecha_vencimiento')
          .eq('articulo_id', articulo.id)
          .eq('activo', true)
          .gt('cantidad_disponible', 0)

        const lotesArray = lotes || []
        const stockTotal = lotesArray.reduce((sum, lote) => sum + Number(lote.cantidad_disponible), 0)

        // Contar lotes proximos a vencer
        const lotesProximosAVencer = lotesArray.filter(
          (lote) => new Date(lote.fecha_vencimiento) <= fechaLimiteAlerta
        ).length

        // Contar lotes vencidos
        const lotesVencidos = lotesArray.filter(
          (lote) => new Date(lote.fecha_vencimiento) < new Date()
        ).length

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
        }
      })
    )

    // Filtrar solo con stock si se solicita
    const inventarioFiltrado = soloConStock
      ? inventario.filter((a) => a.stockTotal > 0)
      : inventario

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
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
