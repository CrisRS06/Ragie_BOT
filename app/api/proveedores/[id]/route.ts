/**
 * API: /api/proveedores/[id]
 * GET - Obtener detalle de proveedor
 * PUT - Actualizar proveedor
 * DELETE - Desactivar proveedor (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para actualizar
const updateProveedorSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  ruc: z.string().max(20).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  contacto: z.string().max(100).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/proveedores/[id] - Obtener detalle de proveedor
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

    const { data: proveedor, error } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !proveedor) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: proveedor,
    })
  } catch (error) {
    console.error('Error al obtener proveedor:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener proveedor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/proveedores/[id] - Actualizar proveedor
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('proveedores.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()

    // Validar datos
    const validacion = updateProveedorSchema.safeParse(body)
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

    // Verificar que el proveedor existe
    const { data: proveedorExistente, error: fetchError } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !proveedorExistente) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    const data = validacion.data

    // Actualizar proveedor
    const { data: proveedorActualizado, error } = await supabaseAdmin
      .from('proveedores')
      .update({
        ...data,
        email: data.email || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'EDITAR_PROVEEDOR',
      entidad: 'proveedores',
      entidad_id: id,
      datos_anteriores: proveedorExistente,
      datos_nuevos: proveedorActualizado,
    })

    return NextResponse.json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: proveedorActualizado,
    })
  } catch (error) {
    console.error('Error al actualizar proveedor:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar proveedor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/proveedores/[id] - Desactivar proveedor (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('proveedores.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    // Verificar que el proveedor existe
    const { data: proveedor, error: fetchError } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !proveedor) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    // Soft delete
    const { data: proveedorDesactivado, error } = await supabaseAdmin
      .from('proveedores')
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
      accion: 'DESACTIVAR_PROVEEDOR',
      entidad: 'proveedores',
      entidad_id: id,
      datos_anteriores: { activo: true },
      datos_nuevos: { activo: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Proveedor desactivado exitosamente',
      data: proveedorDesactivado,
    })
  } catch (error) {
    console.error('Error al desactivar proveedor:', error)
    return NextResponse.json(
      { success: false, error: 'Error al desactivar proveedor' },
      { status: 500 }
    )
  }
}
