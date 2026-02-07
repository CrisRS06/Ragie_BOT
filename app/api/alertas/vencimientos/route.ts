/**
 * API: GET /api/alertas/vencimientos
 * Obtiene alertas de vencimiento (FEFO informativo)
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
    const limite = parseInt(searchParams.get('limite') || '50')

    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion)

    // Construir query
    let query = supabase
      .from('lotes')
      .select(`
        *,
        articulo:articulos(
          id,
          sku,
          nombre,
          descripcion_sigaf,
          unidad_medida
        )
      `)
      .eq('activo', true)
      .eq('agotado', false)
      .gt('cantidad_disponible', 0)
      .order('fecha_vencimiento', { ascending: true })
      .limit(limite)

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

    // Procesar alertas (solo lotes con fecha de vencimiento)
    const alertas = (lotes || []).filter((lote) => lote.fecha_vencimiento).map((lote) => {
      const diasHastaVencimiento = Math.ceil(
        (new Date(lote.fecha_vencimiento!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      let severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
      let mensaje: string

      if (diasHastaVencimiento < 0) {
        severidad = 'CRITICA'
        mensaje = `VENCIDO hace ${Math.abs(diasHastaVencimiento)} dias`
      } else if (diasHastaVencimiento === 0) {
        severidad = 'CRITICA'
        mensaje = 'Vence HOY'
      } else if (diasHastaVencimiento <= 7) {
        severidad = 'ALTA'
        mensaje = `Vence en ${diasHastaVencimiento} dias`
      } else if (diasHastaVencimiento <= 15) {
        severidad = 'MEDIA'
        mensaje = `Vence en ${diasHastaVencimiento} dias`
      } else {
        severidad = 'BAJA'
        mensaje = `Vence en ${diasHastaVencimiento} dias`
      }

      return {
        id: lote.id,
        tipo: 'VENCIMIENTO',
        severidad,
        mensaje,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        lote: {
          id: lote.id,
          numeroLote: lote.numero_lote || `LOTE-${lote.id.substring(0, 8)}`,
          cantidadDisponible: Number(lote.cantidad_disponible),
          fechaVencimiento: lote.fecha_vencimiento,
          ubicacion: lote.ubicacion,
        },
        articulo: lote.articulo,
      }
    })

    // Agrupar por severidad
    const resumen = {
      total: alertas.length,
      criticas: alertas.filter((a) => a.severidad === 'CRITICA').length,
      altas: alertas.filter((a) => a.severidad === 'ALTA').length,
      medias: alertas.filter((a) => a.severidad === 'MEDIA').length,
      bajas: alertas.filter((a) => a.severidad === 'BAJA').length,
      vencidos: alertas.filter((a) => a.vencido).length,
    }

    return NextResponse.json({
      success: true,
      alertas,
      resumen,
      parametros: {
        diasAnticipacion,
        incluirVencidos,
      },
    })
  } catch (error) {
    console.error('Error al obtener alertas de vencimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
