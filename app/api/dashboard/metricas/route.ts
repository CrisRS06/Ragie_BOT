/**
 * API: GET /api/dashboard/metricas
 * Obtiene métricas en tiempo real para el dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fecha actual y rangos
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const fecha30Dias = new Date();
    fecha30Dias.setDate(fecha30Dias.getDate() + 30);

    // Ejecutar todas las consultas en paralelo
    const [
      totalArticulos,
      articulosConStock,
      movimientosMes,
      lotesProximosVencer,
      lotesVencidos,
      cortesAnio,
      ultimosMovimientos,
      stockBajo,
    ] = await Promise.all([
      // Total de artículos activos
      prisma.articulo.count({ where: { activo: true } }),

      // Artículos con stock
      prisma.articulo.count({
        where: {
          activo: true,
          lotes: {
            some: {
              activo: true,
              agotado: false,
              cantidadDisponible: { gt: 0 },
            },
          },
        },
      }),

      // Movimientos del mes actual
      prisma.movimiento.count({
        where: {
          timestamp: { gte: inicioMes, lte: finMes },
          anulado: false,
        },
      }),

      // Lotes próximos a vencer (30 días)
      prisma.lote.count({
        where: {
          activo: true,
          agotado: false,
          cantidadDisponible: { gt: 0 },
          fechaVencimiento: {
            gte: hoy,
            lte: fecha30Dias,
          },
        },
      }),

      // Lotes ya vencidos
      prisma.lote.count({
        where: {
          activo: true,
          agotado: false,
          cantidadDisponible: { gt: 0 },
          fechaVencimiento: { lt: hoy },
        },
      }),

      // Cortes del año actual
      prisma.corte.count({
        where: {
          timestamp: {
            gte: new Date(hoy.getFullYear(), 0, 1),
          },
        },
      }),

      // Últimos 10 movimientos
      prisma.movimiento.findMany({
        where: { anulado: false },
        include: {
          articulo: {
            select: { sku: true, nombre: true },
          },
          usuario: {
            select: { nombre: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),

      // Artículos con stock bajo
      prisma.articulo.findMany({
        where: {
          activo: true,
          stockMinimo: { gt: 0 },
        },
        include: {
          lotes: {
            where: {
              activo: true,
              agotado: false,
              cantidadDisponible: { gt: 0 },
            },
            select: { cantidadDisponible: true },
          },
        },
      }),
    ]);

    // Calcular artículos con stock bajo
    const articulosStockBajo = stockBajo.filter((articulo) => {
      if (articulo.stockMinimo === null) return false;
      const stockTotal = articulo.lotes.reduce((sum, l) => sum + l.cantidadDisponible, 0);
      return stockTotal <= articulo.stockMinimo;
    }).length;

    // Calcular tendencia de movimientos (comparar con mes anterior)
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    const movimientosMesAnterior = await prisma.movimiento.count({
      where: {
        timestamp: { gte: inicioMesAnterior, lte: finMesAnterior },
        anulado: false,
      },
    });

    const tendenciaMovimientos = movimientosMesAnterior > 0
      ? Math.round(((movimientosMes - movimientosMesAnterior) / movimientosMesAnterior) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      metricas: {
        articulos: {
          total: totalArticulos,
          conStock: articulosConStock,
          sinStock: totalArticulos - articulosConStock,
          stockBajo: articulosStockBajo,
        },
        movimientos: {
          mes: movimientosMes,
          tendencia: tendenciaMovimientos,
        },
        vencimientos: {
          proximosAVencer: lotesProximosVencer,
          vencidos: lotesVencidos,
          totalAlertas: lotesProximosVencer + lotesVencidos,
        },
        cortes: {
          anioActual: cortesAnio,
        },
      },
      ultimosMovimientos: ultimosMovimientos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        cantidad: m.cantidad,
        timestamp: m.timestamp,
        articulo: m.articulo,
        usuario: m.usuario?.nombre || 'Sistema',
      })),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
