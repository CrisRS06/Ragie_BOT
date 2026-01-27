/**
 * API: /api/seed
 * Gestion de usuarios usando Supabase Auth
 *
 * GET - Listar usuarios (requiere ADMIN_SECRET)
 * POST - Crear usuario o ejecutar seed por defecto
 * DELETE - Desactivar usuario
 *
 * Proteccion: Header x-admin-secret debe coincidir con ADMIN_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { RolUsuario } from '@/lib/supabase/auth'

const ADMIN_SECRET = process.env.ADMIN_SECRET
const ADMIN_EMAIL = 'admin@bodegaje.example.com'
const ADMIN_PASSWORD = 'Admin2024Secure'

// Verificar secret de administracion
function checkSecret(request: NextRequest): boolean {
  if (!ADMIN_SECRET) return true // Si no hay secret configurado, permitir (dev)
  return request.headers.get('x-admin-secret') === ADMIN_SECRET
}

/**
 * GET /api/seed - Listar todos los usuarios
 */
export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      throw error
    }

    const usuarios = users.map((user) => ({
      id: user.id,
      email: user.email,
      nombre: user.user_metadata?.nombre || user.email?.split('@')[0],
      rol: user.user_metadata?.rol || 'OPERADOR',
      activo: !user.banned_until,
      ultimoAcceso: user.last_sign_in_at,
      creadoEn: user.created_at,
    }))

    return NextResponse.json({
      success: true,
      usuarios,
      total: usuarios.length,
      rolesDisponibles: ['ADMINISTRADOR', 'OPERADOR', 'AUDITOR'],
    })
  } catch (error) {
    console.error('Error al listar usuarios:', error)
    return NextResponse.json(
      { success: false, error: 'Error al listar usuarios' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seed - Crear usuario
 * Sin parametros: crea admin por defecto
 * Con parametros: crea usuario personalizado (requiere ADMIN_SECRET)
 */
export async function POST(request: NextRequest) {
  try {
    let body: { email?: string; nombre?: string; password?: string; rol?: string } = {}

    try {
      body = await request.json()
    } catch {
      // Sin body = crear admin por defecto
    }

    const { email, nombre, password, rol } = body

    // Si hay parametros, crear usuario personalizado (requiere secret)
    if (email) {
      if (!checkSecret(request)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }

      // Validar datos minimos
      if (!password || password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password requerido (minimo 6 caracteres)' },
          { status: 400 }
        )
      }

      const rolesValidos: RolUsuario[] = ['ADMINISTRADOR', 'OPERADOR', 'AUDITOR']
      const rolFinal: RolUsuario = rol && rolesValidos.includes(rol as RolUsuario)
        ? (rol as RolUsuario)
        : 'OPERADOR'

      // Crear usuario en Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          nombre: nombre || email.split('@')[0],
          rol: rolFinal,
        },
      })

      if (error) {
        // Si ya existe, intentar actualizar
        if (error.message.includes('already been registered')) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = users.find((u) => u.email === email.toLowerCase())

          if (existingUser) {
            const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              existingUser.id,
              {
                password,
                user_metadata: {
                  nombre: nombre || email.split('@')[0],
                  rol: rolFinal,
                },
              }
            )

            if (updateError) {
              throw updateError
            }

            return NextResponse.json({
              success: true,
              message: 'Usuario actualizado exitosamente',
              usuario: {
                id: updated.user.id,
                email: updated.user.email,
                nombre: updated.user.user_metadata?.nombre,
                rol: updated.user.user_metadata?.rol,
              },
            })
          }
        }
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Usuario creado exitosamente',
        usuario: {
          id: data.user.id,
          email: data.user.email,
          nombre: data.user.user_metadata?.nombre,
          rol: data.user.user_metadata?.rol,
        },
      })
    }

    // Sin parametros: crear admin por defecto
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        nombre: 'Administrador Sistema',
        rol: 'ADMINISTRADOR',
      },
    })

    if (error) {
      // Si ya existe, actualizar password
      if (error.message.includes('already been registered')) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingAdmin = users.find((u) => u.email === ADMIN_EMAIL)

        if (existingAdmin) {
          await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
            password: ADMIN_PASSWORD,
          })

          return NextResponse.json({
            success: true,
            message: 'Usuario admin actualizado exitosamente',
            user: {
              email: ADMIN_EMAIL,
              nombre: 'Administrador Sistema',
              rol: 'ADMINISTRADOR',
            },
            credentials: {
              email: ADMIN_EMAIL,
              password: ADMIN_PASSWORD,
            },
          })
        }
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario admin creado exitosamente',
      user: {
        email: data.user.email,
        nombre: data.user.user_metadata?.nombre,
        rol: data.user.user_metadata?.rol,
      },
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    })
  } catch (error) {
    console.error('Error en seed:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/seed - Desactivar usuario (ban)
 */
export async function DELETE(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requerido' },
        { status: 400 }
      )
    }

    // Buscar usuario
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const user = users.find((u) => u.email === email.toLowerCase())

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Ban al usuario (soft delete)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      ban_duration: '876000h', // ~100 years
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      usuario: {
        email: user.email,
        nombre: user.user_metadata?.nombre,
        activo: false,
      },
    })
  } catch (error) {
    console.error('Error al desactivar usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Usuario no encontrado o error al desactivar' },
      { status: 404 }
    )
  }
}
