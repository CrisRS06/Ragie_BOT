/**
 * API: /api/bodegas
 * GET - Lista todas las bodegas
 * POST - Crear nueva bodega
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion
const createBodegaSchema = z.object({
  codigo: z.string().min(2, 'Codigo debe tener al menos 2 caracteres').max(20),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
})

/**
 * GET /api/bodegas - Lista todas las bodegas
 */
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
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('bodegas')
      .select('*')
      .order('nombre')

    if (!includeInactive) {
      query = query.eq('activo', true)
    }

    const { data: bodegas, error } = await query

    if (error) {
      console.error('Error al obtener bodegas:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bodegas: bodegas || [],
      data: bodegas || [],
      total: bodegas?.length || 0,
    })
  } catch (error) {
    console.error('Error al obtener bodegas:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener bodegas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bodegas - Crear nueva bodega
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('bodegas.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()

    // Validar datos
    const validacion = createBodegaSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos invalidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      )
    }

    const data = validacion.data

    // Verificar que el codigo no exista
    const { data: existente } = await supabase
      .from('bodegas')
      .select('id')
      .eq('codigo', data.codigo.toUpperCase())
      .single()

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una bodega con este codigo' },
        { status: 400 }
      )
    }

    // Crear bodega usando admin client (bypass RLS)
    const { data: bodega, error } = await supabaseAdmin
      .from('bodegas')
      .insert({
        codigo: data.codigo.toUpperCase(),
        nombre: data.nombre,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        responsable: data.responsable || null,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear bodega:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_BODEGA',
      entidad: 'bodegas',
      entidad_id: bodega.id,
      datos_nuevos: bodega,
    })

    return NextResponse.json({
      success: true,
      message: 'Bodega creada exitosamente',
      data: bodega,
    })
  } catch (error) {
    console.error('Error al crear bodega:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear bodega' },
      { status: 500 }
    )
  }
}
