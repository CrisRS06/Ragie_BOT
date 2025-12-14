/**
 * API: /api/unidades-receptoras/[id]
 * GET - Obtener detalle de unidad receptora
 * PUT - Actualizar unidad receptora
 * DELETE - Desactivar unidad receptora (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación para actualizar
const updateUnidadReceptoraSchema = z.object({
  nombre: z.string().min(3).max(200).optional(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/unidades-receptoras/[id] - Obtener detalle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const unidad = await prisma.unidadReceptora.findUnique({
      where: { id },
    });

    if (!unidad) {
      return NextResponse.json(
        { success: false, error: 'Unidad receptora no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: unidad,
    });
  } catch (error) {
    console.error('Error al obtener unidad receptora:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener unidad receptora' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/unidades-receptoras/[id] - Actualizar
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos
    const validacion = updateUnidadReceptoraSchema.safeParse(body);
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

    // Verificar que existe
    const unidadExistente = await prisma.unidadReceptora.findUnique({
      where: { id },
    });

    if (!unidadExistente) {
      return NextResponse.json(
        { success: false, error: 'Unidad receptora no encontrada' },
        { status: 404 }
      );
    }

    const usuarioId = getCurrentUserId();
    const data = validacion.data;

    // Actualizar
    const unidadActualizada = await prisma.unidadReceptora.update({
      where: { id },
      data,
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'EDITAR_UNIDAD_RECEPTORA',
      entidad: 'UnidadReceptora',
      entidadId: id,
      estadoAnterior: unidadExistente,
      estadoNuevo: unidadActualizada,
    });

    return NextResponse.json({
      success: true,
      message: 'Unidad receptora actualizada exitosamente',
      data: unidadActualizada,
    });
  } catch (error) {
    console.error('Error al actualizar unidad receptora:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar unidad receptora' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/unidades-receptoras/[id] - Desactivar (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar que existe
    const unidad = await prisma.unidadReceptora.findUnique({
      where: { id },
    });

    if (!unidad) {
      return NextResponse.json(
        { success: false, error: 'Unidad receptora no encontrada' },
        { status: 404 }
      );
    }

    const usuarioId = getCurrentUserId();

    // Soft delete
    const unidadDesactivada = await prisma.unidadReceptora.update({
      where: { id },
      data: { activo: false },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'DESACTIVAR_UNIDAD_RECEPTORA',
      entidad: 'UnidadReceptora',
      entidadId: id,
      estadoAnterior: { activo: true },
      estadoNuevo: { activo: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Unidad receptora desactivada exitosamente',
      data: unidadDesactivada,
    });
  } catch (error) {
    console.error('Error al desactivar unidad receptora:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar unidad receptora' },
      { status: 500 }
    );
  }
}
