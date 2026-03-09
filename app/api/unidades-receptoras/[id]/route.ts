/**
 * API: /api/unidades-receptoras/[id]
 * GET - Obtener detalle de unidad receptora
 * PUT - Actualizar unidad receptora
 * DELETE - Desactivar unidad receptora (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para actualizar
const updateUnidadReceptoraSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/unidades-receptoras/[id] - Obtener detalle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { data: unidad, error } = await supabase
      .from('unidades_receptoras')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !unidad) {
      return NextResponse.json(
        { success: false, error: 'Unidad receptora no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: unidad,
    })
  } catch (error) {
    console.error('Error al obtener unidad receptora:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener unidad receptora' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/unidades-receptoras/[id] - Actualizar
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('unidades_receptoras.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()

    // Validar datos
    const validacion = updateUnidadReceptoraSchema.safeParse(body)
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

    // Verificar que existe
    const { data: unidadExistente, error: fetchError } = await supabase
      .from('unidades_receptoras')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !unidadExistente) {
      return NextResponse.json(
        { success: false, error: 'Unidad receptora no encontrada' },
        { status: 404 }
      )
    }

    const data = validacion.data

    // Actualizar
    const { data: unidadActualizada, error } = await supabaseAdmin
      .from('unidades_receptoras')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'EDITAR_UNIDAD_RECEPTORA',
      entidad: 'unidades_receptoras',
      entidad_id: id,
      datos_anteriores: unidadExistente,
      datos_nuevos: unidadActualizada,
    })

    return NextResponse.json({
      success: true,
      message: 'Unidad receptora actualizada exitosamente',
      data: unidadActualizada,
    })
  } catch (error) {
    console.error('Error al actualizar unidad receptora:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar unidad receptora' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/unidades-receptoras/[id] - Desactivar (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('unidades_receptoras.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    // Verificar que existe
    const { data: unidad, error: fetchError } = await supabase
      .from('unidades_receptoras')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !unidad) {
      return NextResponse.json(
        { success: false, error: 'Unidad receptora no encontrada' },
        { status: 404 }
      )
    }

    // Soft delete
    const { data: unidadDesactivada, error } = await supabaseAdmin
      .from('unidades_receptoras')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'DESACTIVAR_UNIDAD_RECEPTORA',
      entidad: 'unidades_receptoras',
      entidad_id: id,
      datos_anteriores: { activo: true },
      datos_nuevos: { activo: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Unidad receptora desactivada exitosamente',
      data: unidadDesactivada,
    })
  } catch (error) {
    console.error('Error al desactivar unidad receptora:', error)
    return NextResponse.json(
      { success: false, error: 'Error al desactivar unidad receptora' },
      { status: 500 }
    )
  }
}
