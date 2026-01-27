/**
 * API: GET /api/informes/vencimientos
 * Obtiene reporte de lotes proximos a vencer y vencidos
 *
 * NOTA: Esta funcionalidad depende del servicio informes.service que usa Prisma.
 * Stub implementado para version Supabase.
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
    const diasAnticipacion = parseInt(searchParams.get('dias') || '30')
    const incluirVencidos = searchParams.get('incluirVencidos') !== 'false'

    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion)

    // Obtener lotes con alertas directamente
    let query = supabase
      .from('lotes')
      .select(`
        *,
        articulo:articulos(id, sku, nombre, descripcion_sigaf, unidad_medida)
      `)
      .eq('activo', true)
      .eq('agotado', false)
      .gt('cantidad_disponible', 0)
      .order('fecha_vencimiento', { ascending: true })
      .limit(100)

    if (incluirVencidos) {
      query = query.lte('fecha_vencimiento', fechaLimite.toISOString())
    } else {
      query = query
        .gte('fecha_vencimiento', new Date().toISOString())
        .lte('fecha_vencimiento', fechaLimite.toISOString())
    }

    const { data: lotes, error } = await query

    if (error) {
      throw error
    }

    // Procesar lotes
    const lotesConInfo = (lotes || []).map((lote) => {
      const diasHastaVencimiento = Math.ceil(
        (new Date(lote.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      let severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' = 'BAJA'
      if (diasHastaVencimiento < 0) {
        severidad = 'CRITICA'
      } else if (diasHastaVencimiento <= 7) {
        severidad = 'ALTA'
      } else if (diasHastaVencimiento <= 15) {
        severidad = 'MEDIA'
      }

      return {
        id: lote.id,
        numeroLote: lote.numero_lote || `LOTE-${lote.id.substring(0, 8)}`,
        cantidadDisponible: Number(lote.cantidad_disponible),
        fechaVencimiento: lote.fecha_vencimiento,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        severidad,
        articulo: lote.articulo,
        ubicacion: lote.ubicacion,
      }
    })

    // Agrupar por severidad
    const porSeveridad = lotesConInfo.reduce((acc, lote) => {
      const sev = lote.severidad
      if (!acc[sev]) acc[sev] = []
      acc[sev].push(lote)
      return acc
    }, {} as Record<string, typeof lotesConInfo>)

    return NextResponse.json({
      success: true,
      informe: {
        tipo: 'VENCIMIENTOS',
        fechaGeneracion: new Date().toISOString(),
        parametros: { diasAnticipacion, incluirVencidos },
      },
      lotes: lotesConInfo,
      porSeveridad,
      resumen: {
        total: lotesConInfo.length,
        criticos: porSeveridad['CRITICA']?.length || 0,
        altos: porSeveridad['ALTA']?.length || 0,
        medios: porSeveridad['MEDIA']?.length || 0,
        bajos: porSeveridad['BAJA']?.length || 0,
        vencidos: lotesConInfo.filter((l) => l.vencido).length,
      },
      totalAlertas: lotesConInfo.length,
    })
  } catch (error) {
    console.error('Error al generar reporte de vencimientos:', error)
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    )
  }
}
