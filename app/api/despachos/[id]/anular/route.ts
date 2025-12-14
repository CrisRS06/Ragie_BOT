/**
 * API: POST /api/despachos/[id]/anular
 * Anular un despacho existente y revertir el stock
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const anularDespachoSchema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/despachos/[id]/anular - Anular despacho y revertir stock
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar motivo
    const validacion = anularDespachoSchema.safeParse(body);
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

    // Buscar el despacho por ID del movimiento
    const movimientos = await prisma.movimiento.findMany({
      where: {
        id,
        tipo: 'SALIDA',
        anulado: false,
      },
      include: {
        lote: true,
        articulo: true,
      },
    });

    if (movimientos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Despacho no encontrado o ya anulado' },
        { status: 404 }
      );
    }

    // Ejecutar anulación en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const lotesRevertidos: Array<{ loteId: string; cantidad: number }> = [];

      for (const movimiento of movimientos) {
        // 1. Anular el movimiento de salida
        await tx.movimiento.update({
          where: { id: movimiento.id },
          data: {
            anulado: true,
            motivoAnulacion: motivo,
          },
        });

        // 2. Revertir el stock al lote
        if (movimiento.lote) {
          const loteActualizado = await tx.lote.update({
            where: { id: movimiento.lote.id },
            data: {
              cantidadDisponible: {
                increment: movimiento.cantidad,
              },
              agotado: false, // El lote ya no está agotado
            },
          });

          lotesRevertidos.push({
            loteId: movimiento.lote.id,
            cantidad: movimiento.cantidad,
          });

          // 3. Crear movimiento de ajuste para registro
          await tx.movimiento.create({
            data: {
              articuloId: movimiento.articuloId,
              loteId: movimiento.loteId,
              tipo: 'AJUSTE_INVENTARIO',
              cantidad: movimiento.cantidad, // Positivo porque es reversión
              unidadMedida: movimiento.unidadMedida,
              usuarioId,
              motivo: `Reversión por anulación de despacho: ${motivo} (Saldo anterior: ${movimiento.lote.cantidadDisponible}, Saldo nuevo: ${loteActualizado.cantidadDisponible})`,
            },
          });
        }
      }

      return {
        movimientosAnulados: movimientos.length,
        lotesRevertidos,
      };
    });

    // Calcular totales para respuesta
    const cantidadTotalRevertida = resultado.lotesRevertidos.reduce(
      (sum, l) => sum + l.cantidad,
      0
    );

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'ANULAR_DESPACHO',
      entidad: 'Movimiento',
      entidadId: id,
      estadoAnterior: {
        movimientos: movimientos.length,
        cantidadTotal: cantidadTotalRevertida,
      },
      estadoNuevo: {
        anulado: true,
        motivo,
        lotesRevertidos: resultado.lotesRevertidos,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Despacho anulado exitosamente. Se revirtieron ${cantidadTotalRevertida} unidades a ${resultado.lotesRevertidos.length} lote(s).`,
      data: {
        movimientosAnulados: resultado.movimientosAnulados,
        cantidadRevertida: cantidadTotalRevertida,
        lotesRevertidos: resultado.lotesRevertidos,
      },
    });
  } catch (error) {
    console.error('Error al anular despacho:', error);
    return NextResponse.json(
      { success: false, error: 'Error al anular despacho' },
      { status: 500 }
    );
  }
}
