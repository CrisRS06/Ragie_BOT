/**
 * API: GET /api/inventario
 * Lista todos los artículos con su stock actual y información de lotes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const busqueda = searchParams.get('busqueda');
    const soloConStock = searchParams.get('soloConStock') === 'true';
    const limite = parseInt(searchParams.get('limite') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtro base
    const where: any = {
      activo: true,
    };

    // Filtro de búsqueda
    if (busqueda) {
      where.OR = [
        { sku: { contains: busqueda, mode: 'insensitive' } },
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { descripcionSIGAF: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    // Obtener artículos con agregaciones de lotes
    const articulos = await prisma.articulo.findMany({
      where,
      include: {
        lotes: {
          where: {
            activo: true,
            agotado: false,
            cantidadDisponible: { gt: 0 },
          },
          select: {
            id: true,
            cantidadDisponible: true,
            fechaVencimiento: true,
          },
        },
        _count: {
          select: {
            lotes: {
              where: {
                activo: true,
                agotado: false,
                cantidadDisponible: { gt: 0 },
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
      take: limite,
      skip: offset,
    });

    // Fecha límite para alertas (30 días)
    const fechaLimiteAlerta = new Date();
    fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + 30);

    // Procesar resultados
    const inventario = articulos
      .map((articulo) => {
        const stockTotal = articulo.lotes.reduce((sum, lote) => sum + lote.cantidadDisponible, 0);

        // Contar lotes próximos a vencer
        const lotesProximosAVencer = articulo.lotes.filter(
          (lote) => lote.fechaVencimiento <= fechaLimiteAlerta
        ).length;

        // Verificar si hay lotes vencidos
        const lotesVencidos = articulo.lotes.filter(
          (lote) => lote.fechaVencimiento < new Date()
        ).length;

        return {
          id: articulo.id,
          sku: articulo.sku,
          nombre: articulo.nombre,
          descripcionSIGAF: articulo.descripcionSIGAF,
          unidadMedida: articulo.unidadMedida,
          stockMinimo: articulo.stockMinimo,
          stockTotal,
          totalLotes: articulo._count.lotes,
          lotesProximosAVencer,
          lotesVencidos,
          alertaStockBajo: articulo.stockMinimo !== null && stockTotal <= articulo.stockMinimo,
          alertaVencimiento: lotesProximosAVencer > 0 || lotesVencidos > 0,
        };
      })
      .filter((articulo) => !soloConStock || articulo.stockTotal > 0);

    // Contar total
    const total = await prisma.articulo.count({ where });

    // Estadísticas generales
    const estadisticas = {
      totalArticulos: inventario.length,
      articulosConStock: inventario.filter((a) => a.stockTotal > 0).length,
      articulosSinStock: inventario.filter((a) => a.stockTotal === 0).length,
      articulosStockBajo: inventario.filter((a) => a.alertaStockBajo).length,
      articulosConAlertaVencimiento: inventario.filter((a) => a.alertaVencimiento).length,
    };

    return NextResponse.json({
      success: true,
      inventario,
      estadisticas,
      paginacion: {
        total,
        limite,
        offset,
        paginas: Math.ceil(total / limite),
      },
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
