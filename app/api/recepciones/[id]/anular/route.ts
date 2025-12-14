/**
 * API: POST /api/recepciones/[id]/anular
 * Anular una recepción existente
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const anularRecepcionSchema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/recepciones/[id]/anular - Anular recepción
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar motivo
    const validacion = anularRecepcionSchema.safeParse(body);
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

    const { motivo } = validacion.data;
    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Buscar el movimiento de entrada
    const movimiento = await prisma.movimiento.findFirst({
      where: {
        OR: [
          { id },
          { loteId: id },
        ],
        tipo: 'ENTRADA',
      },
      include: {
        lote: true,
        articulo: true,
      },
    });

    if (!movimiento) {
      return NextResponse.json(
        { success: false, error: 'Recepción no encontrada' },
        { status: 404 }
      );
    }

    if (movimiento.anulado) {
      return NextResponse.json(
        { success: false, error: 'Esta recepción ya está anulada' },
        { status: 400 }
      );
    }

    // Verificar que el lote no ha sido consumido
    if (movimiento.lote) {
      const cantidadConsumida =
        movimiento.lote.cantidadInicial - movimiento.lote.cantidadDisponible;

      if (cantidadConsumida > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `No se puede anular: ya se han despachado ${cantidadConsumida} unidades de este lote`,
          },
          { status: 400 }
        );
      }
    }

    // Ejecutar anulación en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Anular el movimiento
      const movimientoAnulado = await tx.movimiento.update({
        where: { id: movimiento.id },
        data: {
          anulado: true,
          motivoAnulacion: motivo,
        },
      });

      // 2. Desactivar el lote si existe
      if (movimiento.lote) {
        await tx.lote.update({
          where: { id: movimiento.lote.id },
          data: {
            activo: false,
            cantidadDisponible: 0,
            agotado: true,
          },
        });
      }

      // 3. Crear movimiento de ajuste para dejar registro
      await tx.movimiento.create({
        data: {
          articuloId: movimiento.articuloId,
          loteId: movimiento.loteId,
          tipo: 'AJUSTE_INVENTARIO',
          cantidad: -movimiento.cantidad,
          unidadMedida: movimiento.unidadMedida,
          usuarioId,
          motivo: `Anulación de recepción: ${motivo} (Saldo anterior: ${movimiento.cantidad}, Saldo nuevo: 0)`,
        },
      });

      return movimientoAnulado;
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'ANULAR_RECEPCION',
      entidad: 'Movimiento',
      entidadId: movimiento.id,
      estadoAnterior: {
        anulado: false,
        loteActivo: true,
        cantidad: movimiento.cantidad,
      },
      estadoNuevo: {
        anulado: true,
        loteActivo: false,
        motivo,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Recepción anulada exitosamente',
      data: resultado,
    });
  } catch (error) {
    console.error('Error al anular recepción:', error);
    return NextResponse.json(
      { success: false, error: 'Error al anular recepción' },
      { status: 500 }
    );
  }
}
