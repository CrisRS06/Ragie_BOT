/**
 * API: POST /api/despachos
 * Crea un nuevo despacho usando el algoritmo PEPS
 */

import { NextRequest, NextResponse } from 'next/server';
import { ejecutarSalidaPEPS, obtenerLotesPEPS, calcularConsumoPEPS } from '@/lib/services/peps.service';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { createDespachoSchema } from '@/lib/validations/despacho.schema';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validacion = createDespachoSchema.safeParse(body);

    if (!validacion.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          detalles: validacion.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const datos = validacion.data;
    const usuarioId = getCurrentUserId();

    // Verificar que el artículo existe
    const articulo = await prisma.articulo.findUnique({
      where: { id: datos.articuloId },
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
    const lotes = await obtenerLotesPEPS(datos.articuloId);
    const stockTotal = lotes.reduce((sum, lote) => sum + lote.cantidadDisponible, 0);

    // Validar stock disponible
    if (stockTotal < datos.cantidad) {
      return NextResponse.json(
        {
          error: 'Stock insuficiente',
          stockDisponible: stockTotal,
          cantidadSolicitada: datos.cantidad,
        },
        { status: 400 }
      );
    }

    // Ejecutar salida PEPS
    const resultado = await ejecutarSalidaPEPS({
      articuloId: datos.articuloId,
      cantidad: datos.cantidad,
      unidadReceptoraId: datos.unidadReceptoraId,
      receptorNombre: datos.receptor,
      receptorCedula: datos.cedulaReceptor,
      documentoReferencia: datos.observaciones,
      usuarioId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Calcular lotes consumidos con detalles
    const consumos = calcularConsumoPEPS(lotes, datos.cantidad);
    const lotesConsumidos = await Promise.all(
      consumos.map(async (consumo) => {
        const lote = await prisma.lote.findUnique({
          where: { id: consumo.loteId },
          select: {
            id: true,
            numeroLote: true,
            fechaVencimiento: true,
            cantidadDisponible: true,
          },
        });

        return {
          loteId: consumo.loteId,
          numeroLote: lote?.numeroLote || `LOTE-${consumo.loteId.substring(0, 8)}`,
          cantidadConsumida: consumo.cantidad,
          cantidadRestante: lote?.cantidadDisponible || 0,
          fechaVencimiento: lote?.fechaVencimiento,
        };
      })
    );

    // Generar ID de despacho para tracking
    const despachoId = nanoid(12);

    // Registrar en bitácora el despacho completo
    await registrarBitacora({
      usuarioId,
      accion: 'DESPACHO_PEPS_COMPLETO',
      entidad: 'Despacho',
      entidadId: despachoId,
      estadoNuevo: {
        articulo: articulo.nombre,
        cantidadTotal: datos.cantidad,
        receptor: datos.receptor,
        lotesConsumidos: lotesConsumidos.length,
        movimientos: resultado.movimientos.length,
      },
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      despachoId,
      articulo: {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        unidadMedida: articulo.unidadMedida,
      },
      cantidadTotal: datos.cantidad,
      receptor: datos.receptor,
      lotesConsumidos,
      movimientos: resultado.movimientos.map((m) => ({
        id: m.id,
        loteId: m.loteId,
        cantidad: m.cantidad,
      })),
      mensaje: `Despacho exitoso de ${datos.cantidad} ${articulo.unidadMedida} de ${articulo.nombre}`,
    });
  } catch (error) {
    console.error('Error al crear despacho:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/despachos - Listar despachos recientes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limite = parseInt(searchParams.get('limite') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Obtener movimientos de salida (despachos)
    const movimientos = await prisma.movimiento.findMany({
      where: {
        tipo: 'SALIDA',
        anulado: false,
      },
      include: {
        articulo: {
          select: {
            sku: true,
            nombre: true,
            unidadMedida: true,
          },
        },
        lote: {
          select: {
            numeroLote: true,
            fechaVencimiento: true,
          },
        },
        unidadReceptora: {
          select: {
            codigo: true,
            nombre: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limite,
      skip: offset,
    });

    const total = await prisma.movimiento.count({
      where: {
        tipo: 'SALIDA',
        anulado: false,
      },
    });

    return NextResponse.json({
      despachos: movimientos,
      total,
      limite,
      offset,
    });
  } catch (error) {
    console.error('Error al listar despachos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
