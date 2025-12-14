/**
 * API: /api/ajustes
 * POST - Crear ajuste de inventario
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación
const createAjusteSchema = z.object({
  articuloId: z.string().min(1, 'Artículo requerido'),
  loteId: z.string().min(1, 'Lote requerido'),
  tipoAjuste: z.enum(['INCREMENTO', 'DECREMENTO']),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
});

/**
 * POST /api/ajustes - Crear ajuste de inventario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validacion = createAjusteSchema.safeParse(body);
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

    const { articuloId, loteId, tipoAjuste, cantidad, motivo } = validacion.data;
    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el lote existe y pertenece al artículo
    const lote = await prisma.lote.findFirst({
      where: {
        id: loteId,
        articuloId,
        activo: true,
      },
      include: {
        articulo: true,
      },
    });

    if (!lote) {
      return NextResponse.json(
        { success: false, error: 'Lote no encontrado o no pertenece al artículo' },
        { status: 404 }
      );
    }

    // Calcular la cantidad ajustada
    const cantidadAjuste = tipoAjuste === 'INCREMENTO' ? cantidad : -cantidad;

    // Verificar que no quede negativo
    if (lote.cantidadDisponible + cantidadAjuste < 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede reducir más de ${lote.cantidadDisponible} unidades disponibles`,
        },
        { status: 400 }
      );
    }

    // Ejecutar ajuste en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const saldoAnterior = lote.cantidadDisponible;
      const saldoNuevo = saldoAnterior + cantidadAjuste;

      // Actualizar lote
      const loteActualizado = await tx.lote.update({
        where: { id: loteId },
        data: {
          cantidadDisponible: saldoNuevo,
          agotado: saldoNuevo === 0,
        },
      });

      // Crear movimiento de ajuste
      const movimiento = await tx.movimiento.create({
        data: {
          articuloId,
          loteId,
          tipo: 'AJUSTE_INVENTARIO',
          cantidad: cantidadAjuste,
          unidadMedida: lote.articulo.unidadMedida,
          usuarioId,
          motivo: `${motivo} (Saldo anterior: ${saldoAnterior}, Saldo nuevo: ${saldoNuevo})`,
        },
      });

      return {
        movimiento,
        lote: loteActualizado,
        saldoAnterior,
        saldoNuevo,
      };
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'AJUSTE_INVENTARIO',
      entidad: 'Movimiento',
      entidadId: resultado.movimiento.id,
      estadoAnterior: {
        loteId,
        cantidadDisponible: resultado.saldoAnterior,
      },
      estadoNuevo: {
        loteId,
        cantidadDisponible: resultado.saldoNuevo,
        tipoAjuste,
        cantidad: cantidadAjuste,
        motivo,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ajuste realizado exitosamente. Saldo anterior: ${resultado.saldoAnterior}, Saldo nuevo: ${resultado.saldoNuevo}`,
      data: {
        movimientoId: resultado.movimiento.id,
        saldoAnterior: resultado.saldoAnterior,
        saldoNuevo: resultado.saldoNuevo,
        cantidadAjustada: cantidadAjuste,
      },
    });
  } catch (error) {
    console.error('Error al crear ajuste:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear ajuste de inventario' },
      { status: 500 }
    );
  }
}
