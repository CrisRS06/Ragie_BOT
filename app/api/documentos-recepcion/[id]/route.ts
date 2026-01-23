/**
 * API: /api/documentos-recepcion/[id]
 * GET - Obtener documento de recepción con detalles
 * DELETE - Eliminar documento en estado BORRADOR
 */

import { NextRequest, NextResponse } from 'next/server';
import { obtenerDocumentoRecepcion } from '@/lib/services/documento-recepcion.service';
import { prisma } from '@/lib/prisma';
import { registrarBitacora } from '@/lib/services/bitacora.service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documentos-recepcion/[id] - Obtener documento con detalles
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const documento = await obtenerDocumentoRecepcion(id);

    if (!documento) {
      return NextResponse.json(
        {
          success: false,
          error: 'Documento no encontrado',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: documento,
    });
  } catch (error) {
    console.error('Error al obtener documento de recepción:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documentos-recepcion/[id] - Eliminar documento en BORRADOR
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar que existe y está en BORRADOR
    const documento = await prisma.documentoRecepcion.findUnique({
      where: { id },
      select: { id: true, numero: true, estado: true },
    });

    if (!documento) {
      return NextResponse.json(
        {
          success: false,
          error: 'Documento no encontrado',
        },
        { status: 404 }
      );
    }

    if (documento.estado !== 'BORRADOR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo se pueden eliminar documentos en estado BORRADOR',
          estadoActual: documento.estado,
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

    // Eliminar documento y sus detalles
    await prisma.$transaction(async (tx) => {
      // Eliminar detalles primero
      await tx.detalleRecepcion.deleteMany({
        where: { documentoId: id },
      });

      // Eliminar documento
      await tx.documentoRecepcion.delete({
        where: { id },
      });

      // Registrar en bitácora
      await registrarBitacora({
        usuarioId,
        accion: 'ELIMINAR_DOCUMENTO_RECEPCION',
        entidad: 'DocumentoRecepcion',
        entidadId: id,
        estadoAnterior: {
          numero: documento.numero,
          estado: documento.estado,
        },
        ip,
        userAgent,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar documento de recepción:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
