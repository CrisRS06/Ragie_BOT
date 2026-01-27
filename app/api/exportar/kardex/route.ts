/**
 * API: /api/exportar/kardex
 * GET - Exporta el Kardex de un articulo a Excel
 *
 * NOTA: Esta funcionalidad depende del servicio excel.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    if (!articuloId) {
      return NextResponse.json(
        { success: false, error: 'El ID del articulo es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el articulo existe
    const { data: articulo, error } = await supabase
      .from('articulos')
      .select('sku')
      .eq('id', articuloId)
      .single()

    if (error || !articulo) {
      return NextResponse.json(
        { success: false, error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Esta funcionalidad requiere el servicio excel.service
    // que usa funciones de generacion de Excel complejas.
    return NextResponse.json(
      {
        success: false,
        error: 'Exportacion a Excel no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio excel.service a Supabase. Use /api/reportes/kardex para obtener los datos en JSON.',
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al exportar Kardex:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar Kardex' },
      { status: 500 }
    )
  }
}
