/**
 * API: /api/documentos-recepcion
 * POST - Crear nuevo documento de recepción multi-producto
 * GET - Listar documentos de recepción
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createDocumentoRecepcionSchema,
  listDocumentosRecepcionSchema,
} from '@/lib/validations/documento-recepcion.schema';
import {
  crearDocumentoRecepcion,
  listarDocumentosRecepcion,
} from '@/lib/services/documento-recepcion.service';
import { EstadoDocumentoRecepcion } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/documentos-recepcion - Listar documentos
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parsear parámetros
    const params = {
      estado: searchParams.get('estado') as EstadoDocumentoRecepcion | undefined,
      proveedorId: searchParams.get('proveedorId') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      limite: parseInt(searchParams.get('limite') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    // Validar parámetros
    const validacion = listDocumentosRecepcionSchema.safeParse(params);
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros inválidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      );
    }

    // Listar documentos
    const resultado = await listarDocumentosRecepcion({
      estado: validacion.data.estado as EstadoDocumentoRecepcion | undefined,
      proveedorId: validacion.data.proveedorId,
      fechaDesde: validacion.data.fechaDesde ? new Date(validacion.data.fechaDesde) : undefined,
      fechaHasta: validacion.data.fechaHasta ? new Date(validacion.data.fechaHasta) : undefined,
      limite: validacion.data.limite,
      offset: validacion.data.offset,
    });

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    console.error('Error al listar documentos de recepción:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al listar documentos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documentos-recepcion - Crear documento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar con Zod
    const validacion = createDocumentoRecepcionSchema.safeParse(body);
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

    // Obtener IP y User Agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // TODO: Obtener userId del token/sesión
    const usuarioId = 'admin-temp-id';

    // Crear documento
    const resultado = await crearDocumentoRecepcion({
      proveedorId: validacion.data.proveedorId || undefined,
      documentoExterno: validacion.data.documentoExterno || undefined,
      fechaDocumento: validacion.data.fechaDocumento || undefined,
      observaciones: validacion.data.observaciones || undefined,
      lineas: validacion.data.lineas.map((linea) => ({
        articuloId: linea.articuloId,
        cantidad: linea.cantidad,
        costoUnitario: linea.costoUnitario ?? undefined,
        fechaVencimiento: linea.fechaVencimiento,
        numeroLoteProveedor: linea.numeroLoteProveedor ?? undefined,
        ubicacion: linea.ubicacion ?? undefined,
      })),
      usuarioId,
      ip,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Documento de recepción creado exitosamente',
        data: resultado.documento,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear documento de recepción:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
