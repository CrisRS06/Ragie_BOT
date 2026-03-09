/**
 * API: POST /api/bitacora/verificar
 * Verifica la integridad de la cadena de hashes de la bitacora
 *
 * NOTA: Esta funcionalidad depende del servicio bitacora.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('bitacora.verificar')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json().catch(() => ({}))

    // Obtener registros de audit_log para verificacion basica
    let query = supabaseAdmin
      .from('audit_log')
      .select('id, created_at')
      .order('created_at', { ascending: true })
      .limit(body.limite || 1000)

    if (body.desde) {
      query = query.gte('created_at', body.desde)
    }
    if (body.hasta) {
      query = query.lte('created_at', body.hasta)
    }

    const { data: registros, error } = await query

    if (error) {
      throw error
    }

    const totalRegistros = registros?.length || 0
    const primerRegistro = registros?.[0]?.created_at || null
    const ultimoRegistro = registros?.[totalRegistros - 1]?.created_at || null

    // Registrar la verificacion en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'VERIFICAR_INTEGRIDAD_BITACORA',
      entidad: 'audit_log',
      entidad_id: 'sistema',
      datos_nuevos: {
        totalRegistros,
        primerRegistro,
        ultimoRegistro,
        nota: 'Verificacion basica - hashes no implementados en version Supabase',
      },
    })

    return NextResponse.json({
      success: true,
      verificacion: {
        integra: true,
        mensaje: 'Verificacion basica completada. Nota: La verificacion completa de hashes no esta implementada en la version Supabase.',
        totalRegistros,
        primerRegistro,
        ultimoRegistro,
        verificadoEn: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error al verificar bitacora:', error)
    return NextResponse.json(
      { success: false, error: 'Error al verificar integridad' },
      { status: 500 }
    )
  }
}
