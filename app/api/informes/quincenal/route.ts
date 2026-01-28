/**
 * API: /api/informes/quincenal
 * GET - Generar informe quincenal de movimientos
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/informes/quincenal - Obtener informe quincenal
 */
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

    const { searchParams } = new URL(request.url)

    // Obtener fechas del rango
    const fechaInicioParam = searchParams.get('fechaInicio')
    const fechaFinParam = searchParams.get('fechaFin')

    // Por defecto, ultimos 15 dias
    const fechaFin = fechaFinParam ? new Date(fechaFinParam) : new Date()
    const fechaInicio = fechaInicioParam
      ? new Date(fechaInicioParam)
      : new Date(fechaFin.getTime() - 15 * 24 * 60 * 60 * 1000)

    // Ajustar fechas para incluir todo el dia
    fechaInicio.setHours(0, 0, 0, 0)
    fechaFin.setHours(23, 59, 59, 999)

    // Obtener movimientos del periodo
    const { data: movimientos, error } = await supabase
      .from('movimientos')
      .select('*')
      .gte('created_at', fechaInicio.toISOString())
      .lte('created_at', fechaFin.toISOString())
      .eq('anulado', false)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      throw error
    }

    // Obtener articulos relacionados
    const articuloIds = [...new Set((movimientos || []).map(m => m.articulo_id))]
    const { data: articulos } = articuloIds.length > 0
      ? await supabase
          .from('articulos')
          .select('id, sku, nombre, descripcion_sigaf, unidad_medida')
          .in('id', articuloIds)
      : { data: [] }
    const articulosMap = new Map((articulos || []).map(a => [a.id, a]))

    // Obtener lotes relacionados
    const loteIds = [...new Set((movimientos || []).map(m => m.lote_id).filter((id): id is string => id !== null))]
    const { data: lotes } = loteIds.length > 0
      ? await supabase
          .from('lotes')
          .select('id, numero_lote, fecha_vencimiento')
          .in('id', loteIds)
      : { data: [] }
    const lotesMap = new Map((lotes || []).map(l => [l.id, l]))

    // Obtener usuarios relacionados
    const usuarioIds = [...new Set((movimientos || []).map(m => m.usuario_id).filter((id): id is string => id !== null))]
    const { data: perfiles } = usuarioIds.length > 0
      ? await supabase
          .from('perfiles')
          .select('id, nombre')
          .in('id', usuarioIds)
      : { data: [] }
    const perfilesMap = new Map((perfiles || []).map(p => [p.id, p]))

    // Enriquecer movimientos con datos relacionados
    const movimientosEnriquecidos = (movimientos || []).map(m => ({
      ...m,
      articulo: articulosMap.get(m.articulo_id),
      lote: m.lote_id ? lotesMap.get(m.lote_id) : null,
      usuario: m.usuario_id ? perfilesMap.get(m.usuario_id) : null,
    }))

    // Agrupar por tipo
    const entradas = movimientosEnriquecidos.filter((m) => m.tipo === 'ENTRADA')
    const salidas = movimientosEnriquecidos.filter((m) => m.tipo === 'SALIDA')
    const ajustes = movimientosEnriquecidos.filter((m) => m.tipo === 'AJUSTE_INVENTARIO')

    // Calcular totales
    const totalEntradas = entradas.reduce((sum, m) => sum + Number(m.cantidad), 0)
    const totalSalidas = salidas.reduce((sum, m) => sum + Number(m.cantidad), 0)
    const totalAjustes = ajustes.reduce((sum, m) => sum + Number(m.cantidad), 0)

    // Agrupar movimientos por articulo
    const movimientosPorArticulo: Record<string, {
      articulo: { id: string; sku: string; nombre: string; descripcion_sigaf: string | null; unidad_medida: string } | undefined
      entradas: number
      salidas: number
      ajustes: number
      movimientos: typeof movimientosEnriquecidos
    }> = {}

    for (const m of movimientosEnriquecidos) {
      const articuloId = m.articulo_id
      if (!movimientosPorArticulo[articuloId]) {
        movimientosPorArticulo[articuloId] = {
          articulo: m.articulo,
          entradas: 0,
          salidas: 0,
          ajustes: 0,
          movimientos: [],
        }
      }
      if (m.tipo === 'ENTRADA') movimientosPorArticulo[articuloId].entradas += Number(m.cantidad)
      else if (m.tipo === 'SALIDA') movimientosPorArticulo[articuloId].salidas += Number(m.cantidad)
      else if (m.tipo === 'AJUSTE_INVENTARIO') movimientosPorArticulo[articuloId].ajustes += Number(m.cantidad)
      movimientosPorArticulo[articuloId].movimientos.push(m)
    }

    // Formatear datos para el informe
    const articulosResumen = Object.values(movimientosPorArticulo).map((data) => ({
      sku: data.articulo?.sku,
      nombre: data.articulo?.nombre,
      descripcionSIGAF: data.articulo?.descripcion_sigaf,
      unidadMedida: data.articulo?.unidad_medida,
      entradas: data.entradas,
      salidas: data.salidas,
      ajustes: data.ajustes,
      neto: data.entradas - data.salidas + data.ajustes,
      cantidadMovimientos: data.movimientos.length,
    }))

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: fechaInicio.toISOString(),
          fin: fechaFin.toISOString(),
          dias: Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)),
        },
        resumen: {
          totalMovimientos: movimientosEnriquecidos.length,
          totalEntradas,
          totalSalidas,
          totalAjustes,
          articulosAfectados: Object.keys(movimientosPorArticulo).length,
        },
        articulosResumen,
        movimientosDetalle: movimientosEnriquecidos.slice(0, 100).map((m) => ({
          id: m.id,
          tipo: m.tipo,
          fecha: m.created_at,
          articulo: m.articulo?.nombre,
          sku: m.articulo?.sku,
          cantidad: Number(m.cantidad),
          lote: m.lote?.numero_lote || '-',
          receptor: m.receptor_nombre || '-',
          motivo: m.motivo || '-',
          usuario: m.usuario?.nombre || '-',
        })),
      },
    })
  } catch (error) {
    console.error('Error al generar informe quincenal:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar informe quincenal' },
      { status: 500 }
    )
  }
}
