/**
 * API: GET /api/cortes/[id]/csv
 * Exporta un corte en formato CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { obtenerCorte, exportarCorteCSV } from '@/lib/services/cortes.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: corteId } = await params;

    const corte = await obtenerCorte(corteId);
    const csv = exportarCorteCSV(corte);

    // Nombre del archivo
    const fecha = corte.timestamp.toISOString().split('T')[0];
    const filename = `corte-${corte.tipo.toLowerCase()}-${fecha}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Corte-Hash': corte.hashSnapshot,
      },
    });
  } catch (error) {
    console.error('Error al exportar corte CSV:', error);

    if (error instanceof Error && error.message === 'Corte no encontrado') {
      return NextResponse.json(
        { error: 'Corte no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al generar CSV' },
      { status: 500 }
    );
  }
}
