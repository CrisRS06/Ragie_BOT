/**
 * API: GET /api/inventario/[articuloId]/lotes
 * Obtiene los lotes de un articulo especifico con informacion detallada
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articuloId: string }> }
) {
  try {
    const { articuloId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const incluirAgotados = searchParams.get('incluirAgotados') === 'true'
    const ordenarPor = searchParams.get('ordenarPor') || 'fecha_ingreso'

    // Verificar que el articulo existe
    const { data: articulo, error: artError } = await supabase
      .from('articulos')
      .select('id, sku, nombre, descripcion_sigaf, unidad_medida, stock_minimo')
      .eq('id', articuloId)
      .single()

    if (artError || !articulo) {
      return NextResponse.json(
        { error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Construir query de lotes
    let query = supabase
      .from('lotes')
      .select('*')
      .eq('articulo_id', articuloId)
      .eq('activo', true)

    if (!incluirAgotados) {
      query = query.eq('agotado', false).gt('cantidad_disponible', 0)
    }

    // Ordenamiento
    if (ordenarPor === 'fecha_vencimiento') {
      query = query.order('fecha_vencimiento', { ascending: true })
    } else {
      query = query.order('fecha_ingreso', { ascending: true })
    }

    const { data: lotes, error: lotesError } = await query

    if (lotesError) {
      throw lotesError
    }

    // Procesar lotes con informacion adicional
    const lotesConInfo = (lotes || []).map((lote, index) => {
      const diasHastaVencimiento = Math.ceil(
        (new Date(lote.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      let severidadVencimiento: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'OK' = 'OK'
      if (diasHastaVencimiento < 0) {
        severidadVencimiento = 'CRITICA'
      } else if (diasHastaVencimiento <= 7) {
        severidadVencimiento = 'ALTA'
      } else if (diasHastaVencimiento <= 15) {
        severidadVencimiento = 'MEDIA'
      } else if (diasHastaVencimiento <= 30) {
        severidadVencimiento = 'BAJA'
      }

      return {
        id: lote.id,
        numeroLote: lote.numero_lote || `LOTE-${lote.id.substring(0, 8)}`,
        ordenPEPS: index + 1,
        cantidadInicial: Number(lote.cantidad_inicial),
        cantidadDisponible: Number(lote.cantidad_disponible),
        cantidadConsumida: Number(lote.cantidad_inicial) - Number(lote.cantidad_disponible),
        porcentajeConsumido: Math.round(
          ((Number(lote.cantidad_inicial) - Number(lote.cantidad_disponible)) / Number(lote.cantidad_inicial)) * 100
        ),
        fechaIngresoTs: lote.fecha_ingreso,
        fechaVencimiento: lote.fecha_vencimiento,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        severidadVencimiento,
        proveedor: lote.proveedor,
        costoUnitario: lote.costo_unitario,
        ubicacion: lote.ubicacion,
        agotado: lote.agotado,
      }
    })

    // Calcular estadisticas
    const stockTotal = lotesConInfo.reduce((sum, l) => sum + l.cantidadDisponible, 0)
    const lotesActivos = lotesConInfo.filter((l) => !l.agotado).length
    const lotesVencidos = lotesConInfo.filter((l) => l.vencido).length
    const lotesProximosAVencer = lotesConInfo.filter(
      (l) => !l.vencido && l.diasHastaVencimiento <= 30
    ).length

    return NextResponse.json({
      success: true,
      articulo,
      lotes: lotesConInfo,
      estadisticas: {
        stockTotal,
        totalLotes: lotesConInfo.length,
        lotesActivos,
        lotesAgotados: lotesConInfo.length - lotesActivos,
        lotesVencidos,
        lotesProximosAVencer,
        alertaStockBajo: articulo.stock_minimo !== null && stockTotal <= Number(articulo.stock_minimo),
      },
    })
  } catch (error) {
    console.error('Error al obtener lotes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
