/**
 * API: /api/proveedores/[id]
 * GET - Obtener detalle de proveedor
 * PUT - Actualizar proveedor
 * DELETE - Desactivar proveedor (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación para actualizar
const updateProveedorSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  ruc: z.string().max(20).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  contacto: z.string().max(100).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proveedores/[id] - Obtener detalle de proveedor
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
    });

    if (!proveedor) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: proveedor,
    });
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener proveedor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/proveedores/[id] - Actualizar proveedor
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos
    const validacion = updateProveedorSchema.safeParse(body);
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

    // Verificar que el proveedor existe
    const proveedorExistente = await prisma.proveedor.findUnique({
      where: { id },
    });

    if (!proveedorExistente) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const data = validacion.data;

    // Actualizar proveedor
    const proveedorActualizado = await prisma.proveedor.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'EDITAR_PROVEEDOR',
      entidad: 'Proveedor',
      entidadId: id,
      estadoAnterior: proveedorExistente,
      estadoNuevo: proveedorActualizado,
    });

    return NextResponse.json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: proveedorActualizado,
    });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar proveedor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proveedores/[id] - Desactivar proveedor (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar que el proveedor existe
    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
    });

    if (!proveedor) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Soft delete
    const proveedorDesactivado = await prisma.proveedor.update({
      where: { id },
      data: { activo: false },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'DESACTIVAR_PROVEEDOR',
      entidad: 'Proveedor',
      entidadId: id,
      estadoAnterior: { activo: true },
      estadoNuevo: { activo: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Proveedor desactivado exitosamente',
      data: proveedorDesactivado,
    });
  } catch (error) {
    console.error('Error al desactivar proveedor:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar proveedor' },
      { status: 500 }
    );
  }
}
