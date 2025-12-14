/**
 * API: /api/recepciones/[id]
 * GET - Obtener detalle de recepción
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/recepciones/[id] - Obtener detalle de recepción (movimiento + lote)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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
        articulo: {
          select: {
            id: true,
            sku: true,
            nombre: true,
            descripcionSIGAF: true,
            unidadMedida: true,
          },
        },
        lote: {
          select: {
            id: true,
            numeroLote: true,
            cantidadInicial: true,
            cantidadDisponible: true,
            fechaVencimiento: true,
            fechaIngresoTs: true,
            proveedor: true,
            costoUnitario: true,
            ubicacion: true,
            agotado: true,
            activo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!movimiento) {
      return NextResponse.json(
        { success: false, error: 'Recepción no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: movimiento.id,
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        timestamp: movimiento.timestamp,
        anulado: movimiento.anulado,
        motivoAnulacion: movimiento.motivoAnulacion,
        articulo: movimiento.articulo,
        lote: movimiento.lote,
        usuario: movimiento.usuario,
      },
    });
  } catch (error) {
    console.error('Error al obtener recepción:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener recepción' },
      { status: 500 }
    );
  }
}
