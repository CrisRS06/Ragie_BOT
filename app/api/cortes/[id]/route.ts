/**
 * API: GET /api/cortes/[id]
 * Obtiene el detalle de un corte específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { obtenerCorte } from '@/lib/services/cortes.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: corteId } = await params;

    const corte = await obtenerCorte(corteId);

    // Agrupar detalles por artículo para mejor visualización
    const detallesPorArticulo = corte.detalles.reduce((acc, detalle) => {
      const key = detalle.articuloId;
      if (!acc[key]) {
        acc[key] = {
          articuloId: detalle.articuloId,
          articuloSku: detalle.articuloSku,
          articuloNombre: detalle.articuloNombre,
          articuloDescripcionSIGAF: detalle.articuloDescripcionSIGAF,
          unidadMedida: detalle.unidadMedida,
          totalCantidad: 0,
          lotes: [],
        };
      }
      acc[key].totalCantidad += detalle.cantidad;
      acc[key].lotes.push({
        loteId: detalle.loteId,
        cantidad: detalle.cantidad,
        fechaVencimiento: detalle.fechaVencimiento,
        ubicacion: detalle.ubicacion,
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      corte: {
        id: corte.id,
        tipo: corte.tipo,
        timestamp: corte.timestamp,
        motivo: corte.motivo,
        hashSnapshot: corte.hashSnapshot,
        totalArticulos: corte.totalArticulos,
        totalLotes: corte.totalLotes,
        periodoInicio: corte.periodoInicio,
        periodoFin: corte.periodoFin,
        completado: corte.completado,
        solicitadoPor: corte.solicitadoPor,
      },
      detalles: corte.detalles,
      detallesPorArticulo: Object.values(detallesPorArticulo),
      resumen: {
        totalArticulos: Object.keys(detallesPorArticulo).length,
        totalLotes: corte.detalles.length,
        totalUnidades: corte.detalles.reduce((sum, d) => sum + d.cantidad, 0),
      },
    });
  } catch (error) {
    console.error('Error al obtener corte:', error);

    if (error instanceof Error && error.message === 'Corte no encontrado') {
      return NextResponse.json(
        { error: 'Corte no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
