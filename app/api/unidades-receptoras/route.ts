/**
 * API: /api/unidades-receptoras
 * GET - Lista todas las unidades receptoras
 * POST - Crear nueva unidad receptora
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion
const createUnidadReceptoraSchema = z.object({
  codigo: z.string().min(2, 'Codigo debe tener al menos 2 caracteres').max(20),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
})

/**
 * GET /api/unidades-receptoras - Lista todas las unidades receptoras
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
      .from('unidades_receptoras')
      .select('*')
      .order('nombre')

    if (!includeInactive) {
      query = query.eq('activo', true)
    }

    const { data: unidades, error } = await query

    if (error) {
      console.error('Error al obtener unidades receptoras:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: unidades || [],
      total: unidades?.length || 0,
    })
  } catch (error) {
    console.error('Error al obtener unidades receptoras:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener unidades receptoras' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/unidades-receptoras - Crear nueva unidad receptora
 */
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

    const body = await request.json()

    // Validar datos
    const validacion = createUnidadReceptoraSchema.safeParse(body)
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
      .from('unidades_receptoras')
      .select('id')
      .eq('codigo', data.codigo.toUpperCase())
      .single()

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una unidad receptora con este codigo' },
        { status: 400 }
      )
    }

    // Crear unidad receptora usando admin client (bypass RLS)
    const { data: unidad, error } = await supabaseAdmin
      .from('unidades_receptoras')
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
      console.error('Error al crear unidad receptora:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_UNIDAD_RECEPTORA',
      entidad: 'unidades_receptoras',
      entidad_id: unidad.id,
      datos_nuevos: unidad,
    })

    return NextResponse.json({
      success: true,
      message: 'Unidad receptora creada exitosamente',
      data: unidad,
    })
  } catch (error) {
    console.error('Error al crear unidad receptora:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear unidad receptora' },
      { status: 500 }
    )
  }
}
