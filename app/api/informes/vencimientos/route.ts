/**
 * API: GET /api/informes/vencimientos
 * Obtiene reporte de lotes próximos a vencer y vencidos
 */

import { NextRequest, NextResponse } from 'next/server';
import { generarReporteVencimientos } from '@/lib/services/informes.service';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const diasAnticipacion = parseInt(searchParams.get('dias') || '30');
    const incluirVencidos = searchParams.get('incluirVencidos') !== 'false';
    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const resultado = await generarReporteVencimientos({
      diasAnticipacion,
      incluirVencidos,
      generadoPorId: usuarioId,
    });

    // Agrupar por severidad
    const porSeveridad = resultado.lotes.reduce((acc, lote) => {
      const sev = lote.severidad;
      if (!acc[sev]) acc[sev] = [];
      acc[sev].push(lote);
      return acc;
    }, {} as Record<string, typeof resultado.lotes>);

    return NextResponse.json({
      success: true,
      informe: resultado.informe,
      lotes: resultado.lotes,
      porSeveridad,
      resumen: {
        total: resultado.lotes.length,
        criticos: porSeveridad['CRITICA']?.length || 0,
        altos: porSeveridad['ALTA']?.length || 0,
        medios: porSeveridad['MEDIA']?.length || 0,
        bajos: porSeveridad['BAJA']?.length || 0,
        vencidos: resultado.lotes.filter((l) => l.vencido).length,
      },
      totalAlertas: resultado.lotes.length,
    });
  } catch (error) {
    console.error('Error al generar reporte de vencimientos:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    );
  }
}
