/**
 * API: GET /api/articulos/[id]/lotes-peps
 * Obtiene los lotes disponibles de un artículo en orden PEPS
 */

import { NextRequest, NextResponse } from 'next/server';
import { obtenerLotesPEPS, calcularConsumoPEPS, validarStockDisponible } from '@/lib/services/peps.service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articuloId } = await params;

    // Verificar que el artículo existe
    const articulo = await prisma.articulo.findUnique({
      where: { id: articuloId },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcionSIGAF: true,
        unidadMedida: true,
      },
    });

    if (!articulo) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Obtener lotes en orden PEPS
    const lotes = await obtenerLotesPEPS(articuloId);

    // Calcular stock total
    const stockTotal = lotes.reduce((sum, lote) => sum + lote.cantidadDisponible, 0);

    // Obtener cantidad requerida del query param (opcional)
    const cantidadRequerida = request.nextUrl.searchParams.get('cantidad');
    let sugerenciaConsumo = null;

    if (cantidadRequerida) {
      const cantidad = parseFloat(cantidadRequerida);
      if (!isNaN(cantidad) && cantidad > 0) {
        const validacion = await validarStockDisponible(articuloId, cantidad);

        if (validacion.disponible) {
          sugerenciaConsumo = {
            cantidadSolicitada: cantidad,
            consumos: calcularConsumoPEPS(lotes, cantidad),
            stockSuficiente: true,
          };
        } else {
          sugerenciaConsumo = {
            cantidadSolicitada: cantidad,
            consumos: [],
            stockSuficiente: false,
            mensaje: validacion.mensaje,
          };
        }
      }
    }

    // Agregar información de días hasta vencimiento
    const lotesConInfo = lotes.map((lote) => {
      const diasHastaVencimiento = Math.ceil(
        (lote.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...lote,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        alertaVencimiento:
          diasHastaVencimiento < 0
            ? 'VENCIDO'
            : diasHastaVencimiento <= 7
            ? 'CRITICO'
            : diasHastaVencimiento <= 15
            ? 'PROXIMO'
            : null,
      };
    });

    return NextResponse.json({
      articulo,
      stockTotal,
      totalLotes: lotes.length,
      lotes: lotesConInfo,
      sugerenciaConsumo,
    });
  } catch (error) {
    console.error('Error al obtener lotes PEPS:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
