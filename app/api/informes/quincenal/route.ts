/**
 * API: /api/informes/quincenal
 * GET - Generar informe quincenal de movimientos
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/informes/quincenal - Obtener informe quincenal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Obtener fechas del rango
    const fechaInicioParam = searchParams.get('fechaInicio');
    const fechaFinParam = searchParams.get('fechaFin');

    // Por defecto, últimos 15 días
    const fechaFin = fechaFinParam ? new Date(fechaFinParam) : new Date();
    const fechaInicio = fechaInicioParam
      ? new Date(fechaInicioParam)
      : new Date(fechaFin.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Ajustar fechas para incluir todo el día
    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);

    // Obtener movimientos del período
    const movimientos = await prisma.movimiento.findMany({
      where: {
        timestamp: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        anulado: false,
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
            numeroLote: true,
            fechaVencimiento: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Agrupar por tipo
    const entradas = movimientos.filter((m) => m.tipo === 'ENTRADA');
    const salidas = movimientos.filter((m) => m.tipo === 'SALIDA');
    const ajustes = movimientos.filter((m) => m.tipo === 'AJUSTE_INVENTARIO');

    // Calcular totales
    const totalEntradas = entradas.reduce((sum, m) => sum + m.cantidad, 0);
    const totalSalidas = salidas.reduce((sum, m) => sum + m.cantidad, 0);
    const totalAjustes = ajustes.reduce((sum, m) => sum + m.cantidad, 0);

    // Agrupar movimientos por artículo
    const movimientosPorArticulo = movimientos.reduce(
      (acc, m) => {
        const articuloId = m.articuloId;
        if (!acc[articuloId]) {
          acc[articuloId] = {
            articulo: m.articulo,
            entradas: 0,
            salidas: 0,
            ajustes: 0,
            movimientos: [],
          };
        }
        if (m.tipo === 'ENTRADA') acc[articuloId].entradas += m.cantidad;
        else if (m.tipo === 'SALIDA') acc[articuloId].salidas += m.cantidad;
        else if (m.tipo === 'AJUSTE_INVENTARIO') acc[articuloId].ajustes += m.cantidad;
        acc[articuloId].movimientos.push(m);
        return acc;
      },
      {} as Record<string, {
        articulo: typeof movimientos[0]['articulo'];
        entradas: number;
        salidas: number;
        ajustes: number;
        movimientos: typeof movimientos;
      }>
    );

    // Formatear datos para el informe
    const articulosResumen = Object.values(movimientosPorArticulo).map((data) => ({
      sku: data.articulo.sku,
      nombre: data.articulo.nombre,
      descripcionSIGAF: data.articulo.descripcionSIGAF,
      unidadMedida: data.articulo.unidadMedida,
      entradas: data.entradas,
      salidas: data.salidas,
      ajustes: data.ajustes,
      neto: data.entradas - data.salidas + data.ajustes,
      cantidadMovimientos: data.movimientos.length,
    }));

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: fechaInicio.toISOString(),
          fin: fechaFin.toISOString(),
          dias: Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)),
        },
        resumen: {
          totalMovimientos: movimientos.length,
          totalEntradas,
          totalSalidas,
          totalAjustes,
          articulosAfectados: Object.keys(movimientosPorArticulo).length,
        },
        articulosResumen,
        movimientosDetalle: movimientos.slice(0, 100).map((m) => ({
          id: m.id,
          tipo: m.tipo,
          fecha: m.timestamp,
          articulo: m.articulo.nombre,
          sku: m.articulo.sku,
          cantidad: m.cantidad,
          lote: m.lote?.numeroLote || '-',
          receptor: m.receptorNombre || '-',
          motivo: m.motivo || '-',
          usuario: m.usuario?.nombre || '-',
        })),
      },
    });
  } catch (error) {
    console.error('Error al generar informe quincenal:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar informe quincenal' },
      { status: 500 }
    );
  }
}
