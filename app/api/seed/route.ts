/**
 * API: /api/seed
 * Gestión simplificada de usuarios para tienda familiar
 *
 * GET - Listar usuarios (requiere ADMIN_SECRET)
 * POST - Crear usuario o ejecutar seed por defecto
 * PUT - Cambiar contraseña de usuario existente
 * DELETE - Desactivar usuario (soft delete)
 *
 * Protección: Header x-admin-secret debe coincidir con ADMIN_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, RolUsuario } from '@/lib/auth';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_EMAIL = 'admin@bodegaje.example.com';
const ADMIN_PASSWORD = 'Admin2024Secure';

// Verificar secret de administración
function checkSecret(request: NextRequest): boolean {
  if (!ADMIN_SECRET) return true; // Si no hay secret configurado, permitir (dev)
  return request.headers.get('x-admin-secret') === ADMIN_SECRET;
}

/**
 * GET /api/seed - Listar todos los usuarios
 */
export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        creadoEn: true,
      },
      orderBy: { creadoEn: 'desc' },
    });

    return NextResponse.json({
      success: true,
      usuarios,
      total: usuarios.length,
      rolesDisponibles: [
        'ADMINISTRADOR_CONTRATISTA',
        'OPERADOR_BODEGA',
        'FISCALIZADOR_EXTERNO',
        'AUDITOR',
      ],
    });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar usuarios' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seed - Crear usuario
 * Sin parámetros: crea admin por defecto
 * Con parámetros: crea usuario personalizado (requiere ADMIN_SECRET)
 */
export async function POST(request: NextRequest) {
  try {
    let body: { email?: string; nombre?: string; password?: string; rol?: string } = {};

    try {
      body = await request.json();
    } catch {
      // Sin body = crear admin por defecto
    }

    const { email, nombre, password, rol } = body;

    // Si hay parámetros, crear usuario personalizado (requiere secret)
    if (email) {
      if (!checkSecret(request)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      // Validar datos mínimos
      if (!password || password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password requerido (mínimo 6 caracteres)' },
          { status: 400 }
        );
      }

      const rolesValidos: RolUsuario[] = [
        'ADMINISTRADOR_CONTRATISTA',
        'OPERADOR_BODEGA',
        'FISCALIZADOR_EXTERNO',
        'AUDITOR',
      ];

      const rolFinal: RolUsuario = rol && rolesValidos.includes(rol as RolUsuario)
        ? (rol as RolUsuario)
        : 'OPERADOR_BODEGA';

      const passwordHash = await hashPassword(password);

      const usuario = await prisma.usuario.upsert({
        where: { email: email.toLowerCase() },
        update: {
          nombre: nombre || email.split('@')[0],
          passwordHash,
          rol: rolFinal,
          activo: true,
        },
        create: {
          email: email.toLowerCase(),
          nombre: nombre || email.split('@')[0],
          passwordHash,
          rol: rolFinal,
          activo: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Usuario creado/actualizado exitosamente',
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          activo: usuario.activo,
        },
      });
    }

    // Sin parámetros: crear admin por defecto
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    const admin = await prisma.usuario.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        passwordHash,
        activo: true,
      },
      create: {
        email: ADMIN_EMAIL,
        nombre: 'Administrador Sistema',
        passwordHash,
        rol: 'ADMINISTRADOR_CONTRATISTA',
        activo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario admin configurado exitosamente',
      user: {
        email: admin.email,
        nombre: admin.nombre,
        rol: admin.rol,
      },
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });
  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/seed - Cambiar contraseña de usuario
 */
export async function PUT(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y password requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password debe tener mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const usuario = await prisma.usuario.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      usuario: {
        email: usuario.email,
        nombre: usuario.nombre,
      },
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return NextResponse.json(
      { success: false, error: 'Usuario no encontrado o error al actualizar' },
      { status: 404 }
    );
  }
}

/**
 * DELETE /api/seed - Desactivar usuario (soft delete)
 */
export async function DELETE(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requerido' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.update({
      where: { email: email.toLowerCase() },
      data: { activo: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      usuario: {
        email: usuario.email,
        nombre: usuario.nombre,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Usuario no encontrado o error al desactivar' },
      { status: 404 }
    );
  }
}
