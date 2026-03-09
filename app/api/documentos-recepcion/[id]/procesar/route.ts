/**
 * API: /api/documentos-recepcion/[id]/procesar
 * POST - Procesar documento de recepcion (crear lotes y movimientos)
 *
 * NOTA: Esta funcionalidad depende del servicio documento-recepcion.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface DetalleRecepcion {
  id: string
  articulo_id: string
  cantidad: number
  costo_unitario: number | null
  fecha_vencimiento: string | null
  numero_lote_proveedor: string | null
  ubicacion: string | null
}

/**
 * POST /api/documentos-recepcion/[id]/procesar
 * Procesa un documento en estado BORRADOR, creando los lotes y movimientos
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('recepciones.crear')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    // 1. Obtener documento
    const { data: documento, error: docError } = await supabase
      .from('documentos_recepcion')
      .select('*')
      .eq('id', id)
      .single()

    if (docError || !documento) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    if (documento.estado !== 'BORRADOR') {
      return NextResponse.json(
        { success: false, error: `Documento en estado ${documento.estado}, solo se pueden procesar documentos en BORRADOR` },
        { status: 400 }
      )
    }

    // Obtener detalles del documento
    const { data: detallesData, error: detallesError } = await supabase
      .from('detalles_recepcion')
      .select('*')
      .eq('documento_id', id)

    if (detallesError) {
      throw detallesError
    }

    const detalles = (detallesData || []) as DetalleRecepcion[]
    if (detalles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento sin articulos para procesar' },
        { status: 400 }
      )
    }

    // 2. Procesar cada detalle: crear lote y movimiento
    const lotesCreados: string[] = []
    const movimientosCreados: string[] = []

    for (const detalle of detalles) {
      // Crear lote
      const { data: lote, error: loteError } = await supabaseAdmin
        .from('lotes')
        .insert({
          articulo_id: detalle.articulo_id,
          cantidad_inicial: detalle.cantidad,
          cantidad_disponible: detalle.cantidad,
          fecha_ingreso: new Date().toISOString().split('T')[0],
          fecha_vencimiento: detalle.fecha_vencimiento || null,
          numero_lote: detalle.numero_lote_proveedor,
          proveedor: documento.proveedor_id,
          costo_unitario: detalle.costo_unitario,
          ubicacion: detalle.ubicacion,
          bodega_id: documento.bodega_id,
          activo: true,
          agotado: false,
        })
        .select()
        .single()

      if (loteError) {
        // Revertir
        if (lotesCreados.length > 0) {
          await supabaseAdmin.from('lotes').delete().in('id', lotesCreados)
        }
        throw loteError
      }

      lotesCreados.push(lote.id)

      // Crear movimiento de entrada
      const { data: movimiento, error: movError } = await supabaseAdmin
        .from('movimientos')
        .insert({
          tipo: 'ENTRADA',
          articulo_id: detalle.articulo_id,
          lote_id: lote.id,
          cantidad: detalle.cantidad,
          costo_unitario_peps: detalle.costo_unitario,
          usuario_id: user.id,
          documento_referencia: documento.numero,
          observaciones: `Recepcion via documento ${documento.numero}`,
          bodega_id: documento.bodega_id,
        })
        .select()
        .single()

      if (movError) {
        // Revertir
        await supabaseAdmin.from('lotes').delete().in('id', lotesCreados)
        if (movimientosCreados.length > 0) {
          await supabaseAdmin.from('movimientos').delete().in('id', movimientosCreados)
        }
        throw movError
      }

      movimientosCreados.push(movimiento.id)

      // Actualizar detalle con lote_id
      await supabaseAdmin
        .from('detalles_recepcion')
        .update({ lote_id: lote.id })
        .eq('id', detalle.id)
    }

    // 3. Actualizar estado del documento a PROCESADO
    const { error: updateError } = await supabaseAdmin
      .from('documentos_recepcion')
      .update({ estado: 'PROCESADO', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    // 4. Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PROCESAR_DOCUMENTO_RECEPCION',
      entidad: 'documentos_recepcion',
      entidad_id: id,
      datos_nuevos: {
        lotesCreados: lotesCreados.length,
        movimientosCreados: movimientosCreados.length,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: documento.id,
        numero: documento.numero,
        estado: 'PROCESADO',
        lotesCreados: lotesCreados.length,
      },
      mensaje: `Documento ${documento.numero} procesado exitosamente. Se crearon ${lotesCreados.length} lotes.`,
    })
  } catch (error) {
    console.error('Error al procesar documento de recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar documento',
      },
      { status: 500 }
    )
  }
}
