/**
 * API: /api/reportes/valor-bodega
 * GET - Obtiene el valor total del inventario en bodega
 * FASE 5: Reporte para INS (seguros) y control interno
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ArticuloValorizado {
  id: string;
  sku: string;
  nombre: string;
  marca: string | null;
  unidadMedida: string;
  ivaPercent: number;
  cantidadTotal: number;
  valorSinIva: number;
  valorIva: number;
  valorConIva: number;
  lotes: Array<{
    id: string;
    numeroLote: string | null;
    cantidadDisponible: number;
    costoUnitario: number | null;
    fechaVencimiento: Date;
    valorSinIva: number;
    valorIva: number;
    valorConIva: number;
  }>;
}

/**
 * GET /api/reportes/valor-bodega
 * Calcula el valor total del inventario usando costos PEPS
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incluirDetalleLotes = searchParams.get('detalle') === 'true';
    const soloConStock = searchParams.get('soloConStock') !== 'false';

    // Obtener todos los artículos con sus lotes activos
    const articulos = await prisma.articulo.findMany({
      where: {
        activo: true,
      },
      include: {
        lotes: {
          where: soloConStock ? {
            activo: true,
            agotado: false,
            cantidadDisponible: { gt: 0 },
          } : {
            activo: true,
          },
          orderBy: { fechaIngresoTs: 'asc' },
          select: {
            id: true,
            numeroLote: true,
            cantidadDisponible: true,
            costoUnitario: true,
            fechaVencimiento: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    // Calcular valorización por artículo
    const articulosValorizados: ArticuloValorizado[] = [];
    let totalGeneralSinIva = 0;
    let totalGeneralIva = 0;
    let totalGeneralConIva = 0;
    let totalArticulosConStock = 0;
    let totalLotes = 0;

    for (const articulo of articulos) {
      if (articulo.lotes.length === 0 && soloConStock) continue;

      let cantidadTotal = 0;
      let valorArticuloSinIva = 0;
      let valorArticuloIva = 0;
      let valorArticuloConIva = 0;

      const lotesValorizados = articulo.lotes.map((lote) => {
        const costoUnitario = lote.costoUnitario || 0;
        const valorLoteSinIva = lote.cantidadDisponible * costoUnitario;
        const valorLoteIva = valorLoteSinIva * (articulo.ivaPercent || 0);
        const valorLoteConIva = valorLoteSinIva + valorLoteIva;

        cantidadTotal += lote.cantidadDisponible;
        valorArticuloSinIva += valorLoteSinIva;
        valorArticuloIva += valorLoteIva;
        valorArticuloConIva += valorLoteConIva;
        totalLotes++;

        return {
          id: lote.id,
          numeroLote: lote.numeroLote,
          cantidadDisponible: lote.cantidadDisponible,
          costoUnitario: lote.costoUnitario,
          fechaVencimiento: lote.fechaVencimiento,
          valorSinIva: valorLoteSinIva,
          valorIva: valorLoteIva,
          valorConIva: valorLoteConIva,
        };
      });

      totalGeneralSinIva += valorArticuloSinIva;
      totalGeneralIva += valorArticuloIva;
      totalGeneralConIva += valorArticuloConIva;

      if (cantidadTotal > 0) {
        totalArticulosConStock++;
      }

      articulosValorizados.push({
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        marca: articulo.marca,
        unidadMedida: articulo.unidadMedida,
        ivaPercent: articulo.ivaPercent,
        cantidadTotal,
        valorSinIva: valorArticuloSinIva,
        valorIva: valorArticuloIva,
        valorConIva: valorArticuloConIva,
        lotes: incluirDetalleLotes ? lotesValorizados : [],
      });
    }

    // Preparar respuesta
    const respuesta = {
      success: true,
      fechaReporte: new Date().toISOString(),
      resumen: {
        totalArticulos: articulosValorizados.length,
        totalArticulosConStock,
        totalLotes,
        valorTotalSinIva: Math.round(totalGeneralSinIva * 100) / 100,
        valorTotalIva: Math.round(totalGeneralIva * 100) / 100,
        valorTotalConIva: Math.round(totalGeneralConIva * 100) / 100,
        moneda: 'CRC', // Colones costarricenses
      },
      articulos: articulosValorizados.map((art) => ({
        ...art,
        valorSinIva: Math.round(art.valorSinIva * 100) / 100,
        valorIva: Math.round(art.valorIva * 100) / 100,
        valorConIva: Math.round(art.valorConIva * 100) / 100,
        lotes: art.lotes.map((lote) => ({
          ...lote,
          valorSinIva: Math.round(lote.valorSinIva * 100) / 100,
          valorIva: Math.round(lote.valorIva * 100) / 100,
          valorConIva: Math.round(lote.valorConIva * 100) / 100,
        })),
      })),
    };

    return NextResponse.json(respuesta);
  } catch (error) {
    console.error('Error al generar reporte de valor de bodega:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar reporte de valor de bodega',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
