/**
 * API: GET /api/bitacora
 * Lista eventos de la bitacora (audit_log) con filtros
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
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const accion = searchParams.get('accion')
    const entidad = searchParams.get('entidad')
    const limite = parseInt(searchParams.get('limite') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir query
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1)

    if (desde) {
      query = query.gte('created_at', desde)
    }
    if (hasta) {
      query = query.lte('created_at', hasta)
    }
    if (accion) {
      query = query.eq('accion', accion)
    }
    if (entidad) {
      query = query.eq('entidad', entidad)
    }

    const { data: registros, error, count } = await query

    if (error) {
      console.error('Error al listar bitacora:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Obtener lista de acciones unicas para filtros
    const { data: accionesData } = await supabase
      .from('audit_log')
      .select('accion')

    const acciones = [...new Set(accionesData?.map((a) => a.accion) || [])]
      .map((accion) => ({ accion, count: accionesData?.filter((a) => a.accion === accion).length || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Obtener lista de entidades unicas para filtros
    const { data: entidadesData } = await supabase
      .from('audit_log')
      .select('entidad')

    const entidades = [...new Set(entidadesData?.map((e) => e.entidad) || [])]
      .map((entidad) => ({ entidad, count: entidadesData?.filter((e) => e.entidad === entidad).length || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      registros: (registros || []).map((r) => ({
        id: r.id,
        timestamp: r.created_at,
        accion: r.accion,
        entidad: r.entidad,
        entidadId: r.entidad_id,
        estadoAnterior: r.datos_anteriores,
        estadoNuevo: r.datos_nuevos,
        usuarioId: r.usuario_id,
        ip: r.ip,
      })),
      filtrosDisponibles: {
        acciones,
        entidades,
      },
      paginacion: {
        total: count || 0,
        limite,
        offset,
        paginas: Math.ceil((count || 0) / limite),
      },
    })
  } catch (error) {
    console.error('Error al listar bitacora:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
