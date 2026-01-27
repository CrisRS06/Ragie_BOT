/**
 * API: GET /api/bitacora/exportar
 * Exporta la bitacora en formato CSV
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

    // Obtener registros de audit_log
    let query = supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (desde) {
      query = query.gte('created_at', desde)
    }
    if (hasta) {
      query = query.lte('created_at', hasta)
    }

    const { data: registros, error } = await query

    if (error) {
      throw error
    }

    // Obtener perfiles para los usuarios
    const usuarioIds = [...new Set((registros || []).map(r => r.usuario_id).filter((id): id is string => id !== null))]
    const { data: perfiles } = usuarioIds.length > 0
      ? await supabaseAdmin
          .from('perfiles')
          .select('id, nombre, rol')
          .in('id', usuarioIds)
      : { data: [] }

    const perfilesMap = new Map((perfiles || []).map(p => [p.id, p]))

    // Generar CSV
    const encabezados = [
      'ID',
      'Fecha',
      'Usuario',
      'Rol',
      'Accion',
      'Entidad',
      'EntidadID',
      'IP',
    ]

    const filas = (registros || []).map((r) => {
      const perfil = r.usuario_id ? perfilesMap.get(r.usuario_id) : null
      return [
        r.id,
        new Date(r.created_at).toISOString(),
        perfil?.nombre || 'Sistema',
        perfil?.rol || 'N/A',
        r.accion,
        r.entidad,
        r.entidad_id,
        r.ip || 'N/A',
      ]
    })

    const csv = [
      encabezados.join(','),
      ...filas.map((fila) => fila.map((campo) => `"${campo}"`).join(',')),
    ].join('\n')

    // Registrar la exportacion
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'EXPORTAR_BITACORA',
      entidad: 'audit_log',
      entidad_id: 'sistema',
      datos_nuevos: {
        totalRegistros: registros?.length || 0,
        desde,
        hasta,
      },
    })

    // Nombre del archivo
    const fecha = new Date().toISOString().split('T')[0]
    const filename = `bitacora-${fecha}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Registros': (registros?.length || 0).toString(),
      },
    })
  } catch (error) {
    console.error('Error al exportar bitacora:', error)
    return NextResponse.json(
      { error: 'Error al exportar bitacora' },
      { status: 500 }
    )
  }
}
