/**
 * API: GET /api/cortes/[id]/csv
 * Exporta un corte en formato CSV
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

    // Obtener corte
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

    // Generar CSV
    const encabezados = [
      'SKU',
      'Nombre',
      'Descripcion SIGAF',
      'Unidad Medida',
      'Lote ID',
      'Cantidad',
      'Ubicacion',
      'Fecha Vencimiento',
    ]

    const filas = (detalles || []).map((d) => {
      const articulo = articulosMap.get(d.articulo_id)
      return [
        articulo?.sku || '',
        articulo?.nombre || '',
        articulo?.descripcion_sigaf || '',
        articulo?.unidad_medida || '',
        d.lote_id || '',
        d.cantidad,
        d.ubicacion || '',
        d.fecha_vencimiento || '',
      ]
    })

    const csv = [
      encabezados.join(','),
      ...filas.map((fila) => fila.map((campo) => `"${campo}"`).join(',')),
    ].join('\n')

    // Nombre del archivo
    const fecha = new Date(corte.created_at).toISOString().split('T')[0]
    const filename = `corte-${(corte.tipo || 'inventario').toLowerCase()}-${fecha}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Corte-Hash': corte.hash_snapshot || '',
      },
    })
  } catch (error) {
    console.error('Error al exportar corte CSV:', error)
    return NextResponse.json(
      { error: 'Error al generar CSV' },
      { status: 500 }
    )
  }
}
