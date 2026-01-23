/**
 * API: /api/documentos-recepcion/[id]/procesar
 * POST - Procesar documento de recepción (crear lotes y movimientos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { procesarDocumentoRecepcion } from '@/lib/services/documento-recepcion.service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documentos-recepcion/[id]/procesar
 * Procesa un documento en estado BORRADOR, creando los lotes y movimientos
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Obtener IP y User Agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // TODO: Obtener userId del token/sesión
    const usuarioId = 'admin-temp-id';

    // Procesar documento
    const resultado = await procesarDocumentoRecepcion({
      documentoId: id,
      usuarioId,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Documento procesado exitosamente. Se crearon ${resultado.lotesCreados} lotes y ${resultado.movimientosCreados} movimientos.`,
      data: resultado,
    });
  } catch (error) {
    console.error('Error al procesar documento de recepción:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
