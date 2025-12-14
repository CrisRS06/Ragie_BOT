/**
 * API: /api/recepciones
 * GET - Listar recepciones
 * POST - Crear una nueva recepción de mercancía
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRecepcionSchema } from '@/lib/validations/recepcion.schema';
import { ejecutarEntrada } from '@/lib/services/peps.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recepciones - Listar recepciones (entradas)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limite = parseInt(searchParams.get('limite') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const articuloId = searchParams.get('articuloId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    // Construir filtros
    const where: Record<string, unknown> = {
      tipo: 'ENTRADA',
      anulado: false,
    };

    if (articuloId) {
      where.articuloId = articuloId;
    }

    if (fechaDesde || fechaHasta) {
      where.timestamp = {};
      if (fechaDesde) {
        (where.timestamp as Record<string, Date>).gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const fechaFin = new Date(fechaHasta);
        fechaFin.setHours(23, 59, 59, 999);
        (where.timestamp as Record<string, Date>).lte = fechaFin;
      }
    }

    // Obtener movimientos de entrada (recepciones)
    const movimientos = await prisma.movimiento.findMany({
      where,
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
            id: true,
            numeroLote: true,
            cantidadInicial: true,
            cantidadDisponible: true,
            fechaVencimiento: true,
            proveedor: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limite,
      skip: offset,
    });

    const total = await prisma.movimiento.count({ where });

    return NextResponse.json({
      success: true,
      data: movimientos,
      total,
      limite,
      offset,
    });
  } catch (error) {
    console.error('Error al listar recepciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar recepciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parsear body
    const body = await request.json();

    // Validar con Zod
    const validacion = createRecepcionSchema.safeParse(body);

    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validacion.data;

    // Obtener IP y User Agent para auditoría
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // TODO: En producción, obtener userId del token/sesión
    // Por ahora usamos un usuario de prueba
    const usuarioId = 'admin-temp-id';

    // Ejecutar entrada usando el servicio PEPS
    const resultado = await ejecutarEntrada({
      articuloId: data.articuloId,
      cantidad: data.cantidad,
      fechaVencimiento: data.fechaVencimiento,
      numeroLote: data.numeroLote,
      proveedor: data.proveedor,
      costoUnitario: data.costoUnitario,
      ubicacion: data.ubicacion,
      documentoReferencia: data.documentoReferencia,
      usuarioId,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Recepción creada exitosamente',
      data: resultado,
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear recepción:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear recepción',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
