/**
 * API: GET /api/dashboard/metricas
 * Obtiene metricas en tiempo real para el dashboard
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Fecha actual y rangos
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString()
    const fecha30Dias = new Date()
    fecha30Dias.setDate(fecha30Dias.getDate() + 30)

    // Total de articulos activos
    const { count: totalArticulos } = await supabase
      .from('articulos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    // Obtener articulos con stock en UNA sola query (evita N+1)
    const { data: articulos } = await supabase
      .from('articulos')
      .select('id, stock_minimo')
      .eq('activo', true)

    // Obtener TODOS los lotes activos con stock en una sola query
    const { data: todosLotes } = await supabase
      .from('lotes')
      .select('articulo_id, cantidad_disponible')
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    // Calcular stock por artículo en memoria (mucho más rápido)
    const stockPorArticulo: Record<string, number> = {}
    if (todosLotes) {
      for (const lote of todosLotes) {
        const articuloId = lote.articulo_id
        stockPorArticulo[articuloId] = (stockPorArticulo[articuloId] || 0) + Number(lote.cantidad_disponible)
      }
    }

    let articulosConStock = 0
    let articulosStockBajo = 0

    if (articulos) {
      for (const articulo of articulos) {
        const stockTotal = stockPorArticulo[articulo.id] || 0

        if (stockTotal > 0) {
          articulosConStock++
        }

        if (articulo.stock_minimo && stockTotal <= articulo.stock_minimo) {
          articulosStockBajo++
        }
      }
    }

    // Movimientos del mes (entradas)
    const { count: entradasMes } = await supabase
      .from('movimientos')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'ENTRADA')
      .gte('created_at', inicioMes)
      .lte('created_at', finMes)

    // Movimientos del mes (salidas)
    const { count: salidasMes } = await supabase
      .from('movimientos')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'SALIDA')
      .gte('created_at', inicioMes)
      .lte('created_at', finMes)

    // Lotes proximos a vencer
    const { count: lotesProximosVencer } = await supabase
      .from('lotes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .gt('cantidad_disponible', 0)
      .gte('fecha_vencimiento', hoy.toISOString().split('T')[0])
      .lte('fecha_vencimiento', fecha30Dias.toISOString().split('T')[0])

    // Lotes ya vencidos
    const { count: lotesVencidos } = await supabase
      .from('lotes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
      .gt('cantidad_disponible', 0)
      .lt('fecha_vencimiento', hoy.toISOString().split('T')[0])

    // Ultimos 10 movimientos
    const { data: ultimosMovimientos } = await supabase
      .from('movimientos')
      .select(`
        id,
        tipo,
        cantidad,
        created_at,
        articulos (sku, nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    const movimientosMes = (entradasMes || 0) + (salidasMes || 0)

    // Verificar si falta informe mensual (del 1 al 3 de cada mes)
    const diaActual = hoy.getDate()
    const informeMensualPendiente = diaActual >= 1 && diaActual <= 3

    return NextResponse.json({
      success: true,
      metricas: {
        totalArticulos: totalArticulos || 0,
        articulosConStock,
        articulosSinStock: (totalArticulos || 0) - articulosConStock,
        movimientosMes: {
          entradas: entradasMes || 0,
          salidas: salidasMes || 0,
          total: movimientosMes,
        },
        alertas: {
          lotesProximosVencer: lotesProximosVencer || 0,
          lotesVencidos: lotesVencidos || 0,
          articulosStockBajo,
        },
        cortesAnio: 0, // Simplificado - cortes eliminados en nueva version
        ultimosMovimientos: (ultimosMovimientos || []).map((m) => ({
          id: m.id,
          tipo: m.tipo,
          cantidad: m.cantidad,
          fecha: m.created_at,
          articulo: m.articulos ? `${m.articulos.sku} - ${m.articulos.nombre}` : 'N/A',
          usuario: 'Sistema',
        })),
        informeMensualPendiente,
      },
      actualizadoEn: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error al obtener metricas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
