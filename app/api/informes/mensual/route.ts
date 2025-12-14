/**
 * API: /api/informes/mensual
 * GET - Obtener informe mensual existente
 * POST - Generar nuevo informe mensual
 */

import { NextRequest, NextResponse } from 'next/server';
import { generarInformeMensual, verificarNecesidadInformeMensual } from '@/lib/services/informes.service';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    // Obtener informes existentes
    const where: any = {
      tipo: 'MENSUAL_INVENTARIO',
    };

    if (mes && anio) {
      const inicio = new Date(parseInt(anio), parseInt(mes) - 1, 1);
      const fin = new Date(parseInt(anio), parseInt(mes), 0);
      where.periodoInicio = { gte: inicio };
      where.periodoFin = { lte: fin };
    }

    const informes = await prisma.informe.findMany({
      where,
      orderBy: { periodoInicio: 'desc' },
      take: 12,
    });

    // Verificar necesidad de informe
    const necesidad = await verificarNecesidadInformeMensual();

    return NextResponse.json({
      success: true,
      informes,
      necesidad,
    });
  } catch (error) {
    console.error('Error al obtener informes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuarioId = getCurrentUserId();

    const resultado = await generarInformeMensual({
      generadoPorId: usuarioId,
    });

    return NextResponse.json({
      success: true,
      informe: resultado.informe,
      firma: resultado.firma,
      totalArticulos: resultado.datos.length,
      mensaje: `Informe mensual generado exitosamente con ${resultado.datos.length} artículos`,
    });
  } catch (error) {
    console.error('Error al generar informe:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al generar informe' },
      { status: 500 }
    );
  }
}
