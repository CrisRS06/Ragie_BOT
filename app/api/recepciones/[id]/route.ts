/**
 * API: /api/recepciones/[id]
 * GET - Obtener detalle de recepcion
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/recepciones/[id] - Obtener detalle de recepcion (movimiento + lote)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar el movimiento de entrada por id o lote_id
    const { data: movimiento, error } = await supabase
      .from('movimientos')
      .select(`
        *,
        articulo:articulos(
          id,
          sku,
          nombre,
          descripcion_sigaf,
          unidad_medida
        ),
        lote:lotes(
          id,
          numero_lote,
          cantidad_inicial,
          cantidad_disponible,
          fecha_vencimiento,
          fecha_ingreso,
          proveedor,
          costo_unitario,
          ubicacion,
          agotado,
          activo
        ),
        usuario:perfiles(
          id,
          nombre,
          email
        )
      `)
      .eq('tipo', 'ENTRADA')
      .or(`id.eq.${id},lote_id.eq.${id}`)
      .single()

    if (error || !movimiento) {
      return NextResponse.json(
        { success: false, error: 'Recepcion no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: movimiento.id,
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        timestamp: movimiento.created_at,
        anulado: movimiento.anulado,
        motivoAnulacion: movimiento.motivo_anulacion,
        articulo: movimiento.articulo,
        lote: movimiento.lote,
        usuario: movimiento.usuario,
      },
    })
  } catch (error) {
    console.error('Error al obtener recepcion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener recepcion' },
      { status: 500 }
    )
  }
}
