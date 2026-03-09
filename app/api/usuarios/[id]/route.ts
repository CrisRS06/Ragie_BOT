/**
 * API: /api/usuarios/[id]
 * GET - Obtener detalle de usuario
 * PUT - Actualizar usuario
 * DELETE - Desactivar usuario (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para actualizar
const updateUsuarioSchema = z.object({
  nombre: z.string().min(3).max(100).optional(),
  rol: z.enum(['ADMINISTRADOR', 'OPERADOR', 'AUDITOR']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/usuarios/[id] - Obtener detalle de usuario
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

    // Obtener perfil del usuario
    const { data: perfil, error } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !perfil) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener datos de auth del usuario
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)

    return NextResponse.json({
      success: true,
      data: {
        id: perfil.id,
        email: authUser?.user?.email || perfil.email,
        nombre: perfil.nombre,
        rol: perfil.rol,
        activo: perfil.activo,
        ultimo_acceso: perfil.ultimo_acceso,
        created_at: perfil.created_at,
        updated_at: perfil.updated_at,
      },
    })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/usuarios/[id] - Actualizar usuario
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('usuarios.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()

    // Validar datos
    const validacion = updateUsuarioSchema.safeParse(body)
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

    // Verificar que el usuario existe
    const { data: usuarioExistente, error: fetchError } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !usuarioExistente) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const data = validacion.data

    // Preparar datos de actualizacion
    const updateData: Record<string, unknown> = {}
    if (data.nombre) updateData.nombre = data.nombre
    if (data.rol) updateData.rol = data.rol

    // Actualizar perfil
    const { data: usuarioActualizado, error } = await supabaseAdmin
      .from('perfiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Sync role/name to auth metadata
    const authUpdate: Record<string, unknown> = {}
    if (data.nombre) authUpdate.nombre = data.nombre
    if (data.rol) authUpdate.rol = data.rol
    if (Object.keys(authUpdate).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: authUpdate,
        app_metadata: authUpdate,
      })
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'EDITAR_USUARIO',
      entidad: 'perfiles',
      entidad_id: id,
      datos_anteriores: { nombre: usuarioExistente.nombre, rol: usuarioExistente.rol },
      datos_nuevos: { nombre: usuarioActualizado.nombre, rol: usuarioActualizado.rol },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioActualizado,
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar usuario' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/usuarios/[id] - Desactivar usuario (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('usuarios.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    // Verificar que el usuario existe
    const { data: perfil, error: fetchError } = await supabaseAdmin
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !perfil) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // No permitir desactivarse a si mismo
    if (id === user.id) {
      return NextResponse.json(
        { success: false, error: 'No puede desactivar su propia cuenta' },
        { status: 400 }
      )
    }

    // Soft delete - solo desactivar
    const { data: usuarioDesactivado, error } = await supabaseAdmin
      .from('perfiles')
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
      accion: 'DESACTIVAR_USUARIO',
      entidad: 'perfiles',
      entidad_id: id,
      datos_anteriores: { activo: true },
      datos_nuevos: { activo: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      data: usuarioDesactivado,
    })
  } catch (error) {
    console.error('Error al desactivar usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al desactivar usuario' },
      { status: 500 }
    )
  }
}
