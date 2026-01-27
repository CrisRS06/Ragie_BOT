/**
 * API: GET /api/despachos/[id]/documento
 * Genera el documento PDF de un despacho
 *
 * NOTA: Esta funcionalidad depende del servicio pdf.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: despachoId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener el movimiento principal
    const { data: movimiento, error } = await supabase
      .from('movimientos')
      .select('*')
      .eq('id', despachoId)
      .eq('tipo', 'SALIDA')
      .single()

    if (error || !movimiento) {
      return NextResponse.json(
        { success: false, error: 'Despacho no encontrado' },
        { status: 404 }
      )
    }

    // Obtener articulo
    const { data: articulo } = await supabase
      .from('articulos')
      .select('id, sku, nombre, descripcion_sigaf, unidad_medida')
      .eq('id', movimiento.articulo_id)
      .single()

    // Obtener lote si existe
    let lote = null
    if (movimiento.lote_id) {
      const { data: loteData } = await supabase
        .from('lotes')
        .select('id, numero_lote, fecha_vencimiento')
        .eq('id', movimiento.lote_id)
        .single()
      lote = loteData
    }

    // Obtener unidad receptora si existe
    let unidadReceptora = null
    if (movimiento.unidad_receptora_id) {
      const { data: unidadData } = await supabase
        .from('unidades_receptoras')
        .select('nombre')
        .eq('id', movimiento.unidad_receptora_id)
        .single()
      unidadReceptora = unidadData
    }

    // Esta funcionalidad requiere el servicio pdf.service
    // que usa funciones de generacion de PDF complejas.
    // Por ahora, retornamos informacion del despacho en JSON.
    return NextResponse.json(
      {
        success: false,
        error: 'Generacion de PDF no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio pdf.service a Supabase',
        despacho: {
          id: despachoId,
          fecha: movimiento.created_at,
          receptor: movimiento.receptor_nombre || 'No especificado',
          cedulaReceptor: movimiento.receptor_cedula,
          unidadReceptora: unidadReceptora?.nombre,
          articulo,
          lote,
          cantidad: movimiento.cantidad,
        },
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al generar documento de despacho:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar el documento PDF' },
      { status: 500 }
    )
  }
}
