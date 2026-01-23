/**
 * API: /api/documentos-recepcion/[id]/anular
 * POST - Anular documento de recepción
 */

import { NextRequest, NextResponse } from 'next/server';
import { anularDocumentoRecepcion } from '@/lib/services/documento-recepcion.service';
import { anularDocumentoSchema } from '@/lib/validations/documento-recepcion.schema';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documentos-recepcion/[id]/anular
 * Anula un documento de recepción
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar con Zod
    const validacion = anularDocumentoSchema.safeParse({
      documentoId: id,
      motivo: body.motivo,
    });

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

    // Anular documento
    const resultado = await anularDocumentoRecepcion({
      documentoId: id,
      motivo: validacion.data.motivo,
      usuarioId,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: resultado.message,
      data: resultado.documento,
    });
  } catch (error) {
    console.error('Error al anular documento de recepción:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al anular documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
