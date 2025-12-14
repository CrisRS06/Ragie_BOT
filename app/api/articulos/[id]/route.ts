/**
 * API: /api/articulos/[id]
 * GET - Obtener detalle de artículo
 * PUT - Actualizar artículo
 * DELETE - Desactivar artículo (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación para actualizar artículo
const updateArticuloSchema = z.object({
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200).optional(),
  descripcionSIGAF: z.string().min(10, 'Descripción SIGAF debe tener al menos 10 caracteres').max(500).optional(),
  unidadMedida: z.enum(['UNIDAD', 'KG', 'LITRO', 'METRO', 'CAJA', 'PAQUETE', 'BOLSA', 'ROLLO', 'GALON', 'LIBRA']).optional(),
  stockMinimo: z.number().min(0).optional(),
  stockMaximo: z.number().min(0).optional().nullable(),
  codigoSIGAF: z.string().max(50).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/articulos/[id] - Obtener detalle de artículo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const articulo = await prisma.articulo.findUnique({
      where: { id },
      include: {
        lotes: {
          where: { activo: true },
          orderBy: { fechaIngresoTs: 'asc' },
          select: {
            id: true,
            numeroLote: true,
            cantidadInicial: true,
            cantidadDisponible: true,
            fechaVencimiento: true,
            fechaIngresoTs: true,
            proveedor: true,
            ubicacion: true,
            agotado: true,
          },
        },
        _count: {
          select: {
            lotes: { where: { activo: true } },
            movimientos: true,
          },
        },
      },
    });

    if (!articulo) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Calcular stock total
    const stockTotal = articulo.lotes.reduce(
      (sum, lote) => sum + lote.cantidadDisponible,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ...articulo,
        stockTotal,
        lotesActivos: articulo._count.lotes,
        totalMovimientos: articulo._count.movimientos,
      },
    });
  } catch (error) {
    console.error('Error al obtener artículo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener artículo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/articulos/[id] - Actualizar artículo
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos
    const validacion = updateArticuloSchema.safeParse(body);
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

    // Verificar que el artículo existe
    const articuloExistente = await prisma.articulo.findUnique({
      where: { id },
    });

    if (!articuloExistente) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
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

    // Validar que stockMaximo >= stockMinimo si ambos están definidos
    const stockMinimo = data.stockMinimo ?? articuloExistente.stockMinimo;
    const stockMaximo = data.stockMaximo ?? articuloExistente.stockMaximo;

    if (stockMaximo !== null && stockMinimo !== null && stockMaximo < stockMinimo) {
      return NextResponse.json(
        { success: false, error: 'Stock máximo no puede ser menor al stock mínimo' },
        { status: 400 }
      );
    }

    // Actualizar artículo (actualizadoEn se actualiza automáticamente)
    const articuloActualizado = await prisma.articulo.update({
      where: { id },
      data,
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'EDITAR_ARTICULO',
      entidad: 'Articulo',
      entidadId: id,
      estadoAnterior: articuloExistente,
      estadoNuevo: articuloActualizado,
    });

    return NextResponse.json({
      success: true,
      message: 'Artículo actualizado exitosamente',
      data: articuloActualizado,
    });
  } catch (error) {
    console.error('Error al actualizar artículo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar artículo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articulos/[id] - Desactivar artículo (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar que el artículo existe
    const articulo = await prisma.articulo.findUnique({
      where: { id },
      include: {
        lotes: {
          where: {
            activo: true,
            cantidadDisponible: { gt: 0 },
          },
        },
      },
    });

    if (!articulo) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no tiene stock activo
    if (articulo.lotes.length > 0) {
      const stockTotal = articulo.lotes.reduce(
        (sum, lote) => sum + lote.cantidadDisponible,
        0
      );
      return NextResponse.json(
        {
          success: false,
          error: `No se puede desactivar: el artículo tiene ${stockTotal} unidades en stock`,
        },
        { status: 400 }
      );
    }

    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Soft delete - solo desactivar (actualizadoEn se actualiza automáticamente)
    const articuloDesactivado = await prisma.articulo.update({
      where: { id },
      data: {
        activo: false,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'DESACTIVAR_ARTICULO',
      entidad: 'Articulo',
      entidadId: id,
      estadoAnterior: { activo: true },
      estadoNuevo: { activo: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Artículo desactivado exitosamente',
      data: articuloDesactivado,
    });
  } catch (error) {
    console.error('Error al desactivar artículo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar artículo' },
      { status: 500 }
    );
  }
}
