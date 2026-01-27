/**
 * API: /api/informes/mensual
 * GET - Obtener informe mensual existente
 * POST - Generar nuevo informe mensual
 *
 * NOTA: Esta funcionalidad depende del servicio informes.service que usa Prisma.
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

    const searchParams = request.nextUrl.searchParams
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')

    // Obtener informes existentes
    let query = supabase
      .from('informes')
      .select('*')
      .eq('tipo', 'MENSUAL_INVENTARIO')
      .order('periodo_inicio', { ascending: false })
      .limit(12)

    if (mes && anio) {
      const inicio = new Date(parseInt(anio), parseInt(mes) - 1, 1)
      const fin = new Date(parseInt(anio), parseInt(mes), 0)
      query = query
        .gte('periodo_inicio', inicio.toISOString())
        .lte('periodo_fin', fin.toISOString())
    }

    const { data: informes, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      informes: informes || [],
      necesidad: {
        necesitaGenerar: true,
        mensaje: 'Verificacion de necesidad de informe no implementada en version Supabase',
      },
    })
  } catch (error) {
    console.error('Error al obtener informes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Esta funcionalidad requiere el servicio informes.service
    // que usa funciones complejas de generacion de informes.
    return NextResponse.json(
      {
        success: false,
        error: 'Generacion de informe mensual no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio informes.service a Supabase',
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al generar informe:', error)
    return NextResponse.json(
      { error: 'Error al generar informe' },
      { status: 500 }
    )
  }
}
