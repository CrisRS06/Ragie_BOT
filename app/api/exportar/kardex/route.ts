/**
 * API: /api/exportar/kardex
 * GET - Exporta el Kardex de un artículo a Excel
 * FASE 7: Exportación a Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { generarExcelKardex } from '@/lib/services/excel.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articuloId = searchParams.get('articuloId');
    const fechaDesde = searchParams.get('fechaDesde') || undefined;
    const fechaHasta = searchParams.get('fechaHasta') || undefined;

    if (!articuloId) {
      return NextResponse.json(
        { success: false, error: 'El ID del artículo es requerido' },
        { status: 400 }
      );
    }

    // Obtener info del artículo para el nombre del archivo
    const articulo = await prisma.articulo.findUnique({
      where: { id: articuloId },
      select: { sku: true },
    });

    if (!articulo) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    const buffer = await generarExcelKardex(articuloId, fechaDesde, fechaHasta);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="kardex_${articulo.sku}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error al exportar Kardex:', error);
    return NextResponse.json(
      { success: false, error: 'Error al exportar Kardex' },
      { status: 500 }
    );
  }
}
