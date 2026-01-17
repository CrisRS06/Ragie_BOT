/**
 * API: /api/exportar/entregas-albergue
 * GET - Exporta las entregas por albergue a Excel
 * FASE 7: Exportación a Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { generarExcelEntregasPorAlbergue } from '@/lib/services/excel.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fechaDesde') || undefined;
    const fechaHasta = searchParams.get('fechaHasta') || undefined;

    const buffer = await generarExcelEntregasPorAlbergue(fechaDesde, fechaHasta);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="entregas_albergue_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error al exportar entregas por albergue:', error);
    return NextResponse.json(
      { success: false, error: 'Error al exportar entregas por albergue' },
      { status: 500 }
    );
  }
}
