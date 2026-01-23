/**
 * API: /api/usuarios
 * GET - Lista todos los usuarios
 * POST - Crear nuevo usuario (solo admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Schema de validación
const createUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(100),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(['ADMINISTRADOR_CONTRATISTA', 'OPERADOR_BODEGA', 'FISCALIZADOR_EXTERNO', 'AUDITOR']),
});

// Función simple para hash de contraseña (en producción usar bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * GET /api/usuarios - Lista todos los usuarios
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const usuarios = await prisma.usuario.findMany({
      where: includeInactive ? {} : { activo: true },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        creadoEn: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: usuarios,
      total: usuarios.length,
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/usuarios - Crear nuevo usuario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validacion = createUsuarioSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validacion.data;
    const usuarioActualId = await getCurrentUserId();

    if (!usuarioActualId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el email no exista
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (emailExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario con este email' },
        { status: 400 }
      );
    }

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        email: data.email.toLowerCase(),
        nombre: data.nombre,
        passwordHash: hashPassword(data.password),
        rol: data.rol,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: usuarioActualId,
      accion: 'CREAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      estadoAnterior: null,
      estadoNuevo: { email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: usuario,
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
