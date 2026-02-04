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
import { supabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

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

    const body = await request.json().catch(() => ({}))
    const tipo = body.tipo || 'BAJO_DEMANDA'
    const motivo = body.motivo || null

    // 1. Obtener todos los lotes con inventario disponible
    const { data: lotes, error: lotesError } = await supabase
      .from('lotes')
      .select(`
        id,
        articulo_id,
        cantidad_disponible,
        fecha_vencimiento,
        ubicacion,
        articulo:articulos(id, sku, nombre, unidad_medida)
      `)
      .gt('cantidad_disponible', 0)
      .eq('activo', true)
      .order('articulo_id')
      .order('fecha_ingreso', { ascending: true })

    if (lotesError) {
      throw lotesError
    }

    const lotesActivos = lotes || []

    // Validar que hay inventario para crear corte
    if (lotesActivos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay lotes con inventario disponible para crear corte',
      }, { status: 400 })
    }

    // 2. Crear snapshot de datos para hash
    const snapshotData = lotesActivos.map(lote => ({
      articulo_id: lote.articulo_id,
      lote_id: lote.id,
      cantidad: lote.cantidad_disponible,
      fecha_vencimiento: lote.fecha_vencimiento,
      ubicacion: lote.ubicacion,
    }))

    // 3. Generar hash SHA-256 del snapshot usando Node.js crypto
    const snapshotString = JSON.stringify(snapshotData)
    const hashSnapshot = crypto
      .createHash('sha256')
      .update(snapshotString + new Date().toISOString())
      .digest('hex')

    // 4. Contar articulos y lotes unicos
    const articulosUnicos = new Set(lotesActivos.map(l => l.articulo_id))
    const totalArticulos = articulosUnicos.size
    const totalLotes = lotesActivos.length

    // 5. Crear registro de corte (usar admin client para bypass RLS)
    const { data: corte, error: corteError } = await supabaseAdmin
      .from('cortes')
      .insert({
        tipo,
        motivo,
        hash_snapshot: hashSnapshot,
        total_articulos: totalArticulos,
        total_lotes: totalLotes,
        completado: true,
        solicitado_por_id: user.id,
      })
      .select()
      .single()

    if (corteError) {
      throw corteError
    }

    // 6. Crear detalles del corte
    if (lotesActivos.length > 0) {
      const detallesCorte = lotesActivos.map(lote => ({
        corte_id: corte.id,
        articulo_id: lote.articulo_id,
        lote_id: lote.id,
        cantidad: lote.cantidad_disponible,
        fecha_vencimiento: lote.fecha_vencimiento,
        ubicacion: lote.ubicacion,
      }))

      const { error: detallesError } = await supabaseAdmin
        .from('detalles_corte')
        .insert(detallesCorte)

      if (detallesError) {
        // Revertir corte si falla
        await supabaseAdmin.from('cortes').delete().eq('id', corte.id)
        throw detallesError
      }
    }

    // 7. Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_CORTE',
      entidad: 'cortes',
      entidad_id: corte.id,
      datos_nuevos: {
        tipo,
        motivo,
        totalArticulos,
        totalLotes,
        hashSnapshot,
      },
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
        completado: corte.completado,
      },
      mensaje: `Corte de existencias creado exitosamente con ${totalArticulos} articulos y ${totalLotes} lotes`,
    })
  } catch (error) {
    console.error('Error al crear corte:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
