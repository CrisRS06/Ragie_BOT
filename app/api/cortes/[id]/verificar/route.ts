/**
 * API: GET /api/cortes/[id]/verificar
 * Verifica la integridad de un corte
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificarIntegridadCorte } from '@/lib/services/cortes.service';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: corteId } = await params;
    const usuarioId = getCurrentUserId();

    const resultado = await verificarIntegridadCorte(corteId);

    // Registrar la verificación en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'VERIFICAR_INTEGRIDAD_CORTE',
      entidad: 'Corte',
      entidadId: corteId,
      estadoNuevo: {
        integro: resultado.integro,
        hashAlmacenado: resultado.hashAlmacenado,
        hashCalculado: resultado.hashCalculado,
      },
    });

    return NextResponse.json({
      success: true,
      verificacion: {
        corteId,
        integro: resultado.integro,
        hashAlmacenado: resultado.hashAlmacenado,
        hashCalculado: resultado.hashCalculado,
        coincide: resultado.integro,
        mensaje: resultado.mensaje,
        verificadoEn: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error al verificar corte:', error);

    if (error instanceof Error && error.message === 'Corte no encontrado') {
      return NextResponse.json(
        { error: 'Corte no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al verificar integridad' },
      { status: 500 }
    );
  }
}
