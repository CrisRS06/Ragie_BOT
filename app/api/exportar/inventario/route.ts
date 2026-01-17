/**
 * API: /api/exportar/inventario
 * GET - Exporta el inventario actual a Excel
 * FASE 7: Exportación a Excel
 */

import { NextResponse } from 'next/server';
import { generarExcelInventario } from '@/lib/services/excel.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buffer = await generarExcelInventario();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="inventario_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error al exportar inventario:', error);
    return NextResponse.json(
      { success: false, error: 'Error al exportar inventario' },
      { status: 500 }
    );
  }
}
