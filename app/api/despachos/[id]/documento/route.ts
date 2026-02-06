/**
 * API: GET /api/despachos/[id]/documento
 * Genera el documento PDF de un despacho individual
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarBoletaDespacho, type BoletaDespachoData } from '@/lib/pdf/despacho-pdf'

export const dynamic = 'force-dynamic'

/** Sanitiza un string para uso seguro en headers HTTP */
function sanitizeForHeader(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-_]/g, '')
}

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

    // Cargar datos relacionados en paralelo
    const [articuloResult, loteResult, unidadResult, bodegaResult] = await Promise.all([
      supabase
        .from('articulos')
        .select('id, sku, nombre, unidad_medida')
        .eq('id', movimiento.articulo_id)
        .single(),
      movimiento.lote_id
        ? supabase
            .from('lotes')
            .select('id, numero_lote, fecha_vencimiento')
            .eq('id', movimiento.lote_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      movimiento.unidad_receptora_id
        ? supabase
            .from('unidades_receptoras')
            .select('codigo, nombre')
            .eq('id', movimiento.unidad_receptora_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      movimiento.bodega_id
        ? supabase
            .from('bodegas')
            .select('codigo, nombre')
            .eq('id', movimiento.bodega_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (articuloResult.error) {
      console.error('Error al cargar artículo para PDF:', articuloResult.error)
    }

    const articulo = articuloResult.data
    const lote = loteResult.data
    const unidadReceptora = unidadResult.data
    const bodega = bodegaResult.data

    // Construir datos para el PDF
    const boletaData: BoletaDespachoData = {
      referencia: movimiento.documento_referencia || despachoId,
      fecha: movimiento.created_at || new Date().toISOString(),
      bodega,
      receptor: {
        nombre: movimiento.receptor_nombre || 'No especificado',
        cedula: movimiento.receptor_cedula,
        unidadReceptora,
      },
      lineas: [{
        sku: articulo?.sku || 'N/A',
        articulo: articulo?.nombre || 'Artículo desconocido',
        cantidad: movimiento.cantidad,
        unidadMedida: articulo?.unidad_medida || 'UND',
        lote: lote?.numero_lote || null,
        fechaVencimiento: lote?.fecha_vencimiento || null,
      }],
      observaciones: movimiento.observaciones || null,
    }

    // Generar PDF
    const pdfBuffer = await generarBoletaDespacho(boletaData)
    const safeId = sanitizeForHeader(despachoId.substring(0, 8))

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="boleta-despacho-${safeId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error al generar documento de despacho:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar el documento PDF' },
      { status: 500 }
    )
  }
}
