/**
 * API: /api/reportes/kardex
 * GET - Genera el Kardex (historial de movimientos) de un articulo
 * Reporte Kardex con formato PEPS y saldos acumulativos
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface MovimientoKardex {
  id: string
  fecha: string
  tipo: string
  numeroLote: string | null
  descripcion: string
  cantidad: number
  costoUnitario: number | null
  valorMovimiento: number | null
  saldoCantidad: number
  saldoValor: number
  receptor: string | null
  unidadReceptora: string | null
  documentoReferencia: string | null
  observaciones: string | null
}

/**
 * GET /api/reportes/kardex
 * Genera el Kardex de un articulo con saldos acumulativos
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
    const articuloId = searchParams.get('articuloId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    if (!articuloId) {
      return NextResponse.json(
        { success: false, error: 'El ID del articulo es requerido' },
        { status: 400 }
      )
    }

    // Obtener informacion del articulo
    const { data: articulo, error: artError } = await supabase
      .from('articulos')
      .select('id, sku, nombre, descripcion_sigaf, marca, unidad_medida, iva_percent')
      .eq('id', articuloId)
      .single()

    if (artError || !articulo) {
      return NextResponse.json(
        { success: false, error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Construir query de movimientos
    let query = supabase
      .from('movimientos')
      .select('*')
      .eq('articulo_id', articuloId)
      .eq('anulado', false)
      .order('created_at', { ascending: true })

    if (fechaDesde) {
      query = query.gte('created_at', fechaDesde)
    }
    if (fechaHasta) {
      const fechaFin = new Date(fechaHasta)
      fechaFin.setHours(23, 59, 59, 999)
      query = query.lte('created_at', fechaFin.toISOString())
    }

    const { data: movimientos, error: movError } = await query

    if (movError) {
      throw movError
    }

    // Obtener lotes relacionados
    const loteIds = [...new Set((movimientos || []).map(m => m.lote_id).filter((id): id is string => id !== null))]
    const { data: lotes } = loteIds.length > 0
      ? await supabase
          .from('lotes')
          .select('id, numero_lote, costo_unitario')
          .in('id', loteIds)
      : { data: [] }
    const lotesMap = new Map((lotes || []).map(l => [l.id, l]))

    // Obtener unidades receptoras relacionadas
    const unidadIds = [...new Set((movimientos || []).map(m => m.unidad_receptora_id).filter((id): id is string => id !== null))]
    const { data: unidades } = unidadIds.length > 0
      ? await supabase
          .from('unidades_receptoras')
          .select('id, codigo, nombre')
          .in('id', unidadIds)
      : { data: [] }
    const unidadesMap = new Map((unidades || []).map(u => [u.id, u]))

    // Calcular saldo inicial si hay filtro de fecha
    let saldoCantidad = 0
    let saldoValor = 0

    if (fechaDesde) {
      const { data: movAnteriores } = await supabase
        .from('movimientos')
        .select('*')
        .eq('articulo_id', articuloId)
        .eq('anulado', false)
        .lt('created_at', fechaDesde)

      // Obtener lotes para movimientos anteriores
      const loteIdsAnt = [...new Set((movAnteriores || []).map(m => m.lote_id).filter((id): id is string => id !== null))]
      const { data: lotesAnt } = loteIdsAnt.length > 0
        ? await supabase
            .from('lotes')
            .select('id, costo_unitario')
            .in('id', loteIdsAnt)
        : { data: [] }
      const lotesAntMap = new Map((lotesAnt || []).map(l => [l.id, l]))

      for (const mov of movAnteriores || []) {
        const lote = mov.lote_id ? lotesAntMap.get(mov.lote_id) : null
        const costoUnitario = lote?.costo_unitario || 0
        const valorMovimiento = Number(mov.cantidad) * Number(costoUnitario)

        if (mov.tipo === 'ENTRADA') {
          saldoCantidad += Number(mov.cantidad)
          saldoValor += valorMovimiento
        } else if (mov.tipo === 'SALIDA') {
          saldoCantidad -= Number(mov.cantidad)
          saldoValor -= valorMovimiento
        }
      }
    }

    // Procesar movimientos y calcular saldos acumulativos
    const kardexMovimientos: MovimientoKardex[] = []

    // Agregar saldo inicial si hay filtro de fecha
    if (fechaDesde && (saldoCantidad !== 0 || saldoValor !== 0)) {
      kardexMovimientos.push({
        id: 'saldo-inicial',
        fecha: fechaDesde,
        tipo: 'SALDO_INICIAL',
        numeroLote: null,
        descripcion: 'Saldo inicial del periodo',
        cantidad: 0,
        costoUnitario: null,
        valorMovimiento: null,
        saldoCantidad: Math.round(saldoCantidad * 100) / 100,
        saldoValor: Math.round(saldoValor * 100) / 100,
        receptor: null,
        unidadReceptora: null,
        documentoReferencia: null,
        observaciones: null,
      })
    }

    for (const mov of movimientos || []) {
      const lote = mov.lote_id ? lotesMap.get(mov.lote_id) : null
      const unidadReceptora = mov.unidad_receptora_id ? unidadesMap.get(mov.unidad_receptora_id) : null
      const costoUnitario = mov.costo_unitario_peps || lote?.costo_unitario || 0
      const valorMovimiento = Number(mov.cantidad) * Number(costoUnitario)

      // Actualizar saldos segun tipo de movimiento
      if (mov.tipo === 'ENTRADA') {
        saldoCantidad += Number(mov.cantidad)
        saldoValor += valorMovimiento
      } else if (mov.tipo === 'SALIDA') {
        saldoCantidad -= Number(mov.cantidad)
        saldoValor -= valorMovimiento
      }

      // Generar descripcion del movimiento
      let descripcion = ''
      switch (mov.tipo) {
        case 'ENTRADA':
          descripcion = `Recepcion - ${lote?.numero_lote || 'Sin lote'}`
          break
        case 'SALIDA':
          descripcion = unidadReceptora
            ? `Despacho a ${unidadReceptora.nombre}`
            : `Despacho a ${mov.receptor_nombre || 'N/A'}`
          break
        case 'AJUSTE_INVENTARIO':
          descripcion = `Ajuste: ${mov.motivo || 'Sin motivo'}`
          break
        default:
          descripcion = mov.tipo
      }

      kardexMovimientos.push({
        id: mov.id,
        fecha: mov.created_at,
        tipo: mov.tipo,
        numeroLote: lote?.numero_lote || null,
        descripcion,
        cantidad: mov.tipo === 'SALIDA' ? -Number(mov.cantidad) : Number(mov.cantidad),
        costoUnitario: Number(costoUnitario),
        valorMovimiento: Math.round(valorMovimiento * 100) / 100,
        saldoCantidad: Math.round(saldoCantidad * 100) / 100,
        saldoValor: Math.round(saldoValor * 100) / 100,
        receptor: mov.receptor_nombre,
        unidadReceptora: unidadReceptora?.nombre || null,
        documentoReferencia: mov.documento_referencia,
        observaciones: mov.observaciones,
      })
    }

    // Calcular totales del periodo
    const totalEntradas = (movimientos || [])
      .filter(m => m.tipo === 'ENTRADA')
      .reduce((sum, m) => sum + Number(m.cantidad), 0)

    const totalSalidas = (movimientos || [])
      .filter(m => m.tipo === 'SALIDA')
      .reduce((sum, m) => sum + Number(m.cantidad), 0)

    return NextResponse.json({
      success: true,
      fechaReporte: new Date().toISOString(),
      periodo: {
        desde: fechaDesde || 'Inicio',
        hasta: fechaHasta || 'Actual',
      },
      articulo: {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        descripcionSIGAF: articulo.descripcion_sigaf,
        marca: articulo.marca,
        unidadMedida: articulo.unidad_medida,
        ivaPercent: articulo.iva_percent,
      },
      resumen: {
        totalMovimientos: (movimientos || []).length,
        totalEntradas: Math.round(totalEntradas * 100) / 100,
        totalSalidas: Math.round(totalSalidas * 100) / 100,
        saldoFinalCantidad: Math.round(saldoCantidad * 100) / 100,
        saldoFinalValor: Math.round(saldoValor * 100) / 100,
      },
      movimientos: kardexMovimientos,
    })
  } catch (error) {
    console.error('Error al generar Kardex:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar Kardex',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
