/**
 * API: /api/exportar/valor-bodega
 * GET - Exporta el valor de bodega a Excel
 * FASE 7: Exportación a Excel
 */

import { NextResponse } from 'next/server';
import { generarExcelValorBodega } from '@/lib/services/excel.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buffer = await generarExcelValorBodega();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="valor_bodega_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error al exportar valor de bodega:', error);
    return NextResponse.json(
      { success: false, error: 'Error al exportar valor de bodega' },
      { status: 500 }
    );
  }
}
