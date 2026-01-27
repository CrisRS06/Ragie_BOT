/**
 * API: /api/cortes
 * GET - Listar cortes
 * POST - Crear nuevo corte
 *
 * NOTA: Esta funcionalidad depende del servicio cortes.service que usa Prisma.
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
    const tipo = searchParams.get('tipo')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const limite = parseInt(searchParams.get('limite') || '20')

    // Obtener cortes
    let query = supabase
      .from('cortes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limite)

    if (tipo) {
      query = query.eq('tipo', tipo)
    }
    if (desde) {
      query = query.gte('created_at', desde)
    }
    if (hasta) {
      query = query.lte('created_at', hasta)
    }

    const { data: cortes, error, count } = await query

    if (error) {
      throw error
    }

    // Obtener perfiles para los solicitantes
    const solicitanteIds = [...new Set((cortes || []).map(c => c.solicitado_por_id).filter((id): id is string => id !== null))]
    const { data: perfiles } = solicitanteIds.length > 0
      ? await supabase
          .from('perfiles')
          .select('id, nombre')
          .in('id', solicitanteIds)
      : { data: [] }

    const perfilesMap = new Map((perfiles || []).map(p => [p.id, p]))

    return NextResponse.json({
      success: true,
      cortes: (cortes || []).map((corte) => {
        const perfil = corte.solicitado_por_id ? perfilesMap.get(corte.solicitado_por_id) : null
        return {
          id: corte.id,
          tipo: corte.tipo,
          timestamp: corte.created_at,
          motivo: corte.motivo,
          hashSnapshot: corte.hash_snapshot,
          totalArticulos: corte.total_articulos,
          totalLotes: corte.total_lotes,
          completado: corte.completado,
          solicitadoPor: perfil?.nombre,
        }
      }),
      total: count || 0,
    })
  } catch (error) {
    console.error('Error al listar cortes:', error)
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

    // Esta funcionalidad requiere el servicio cortes.service
    // que usa funciones complejas de generacion de cortes y hashes.
    return NextResponse.json(
      {
        success: false,
        error: 'Creacion de cortes no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio cortes.service a Supabase',
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al crear corte:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
