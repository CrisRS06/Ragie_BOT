/**
 * API: /api/bodegas/[id]
 * GET - Obtener detalle de bodega
 * PUT - Actualizar bodega
 * DELETE - Desactivar bodega (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para actualizar
const updateBodegaSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bodegas/[id] - Obtener detalle de bodega
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

    const { data: bodega, error } = await supabase
      .from('bodegas')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !bodega) {
      return NextResponse.json(
        { success: false, error: 'Bodega no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: bodega,
    })
  } catch (error) {
    console.error('Error al obtener bodega:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener bodega' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/bodegas/[id] - Actualizar bodega
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json()

    // Validar datos
    const validacion = updateBodegaSchema.safeParse(body)
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

    // Verificar que la bodega existe
    const { data: bodegaExistente, error: fetchError } = await supabase
      .from('bodegas')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !bodegaExistente) {
      return NextResponse.json(
        { success: false, error: 'Bodega no encontrada' },
        { status: 404 }
      )
    }

    const data = validacion.data

    // Actualizar bodega
    const { data: bodegaActualizada, error } = await supabaseAdmin
      .from('bodegas')
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
      accion: 'EDITAR_BODEGA',
      entidad: 'bodegas',
      entidad_id: id,
      datos_anteriores: bodegaExistente,
      datos_nuevos: bodegaActualizada,
    })

    return NextResponse.json({
      success: true,
      message: 'Bodega actualizada exitosamente',
      data: bodegaActualizada,
    })
  } catch (error) {
    console.error('Error al actualizar bodega:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar bodega' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bodegas/[id] - Desactivar bodega (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Verificar que la bodega existe
    const { data: bodega, error: fetchError } = await supabase
      .from('bodegas')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !bodega) {
      return NextResponse.json(
        { success: false, error: 'Bodega no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que no hay lotes activos en esta bodega
    const { count: lotesActivos } = await supabase
      .from('lotes')
      .select('*', { count: 'exact', head: true })
      .eq('bodega_id', id)
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    if (lotesActivos && lotesActivos > 0) {
      return NextResponse.json(
        { success: false, error: `No se puede desactivar la bodega porque tiene ${lotesActivos} lotes con stock disponible` },
        { status: 400 }
      )
    }

    // Soft delete
    const { data: bodegaDesactivada, error } = await supabaseAdmin
      .from('bodegas')
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
      accion: 'DESACTIVAR_BODEGA',
      entidad: 'bodegas',
      entidad_id: id,
      datos_anteriores: { activo: true },
      datos_nuevos: { activo: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Bodega desactivada exitosamente',
      data: bodegaDesactivada,
    })
  } catch (error) {
    console.error('Error al desactivar bodega:', error)
    return NextResponse.json(
      { success: false, error: 'Error al desactivar bodega' },
      { status: 500 }
    )
  }
}
