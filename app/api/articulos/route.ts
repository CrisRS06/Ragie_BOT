/**
 * API: GET /api/articulos
 * Lista todos los artículos activos del sistema
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const articulos = await prisma.articulo.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcionSIGAF: true,
        unidadMedida: true,
        stockMinimo: true,
        stockMaximo: true,
        _count: {
          select: {
            lotes: {
              where: {
                activo: true,
                cantidadDisponible: { gt: 0 },
              },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    // Calcular stock total por artículo
    const articulosConStock = await Promise.all(
      articulos.map(async (articulo) => {
        const stockTotal = await prisma.lote.aggregate({
          where: {
            articuloId: articulo.id,
            activo: true,
          },
          _sum: {
            cantidadDisponible: true,
          },
        });

        return {
          ...articulo,
          stockTotal: stockTotal._sum.cantidadDisponible || 0,
          lotesActivos: articulo._count.lotes,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: articulosConStock,
      total: articulosConStock.length,
    });
  } catch (error) {
    console.error('Error al obtener artículos:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener artículos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
