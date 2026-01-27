/**
 * API: GET /api/cortes/[id]
 * Obtiene el detalle de un corte especifico
 *
 * NOTA: Esta funcionalidad depende del servicio cortes.service que usa Prisma.
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
    const { id: corteId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener corte basico
    const { data: corte, error } = await supabase
      .from('cortes')
      .select('*')
      .eq('id', corteId)
      .single()

    if (error || !corte) {
      return NextResponse.json(
        { error: 'Corte no encontrado' },
        { status: 404 }
      )
    }

    // Obtener perfil del solicitante si existe
    let solicitadoPor = null
    if (corte.solicitado_por_id) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', corte.solicitado_por_id)
        .single()
      solicitadoPor = perfil?.nombre
    }

    // Obtener detalles del corte
    const { data: detalles } = await supabase
      .from('detalles_corte')
      .select('*')
      .eq('corte_id', corteId)

    // Obtener articulos para los detalles
    const articuloIds = [...new Set((detalles || []).map(d => d.articulo_id))]
    const { data: articulos } = articuloIds.length > 0
      ? await supabase
          .from('articulos')
          .select('id, sku, nombre, descripcion_sigaf, unidad_medida')
          .in('id', articuloIds)
      : { data: [] }

    const articulosMap = new Map((articulos || []).map(a => [a.id, a]))

    // Enriquecer detalles con info de articulo
    const detallesEnriquecidos = (detalles || []).map(d => {
      const articulo = articulosMap.get(d.articulo_id)
      return {
        ...d,
        articuloSku: articulo?.sku,
        articuloNombre: articulo?.nombre,
        articuloDescripcionSIGAF: articulo?.descripcion_sigaf,
        unidadMedida: articulo?.unidad_medida,
      }
    })

    return NextResponse.json({
      success: true,
      corte: {
        id: corte.id,
        tipo: corte.tipo,
        timestamp: corte.created_at,
        motivo: corte.motivo,
        hashSnapshot: corte.hash_snapshot,
        totalArticulos: corte.total_articulos,
        totalLotes: corte.total_lotes,
        periodoInicio: corte.periodo_inicio,
        periodoFin: corte.periodo_fin,
        completado: corte.completado,
        solicitadoPor,
      },
      detalles: detallesEnriquecidos,
      resumen: {
        totalArticulos: corte.total_articulos,
        totalLotes: corte.total_lotes,
        totalUnidades: (detalles || []).reduce((sum, d) => sum + Number(d.cantidad), 0),
      },
    })
  } catch (error) {
    console.error('Error al obtener corte:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
