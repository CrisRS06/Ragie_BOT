/**
 * API: GET /api/inventario/[articuloId]/lotes
 * Obtiene los lotes de un artículo específico con información detallada
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articuloId: string }> }
) {
  try {
    const { articuloId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const incluirAgotados = searchParams.get('incluirAgotados') === 'true';
    const ordenarPor = searchParams.get('ordenarPor') || 'fechaIngresoTs'; // fechaIngresoTs | fechaVencimiento

    // Verificar que el artículo existe
    const articulo = await prisma.articulo.findUnique({
      where: { id: articuloId },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcionSIGAF: true,
        unidadMedida: true,
        stockMinimo: true,
      },
    });

    if (!articulo) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Construir filtro de lotes
    const whereLotes: any = {
      articuloId,
      activo: true,
    };

    if (!incluirAgotados) {
      whereLotes.agotado = false;
      whereLotes.cantidadDisponible = { gt: 0 };
    }

    // Ordenamiento
    const orderBy: any = {};
    if (ordenarPor === 'fechaVencimiento') {
      orderBy.fechaVencimiento = 'asc';
    } else {
      orderBy.fechaIngresoTs = 'asc'; // PEPS por defecto
    }

    // Obtener lotes
    const lotes = await prisma.lote.findMany({
      where: whereLotes,
      orderBy,
      include: {
        movimientos: {
          where: { anulado: false },
          select: {
            id: true,
            tipo: true,
            cantidad: true,
            timestamp: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 5, // Últimos 5 movimientos
        },
      },
    });

    // Procesar lotes con información adicional
    const lotesConInfo = lotes.map((lote, index) => {
      const diasHastaVencimiento = Math.ceil(
        (lote.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      let severidadVencimiento: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'OK' = 'OK';
      if (diasHastaVencimiento < 0) {
        severidadVencimiento = 'CRITICA';
      } else if (diasHastaVencimiento <= 7) {
        severidadVencimiento = 'ALTA';
      } else if (diasHastaVencimiento <= 15) {
        severidadVencimiento = 'MEDIA';
      } else if (diasHastaVencimiento <= 30) {
        severidadVencimiento = 'BAJA';
      }

      return {
        id: lote.id,
        numeroLote: lote.numeroLote || `LOTE-${lote.id.substring(0, 8)}`,
        ordenPEPS: index + 1, // Posición en la cola PEPS
        cantidadInicial: lote.cantidadInicial,
        cantidadDisponible: lote.cantidadDisponible,
        cantidadConsumida: lote.cantidadInicial - lote.cantidadDisponible,
        porcentajeConsumido: Math.round(
          ((lote.cantidadInicial - lote.cantidadDisponible) / lote.cantidadInicial) * 100
        ),
        fechaIngresoTs: lote.fechaIngresoTs,
        fechaVencimiento: lote.fechaVencimiento,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        severidadVencimiento,
        proveedor: lote.proveedor,
        costoUnitario: lote.costoUnitario,
        ubicacion: lote.ubicacion,
        agotado: lote.agotado,
        ultimosMovimientos: lote.movimientos,
      };
    });

    // Calcular estadísticas
    const stockTotal = lotesConInfo.reduce((sum, l) => sum + l.cantidadDisponible, 0);
    const lotesActivos = lotesConInfo.filter((l) => !l.agotado).length;
    const lotesVencidos = lotesConInfo.filter((l) => l.vencido).length;
    const lotesProximosAVencer = lotesConInfo.filter(
      (l) => !l.vencido && l.diasHastaVencimiento <= 30
    ).length;

    return NextResponse.json({
      success: true,
      articulo,
      lotes: lotesConInfo,
      estadisticas: {
        stockTotal,
        totalLotes: lotesConInfo.length,
        lotesActivos,
        lotesAgotados: lotesConInfo.length - lotesActivos,
        lotesVencidos,
        lotesProximosAVencer,
        alertaStockBajo: articulo.stockMinimo !== null && stockTotal <= articulo.stockMinimo,
      },
    });
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
