/**
 * API: /api/usuarios/[id]
 * GET - Obtener detalle de usuario
 * PUT - Actualizar usuario
 * DELETE - Desactivar usuario (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Schema de validación para actualizar
const updateUsuarioSchema = z.object({
  nombre: z.string().min(3).max(100).optional(),
  rol: z.enum(['ADMINISTRADOR_CONTRATISTA', 'OPERADOR_BODEGA', 'FISCALIZADOR_EXTERNO', 'AUDITOR']).optional(),
  password: z.string().min(8).optional(),
});

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/usuarios/[id] - Obtener detalle de usuario
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: usuario,
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/usuarios/[id] - Actualizar usuario
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos
    const validacion = updateUsuarioSchema.safeParse(body);
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

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const usuarioActualId = await getCurrentUserId();

    if (!usuarioActualId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const data = validacion.data;

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {};
    if (data.nombre) updateData.nombre = data.nombre;
    if (data.rol) updateData.rol = data.rol;
    if (data.password) updateData.passwordHash = hashPassword(data.password);

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: usuarioActualId,
      accion: 'EDITAR_USUARIO',
      entidad: 'Usuario',
      entidadId: id,
      estadoAnterior: { nombre: usuarioExistente.nombre, rol: usuarioExistente.rol },
      estadoNuevo: { nombre: usuarioActualizado.nombre, rol: usuarioActualizado.rol },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioActualizado,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usuarios/[id] - Desactivar usuario (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar que el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const usuarioActualId = await getCurrentUserId();

    if (!usuarioActualId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // No permitir desactivarse a sí mismo
    if (id === usuarioActualId) {
      return NextResponse.json(
        { success: false, error: 'No puede desactivar su propia cuenta' },
        { status: 400 }
      );
    }

    // Soft delete
    const usuarioDesactivado = await prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: usuarioActualId,
      accion: 'DESACTIVAR_USUARIO',
      entidad: 'Usuario',
      entidadId: id,
      estadoAnterior: { activo: true },
      estadoNuevo: { activo: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      data: usuarioDesactivado,
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar usuario' },
      { status: 500 }
    );
  }
}
