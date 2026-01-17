/**
 * API: /api/reportes/kardex
 * GET - Genera el Kardex (historial de movimientos) de un artículo
 * FASE 6: Reporte Kardex con formato PEPS y saldos acumulativos
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface MovimientoKardex {
  id: string;
  fecha: Date;
  tipo: string;
  numeroLote: string | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number | null;
  valorMovimiento: number | null;
  saldoCantidad: number;
  saldoValor: number;
  receptor: string | null;
  unidadReceptora: string | null;
  documentoReferencia: string | null;
  observaciones: string | null;
}

/**
 * GET /api/reportes/kardex
 * Genera el Kardex de un artículo con saldos acumulativos
 * Query params:
 * - articuloId: ID del artículo (requerido)
 * - fechaDesde: Fecha inicial del reporte (opcional)
 * - fechaHasta: Fecha final del reporte (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articuloId = searchParams.get('articuloId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    if (!articuloId) {
      return NextResponse.json(
        { success: false, error: 'El ID del artículo es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del artículo
    const articulo = await prisma.articulo.findUnique({
      where: { id: articuloId },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcionSIGAF: true,
        marca: true,
        unidadMedida: true,
        ivaPercent: true,
      },
    });

    if (!articulo) {
      return NextResponse.json(
        { success: false, error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Construir filtros de fecha
    const filtroFecha: Record<string, Date> = {};
    if (fechaDesde) {
      filtroFecha.gte = new Date(fechaDesde);
    }
    if (fechaHasta) {
      const fechaFin = new Date(fechaHasta);
      fechaFin.setHours(23, 59, 59, 999);
      filtroFecha.lte = fechaFin;
    }

    // Obtener todos los movimientos del artículo
    const movimientos = await prisma.movimiento.findMany({
      where: {
        articuloId,
        anulado: false,
        ...(Object.keys(filtroFecha).length > 0 ? { timestamp: filtroFecha } : {}),
      },
      include: {
        lote: {
          select: {
            numeroLote: true,
            costoUnitario: true,
          },
        },
        unidadReceptora: {
          select: {
            codigo: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calcular saldo inicial si hay filtro de fecha
    let saldoCantidad = 0;
    let saldoValor = 0;

    if (fechaDesde) {
      // Calcular saldo anterior a la fecha inicial
      const movimientosAnteriores = await prisma.movimiento.findMany({
        where: {
          articuloId,
          anulado: false,
          timestamp: { lt: new Date(fechaDesde) },
        },
        include: {
          lote: {
            select: {
              costoUnitario: true,
            },
          },
        },
      });

      for (const mov of movimientosAnteriores) {
        const costoUnitario = mov.lote?.costoUnitario || 0;
        const valorMovimiento = mov.cantidad * costoUnitario;

        if (mov.tipo === 'ENTRADA') {
          saldoCantidad += mov.cantidad;
          saldoValor += valorMovimiento;
        } else if (mov.tipo === 'SALIDA') {
          saldoCantidad -= mov.cantidad;
          saldoValor -= valorMovimiento;
        } else if (mov.tipo === 'AJUSTE_INVENTARIO') {
          // Los ajustes pueden ser positivos o negativos
          // Asumimos que el motivo indica si es entrada o salida
          if (mov.motivo?.toLowerCase().includes('faltante') ||
              mov.motivo?.toLowerCase().includes('merma') ||
              mov.motivo?.toLowerCase().includes('pérdida')) {
            saldoCantidad -= mov.cantidad;
            saldoValor -= valorMovimiento;
          } else {
            saldoCantidad += mov.cantidad;
            saldoValor += valorMovimiento;
          }
        }
      }
    }

    // Procesar movimientos y calcular saldos acumulativos
    const kardexMovimientos: MovimientoKardex[] = [];

    // Agregar saldo inicial si hay filtro de fecha
    if (fechaDesde && (saldoCantidad !== 0 || saldoValor !== 0)) {
      kardexMovimientos.push({
        id: 'saldo-inicial',
        fecha: new Date(fechaDesde),
        tipo: 'SALDO_INICIAL',
        numeroLote: null,
        descripcion: 'Saldo inicial del período',
        cantidad: 0,
        costoUnitario: null,
        valorMovimiento: null,
        saldoCantidad: Math.round(saldoCantidad * 100) / 100,
        saldoValor: Math.round(saldoValor * 100) / 100,
        receptor: null,
        unidadReceptora: null,
        documentoReferencia: null,
        observaciones: null,
      });
    }

    for (const mov of movimientos) {
      const costoUnitario = mov.costoUnitarioPEPS || mov.lote?.costoUnitario || 0;
      const valorMovimiento = mov.cantidad * costoUnitario;

      // Actualizar saldos según tipo de movimiento
      if (mov.tipo === 'ENTRADA') {
        saldoCantidad += mov.cantidad;
        saldoValor += valorMovimiento;
      } else if (mov.tipo === 'SALIDA') {
        saldoCantidad -= mov.cantidad;
        saldoValor -= valorMovimiento;
      } else if (mov.tipo === 'AJUSTE_INVENTARIO') {
        // Determinar si es ajuste positivo o negativo por el motivo
        if (mov.motivo?.toLowerCase().includes('faltante') ||
            mov.motivo?.toLowerCase().includes('merma') ||
            mov.motivo?.toLowerCase().includes('pérdida')) {
          saldoCantidad -= mov.cantidad;
          saldoValor -= valorMovimiento;
        } else {
          saldoCantidad += mov.cantidad;
          saldoValor += valorMovimiento;
        }
      }

      // Generar descripción del movimiento
      let descripcion = '';
      switch (mov.tipo) {
        case 'ENTRADA':
          descripcion = `Recepción - ${mov.lote?.numeroLote || 'Sin lote'}`;
          break;
        case 'SALIDA':
          descripcion = mov.unidadReceptora
            ? `Despacho a ${mov.unidadReceptora.nombre}`
            : `Despacho a ${mov.receptorNombre || 'N/A'}`;
          break;
        case 'AJUSTE_INVENTARIO':
          descripcion = `Ajuste: ${mov.motivo || 'Sin motivo'}`;
          break;
        case 'TRANSFERENCIA':
          descripcion = 'Transferencia';
          break;
        case 'DEVOLUCION':
          descripcion = 'Devolución';
          break;
        default:
          descripcion = mov.tipo;
      }

      kardexMovimientos.push({
        id: mov.id,
        fecha: mov.timestamp,
        tipo: mov.tipo,
        numeroLote: mov.lote?.numeroLote || null,
        descripcion,
        cantidad: mov.tipo === 'SALIDA' ? -mov.cantidad : mov.cantidad,
        costoUnitario,
        valorMovimiento: Math.round(valorMovimiento * 100) / 100,
        saldoCantidad: Math.round(saldoCantidad * 100) / 100,
        saldoValor: Math.round(saldoValor * 100) / 100,
        receptor: mov.receptorNombre,
        unidadReceptora: mov.unidadReceptora?.nombre || null,
        documentoReferencia: mov.documentoReferencia,
        observaciones: mov.observaciones,
      });
    }

    // Calcular totales del período
    const totalEntradas = movimientos
      .filter(m => m.tipo === 'ENTRADA')
      .reduce((sum, m) => sum + m.cantidad, 0);

    const totalSalidas = movimientos
      .filter(m => m.tipo === 'SALIDA')
      .reduce((sum, m) => sum + m.cantidad, 0);

    const valorTotalEntradas = movimientos
      .filter(m => m.tipo === 'ENTRADA')
      .reduce((sum, m) => sum + (m.cantidad * (m.lote?.costoUnitario || 0)), 0);

    const valorTotalSalidas = movimientos
      .filter(m => m.tipo === 'SALIDA')
      .reduce((sum, m) => sum + (m.cantidad * (m.costoUnitarioPEPS || m.lote?.costoUnitario || 0)), 0);

    return NextResponse.json({
      success: true,
      fechaReporte: new Date().toISOString(),
      periodo: {
        desde: fechaDesde || 'Inicio',
        hasta: fechaHasta || 'Actual',
      },
      articulo: {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        descripcionSIGAF: articulo.descripcionSIGAF,
        marca: articulo.marca,
        unidadMedida: articulo.unidadMedida,
        ivaPercent: articulo.ivaPercent,
      },
      resumen: {
        totalMovimientos: movimientos.length,
        totalEntradas: Math.round(totalEntradas * 100) / 100,
        totalSalidas: Math.round(totalSalidas * 100) / 100,
        valorTotalEntradas: Math.round(valorTotalEntradas * 100) / 100,
        valorTotalSalidas: Math.round(valorTotalSalidas * 100) / 100,
        saldoFinalCantidad: Math.round(saldoCantidad * 100) / 100,
        saldoFinalValor: Math.round(saldoValor * 100) / 100,
      },
      movimientos: kardexMovimientos,
    });
  } catch (error) {
    console.error('Error al generar Kardex:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar Kardex',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
