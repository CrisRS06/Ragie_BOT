/**
 * API: GET /api/bitacora/exportar
 * Exporta la bitácora en formato CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportarBitacora, registrarBitacora } from '@/lib/services/bitacora.service';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const usuarioId = getCurrentUserId();

    const registros = await exportarBitacora({
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });

    // Generar CSV
    const encabezados = [
      'ID',
      'Fecha',
      'Usuario',
      'Rol',
      'Acción',
      'Entidad',
      'EntidadID',
      'IP',
      'Hash',
    ];

    const filas = registros.map((r) => [
      r.id,
      new Date(r.fecha).toISOString(),
      r.usuario,
      r.rol,
      r.accion,
      r.entidad,
      r.entidadId,
      r.ip || 'N/A',
      r.hashActual,
    ]);

    const csv = [
      encabezados.join(','),
      ...filas.map((fila) => fila.map((campo) => `"${campo}"`).join(',')),
    ].join('\n');

    // Registrar la exportación
    await registrarBitacora({
      usuarioId,
      accion: 'EXPORTAR_BITACORA',
      entidad: 'Bitacora',
      entidadId: 'sistema',
      estadoNuevo: {
        totalRegistros: registros.length,
        desde,
        hasta,
      },
    });

    // Nombre del archivo
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `bitacora-${fecha}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Registros': registros.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error al exportar bitácora:', error);
    return NextResponse.json(
      { error: 'Error al exportar bitácora' },
      { status: 500 }
    );
  }
}
