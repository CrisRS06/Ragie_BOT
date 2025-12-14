/**
 * API: GET /api/alertas/vencimientos
 * Obtiene alertas de vencimiento (FEFO informativo)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const diasAnticipacion = parseInt(searchParams.get('dias') || '30');
    const incluirVencidos = searchParams.get('incluirVencidos') !== 'false';
    const limite = parseInt(searchParams.get('limite') || '50');

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    // Construir filtro
    const where: any = {
      activo: true,
      agotado: false,
      cantidadDisponible: { gt: 0 },
    };

    if (incluirVencidos) {
      where.fechaVencimiento = { lte: fechaLimite };
    } else {
      where.fechaVencimiento = {
        gte: new Date(),
        lte: fechaLimite,
      };
    }

    // Obtener lotes con alertas
    const lotes = await prisma.lote.findMany({
      where,
      include: {
        articulo: {
          select: {
            id: true,
            sku: true,
            nombre: true,
            descripcionSIGAF: true,
            unidadMedida: true,
          },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: limite,
    });

    // Procesar alertas
    const alertas = lotes.map((lote) => {
      const diasHastaVencimiento = Math.ceil(
        (lote.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      let severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
      let mensaje: string;

      if (diasHastaVencimiento < 0) {
        severidad = 'CRITICA';
        mensaje = `VENCIDO hace ${Math.abs(diasHastaVencimiento)} días`;
      } else if (diasHastaVencimiento === 0) {
        severidad = 'CRITICA';
        mensaje = 'Vence HOY';
      } else if (diasHastaVencimiento <= 7) {
        severidad = 'ALTA';
        mensaje = `Vence en ${diasHastaVencimiento} días`;
      } else if (diasHastaVencimiento <= 15) {
        severidad = 'MEDIA';
        mensaje = `Vence en ${diasHastaVencimiento} días`;
      } else {
        severidad = 'BAJA';
        mensaje = `Vence en ${diasHastaVencimiento} días`;
      }

      return {
        id: lote.id,
        tipo: 'VENCIMIENTO',
        severidad,
        mensaje,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        lote: {
          id: lote.id,
          numeroLote: lote.numeroLote || `LOTE-${lote.id.substring(0, 8)}`,
          cantidadDisponible: lote.cantidadDisponible,
          fechaVencimiento: lote.fechaVencimiento,
          ubicacion: lote.ubicacion,
        },
        articulo: lote.articulo,
      };
    });

    // Agrupar por severidad
    const resumen = {
      total: alertas.length,
      criticas: alertas.filter((a) => a.severidad === 'CRITICA').length,
      altas: alertas.filter((a) => a.severidad === 'ALTA').length,
      medias: alertas.filter((a) => a.severidad === 'MEDIA').length,
      bajas: alertas.filter((a) => a.severidad === 'BAJA').length,
      vencidos: alertas.filter((a) => a.vencido).length,
    };

    return NextResponse.json({
      success: true,
      alertas,
      resumen,
      parametros: {
        diasAnticipacion,
        incluirVencidos,
      },
    });
  } catch (error) {
    console.error('Error al obtener alertas de vencimiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
