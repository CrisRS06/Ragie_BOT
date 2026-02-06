/**
 * API: GET /api/despachos/boleta/[referencia]
 * Genera un PDF de boleta de despacho agrupando todos los movimientos
 * que comparten el mismo documento_referencia
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
  { params }: { params: Promise<{ referencia: string }> }
) {
  try {
    const { referencia } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar todos los movimientos con este documento_referencia
    const { data: movimientos, error } = await supabase
      .from('movimientos')
      .select('*')
      .eq('documento_referencia', referencia)
      .eq('tipo', 'SALIDA')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error al buscar movimientos:', error)
      return NextResponse.json(
        { success: false, error: 'Error al buscar movimientos' },
        { status: 500 }
      )
    }

    if (!movimientos || movimientos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron movimientos con esta referencia' },
        { status: 404 }
      )
    }

    // Obtener IDs únicos
    const articuloIds = [...new Set(movimientos.map(m => m.articulo_id))]
    const loteIds = movimientos.map(m => m.lote_id).filter((id): id is string => id !== null)
    const uniqueLoteIds = [...new Set(loteIds)]
    const unidadReceptoraId = movimientos[0].unidad_receptora_id
    const bodegaId = movimientos[0].bodega_id

    // Cargar datos relacionados en paralelo
    const [articulosResult, lotesResult, unidadResult, bodegaResult] = await Promise.all([
      supabase
        .from('articulos')
        .select('id, sku, nombre, unidad_medida')
        .in('id', articuloIds),
      uniqueLoteIds.length > 0
        ? supabase
            .from('lotes')
            .select('id, numero_lote, fecha_vencimiento')
            .in('id', uniqueLoteIds)
        : Promise.resolve({ data: null, error: null }),
      unidadReceptoraId
        ? supabase
            .from('unidades_receptoras')
            .select('codigo, nombre')
            .eq('id', unidadReceptoraId)
            .single()
        : Promise.resolve({ data: null, error: null }),
      bodegaId
        ? supabase
            .from('bodegas')
            .select('codigo, nombre')
            .eq('id', bodegaId)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ])

    const articulosMap = new Map((articulosResult.data || []).map(a => [a.id, a]))
    const lotesMap = new Map((lotesResult.data || []).map(l => [l.id, l]))

    // Construir datos para el PDF
    const boletaData: BoletaDespachoData = {
      referencia,
      fecha: movimientos[0].created_at || new Date().toISOString(),
      bodega: bodegaResult.data,
      receptor: {
        nombre: movimientos[0].receptor_nombre || 'No especificado',
        cedula: movimientos[0].receptor_cedula,
        unidadReceptora: unidadResult.data,
      },
      lineas: movimientos.map(mov => {
        const art = articulosMap.get(mov.articulo_id)
        const lote = mov.lote_id ? lotesMap.get(mov.lote_id) : null
        return {
          sku: art?.sku || 'N/A',
          articulo: art?.nombre || 'Artículo desconocido',
          cantidad: mov.cantidad,
          unidadMedida: art?.unidad_medida || 'UND',
          lote: lote?.numero_lote || null,
          fechaVencimiento: lote?.fecha_vencimiento || null,
        }
      }),
      observaciones: movimientos[0].observaciones || null,
    }

    // Generar PDF
    const pdfBuffer = await generarBoletaDespacho(boletaData)
    const safeRef = sanitizeForHeader(referencia.substring(0, 8))

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="boleta-despacho-${safeRef}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error al generar boleta PDF:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar el documento PDF' },
      { status: 500 }
    )
  }
}
