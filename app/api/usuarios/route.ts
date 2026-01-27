/**
 * API: /api/usuarios
 * GET - Lista todos los usuarios (via Supabase Auth)
 * POST - Crear nuevo usuario (solo admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { RolUsuario } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

// Schema de validacion
const createUsuarioSchema = z.object({
  email: z.string().email('Email invalido'),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(100),
  password: z.string().min(8, 'Contrasena debe tener al menos 8 caracteres'),
  rol: z.enum(['ADMINISTRADOR', 'OPERADOR', 'AUDITOR']),
})

/**
 * GET /api/usuarios - Lista todos los usuarios
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

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      throw error
    }

    let usuarios = users.map((u) => ({
      id: u.id,
      email: u.email,
      nombre: u.user_metadata?.nombre || u.email?.split('@')[0],
      rol: u.user_metadata?.rol || 'OPERADOR',
      activo: !u.banned_until,
      ultimoAcceso: u.last_sign_in_at,
      creadoEn: u.created_at,
    }))

    if (!includeInactive) {
      usuarios = usuarios.filter((u) => u.activo)
    }

    return NextResponse.json({
      success: true,
      data: usuarios,
      total: usuarios.length,
    })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/usuarios - Crear nuevo usuario
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar datos
    const validacion = createUsuarioSchema.safeParse(body)
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

    // Crear usuario en Supabase Auth
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nombre: data.nombre,
        rol: data.rol as RolUsuario,
      },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un usuario con este email' },
          { status: 400 }
        )
      }
      throw error
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: currentUser.id,
      accion: 'CREAR_USUARIO',
      entidad: 'auth.users',
      entidad_id: newUser.user.id,
      datos_nuevos: {
        email: newUser.user.email,
        nombre: data.nombre,
        rol: data.rol,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        id: newUser.user.id,
        email: newUser.user.email,
        nombre: data.nombre,
        rol: data.rol,
        activo: true,
        creadoEn: newUser.user.created_at,
      },
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
