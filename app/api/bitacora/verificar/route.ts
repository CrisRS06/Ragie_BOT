/**
 * API: POST /api/bitacora/verificar
 * Verifica la integridad de la cadena de hashes de la bitácora
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificarIntegridad } from '@/lib/services/bitacora.service';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const usuarioId = getCurrentUserId();

    const resultado = await verificarIntegridad({
      desde: body.desde ? new Date(body.desde) : undefined,
      hasta: body.hasta ? new Date(body.hasta) : undefined,
      limite: body.limite,
    });

    // Registrar la verificación en la bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'VERIFICAR_INTEGRIDAD_BITACORA',
      entidad: 'Bitacora',
      entidadId: 'sistema',
      estadoNuevo: {
        isValid: resultado.isValid,
        totalRegistros: resultado.totalRegistros,
        primerRegistro: resultado.primerRegistro,
        ultimoRegistro: resultado.ultimoRegistro,
      },
    });

    return NextResponse.json({
      success: true,
      verificacion: {
        integra: resultado.isValid,
        mensaje: resultado.isValid
          ? 'La bitácora es íntegra. Todos los hashes coinciden correctamente.'
          : resultado.message || 'ADVERTENCIA: Se detectaron inconsistencias en la cadena de hashes.',
        totalRegistros: resultado.totalRegistros,
        primerRegistro: resultado.primerRegistro,
        ultimoRegistro: resultado.ultimoRegistro,
        verificadoEn: new Date().toISOString(),
        ...(resultado.invalidAt && {
          registroCorrupto: resultado.invalidAt,
        }),
      },
    });
  } catch (error) {
    console.error('Error al verificar bitácora:', error);
    return NextResponse.json(
      { error: 'Error al verificar integridad' },
      { status: 500 }
    );
  }
}
