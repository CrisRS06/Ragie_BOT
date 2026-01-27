/**
 * API: /api/reportes/valor-bodega
 * GET - Obtiene el valor total del inventario en bodega
 * Reporte para INS (seguros) y control interno
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reportes/valor-bodega
 * Calcula el valor total del inventario usando costos PEPS
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
    const incluirDetalleLotes = searchParams.get('detalle') === 'true'
    const soloConStock = searchParams.get('soloConStock') !== 'false'

    // Obtener todos los articulos activos
    const { data: articulos, error: artError } = await supabase
      .from('articulos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (artError) {
      throw artError
    }

    // Para cada articulo, obtener sus lotes
    const articulosValorizados = []
    let totalGeneralSinIva = 0
    let totalGeneralIva = 0
    let totalGeneralConIva = 0
    let totalArticulosConStock = 0
    let totalLotes = 0

    for (const articulo of articulos || []) {
      let lotesQuery = supabase
        .from('lotes')
        .select('id, numero_lote, cantidad_disponible, costo_unitario, fecha_vencimiento')
        .eq('articulo_id', articulo.id)
        .eq('activo', true)
        .order('fecha_ingreso', { ascending: true })

      if (soloConStock) {
        lotesQuery = lotesQuery.eq('agotado', false).gt('cantidad_disponible', 0)
      }

      const { data: lotes } = await lotesQuery

      if ((!lotes || lotes.length === 0) && soloConStock) continue

      let cantidadTotal = 0
      let valorArticuloSinIva = 0
      let valorArticuloIva = 0
      let valorArticuloConIva = 0

      const lotesValorizados = (lotes || []).map((lote) => {
        const costoUnitario = Number(lote.costo_unitario) || 0
        const valorLoteSinIva = Number(lote.cantidad_disponible) * costoUnitario
        const valorLoteIva = valorLoteSinIva * (Number(articulo.iva_percent) || 0)
        const valorLoteConIva = valorLoteSinIva + valorLoteIva

        cantidadTotal += Number(lote.cantidad_disponible)
        valorArticuloSinIva += valorLoteSinIva
        valorArticuloIva += valorLoteIva
        valorArticuloConIva += valorLoteConIva
        totalLotes++

        return {
          id: lote.id,
          numeroLote: lote.numero_lote,
          cantidadDisponible: Number(lote.cantidad_disponible),
          costoUnitario: lote.costo_unitario,
          fechaVencimiento: lote.fecha_vencimiento,
          valorSinIva: Math.round(valorLoteSinIva * 100) / 100,
          valorIva: Math.round(valorLoteIva * 100) / 100,
          valorConIva: Math.round(valorLoteConIva * 100) / 100,
        }
      })

      totalGeneralSinIva += valorArticuloSinIva
      totalGeneralIva += valorArticuloIva
      totalGeneralConIva += valorArticuloConIva

      if (cantidadTotal > 0) {
        totalArticulosConStock++
      }

      articulosValorizados.push({
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        marca: articulo.marca,
        unidadMedida: articulo.unidad_medida,
        ivaPercent: articulo.iva_percent,
        cantidadTotal,
        valorSinIva: Math.round(valorArticuloSinIva * 100) / 100,
        valorIva: Math.round(valorArticuloIva * 100) / 100,
        valorConIva: Math.round(valorArticuloConIva * 100) / 100,
        lotes: incluirDetalleLotes ? lotesValorizados : [],
      })
    }

    return NextResponse.json({
      success: true,
      fechaReporte: new Date().toISOString(),
      resumen: {
        totalArticulos: articulosValorizados.length,
        totalArticulosConStock,
        totalLotes,
        valorTotalSinIva: Math.round(totalGeneralSinIva * 100) / 100,
        valorTotalIva: Math.round(totalGeneralIva * 100) / 100,
        valorTotalConIva: Math.round(totalGeneralConIva * 100) / 100,
        moneda: 'CRC',
      },
      articulos: articulosValorizados,
    })
  } catch (error) {
    console.error('Error al generar reporte de valor de bodega:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar reporte de valor de bodega',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
