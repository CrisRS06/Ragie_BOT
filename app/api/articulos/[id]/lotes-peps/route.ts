/**
 * API: GET /api/articulos/[id]/lotes-peps
 * Obtiene los lotes disponibles de un articulo en orden PEPS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articuloId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el articulo existe
    const { data: articulo, error: artError } = await supabase
      .from('articulos')
      .select('id, sku, nombre, descripcion_sigaf, unidad_medida')
      .eq('id', articuloId)
      .single()

    if (artError || !articulo) {
      return NextResponse.json(
        { error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener lotes en orden PEPS (fecha_ingreso ASC)
    const { data: lotes, error: lotesError } = await supabase
      .from('lotes')
      .select('*')
      .eq('articulo_id', articuloId)
      .eq('activo', true)
      .eq('agotado', false)
      .gt('cantidad_disponible', 0)
      .order('fecha_ingreso', { ascending: true })

    if (lotesError) {
      throw lotesError
    }

    // Calcular stock total
    const stockTotal = (lotes || []).reduce((sum, lote) => sum + Number(lote.cantidad_disponible), 0)

    // Obtener cantidad requerida del query param (opcional)
    const cantidadRequerida = request.nextUrl.searchParams.get('cantidad')
    let sugerenciaConsumo = null

    if (cantidadRequerida) {
      const cantidad = parseFloat(cantidadRequerida)
      if (!isNaN(cantidad) && cantidad > 0) {
        if (stockTotal >= cantidad) {
          // Calcular consumo PEPS
          const consumos: Array<{ loteId: string; cantidad: number; costoUnitario: number }> = []
          let cantidadRestante = cantidad

          for (const lote of lotes || []) {
            if (cantidadRestante <= 0) break

            const cantidadAConsumir = Math.min(
              cantidadRestante,
              Number(lote.cantidad_disponible)
            )

            consumos.push({
              loteId: lote.id,
              cantidad: cantidadAConsumir,
              costoUnitario: Number(lote.costo_unitario) || 0,
            })

            cantidadRestante -= cantidadAConsumir
          }

          sugerenciaConsumo = {
            cantidadSolicitada: cantidad,
            consumos,
            stockSuficiente: true,
          }
        } else {
          sugerenciaConsumo = {
            cantidadSolicitada: cantidad,
            consumos: [],
            stockSuficiente: false,
            mensaje: `Stock insuficiente. Disponible: ${stockTotal}, Solicitado: ${cantidad}`,
          }
        }
      }
    }

    // Agregar informacion de dias hasta vencimiento
    const lotesConInfo = (lotes || []).map((lote) => {
      const diasHastaVencimiento = Math.ceil(
        (new Date(lote.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: lote.id,
        numeroLote: lote.numero_lote || `LOTE-${lote.id.substring(0, 8)}`,
        cantidadDisponible: Number(lote.cantidad_disponible),
        fechaVencimiento: lote.fecha_vencimiento,
        fechaIngreso: lote.fecha_ingreso,
        costoUnitario: lote.costo_unitario,
        ubicacion: lote.ubicacion,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        alertaVencimiento:
          diasHastaVencimiento < 0
            ? 'VENCIDO'
            : diasHastaVencimiento <= 7
            ? 'CRITICO'
            : diasHastaVencimiento <= 15
            ? 'PROXIMO'
            : null,
      }
    })

    return NextResponse.json({
      success: true,
      articulo,
      stockTotal,
      totalLotes: lotes?.length || 0,
      lotes: lotesConInfo,
      sugerenciaConsumo,
    })
  } catch (error) {
    console.error('Error al obtener lotes PEPS:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
