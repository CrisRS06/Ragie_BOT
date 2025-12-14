/**
 * API: /api/cortes
 * GET - Listar cortes
 * POST - Crear nuevo corte
 */

import { NextRequest, NextResponse } from 'next/server';
import { obtenerCortes, crearCorteBajoDemanda, crearCorteCompraSegunDemanda } from '@/lib/services/cortes.service';
import { createCorteSchema } from '@/lib/validations/corte.schema';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo') as any;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const limite = parseInt(searchParams.get('limite') || '20');

    const cortes = await obtenerCortes({
      tipo: tipo || undefined,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      limite,
    });

    return NextResponse.json({
      success: true,
      cortes: cortes.map((corte) => ({
        id: corte.id,
        tipo: corte.tipo,
        timestamp: corte.timestamp,
        motivo: corte.motivo,
        hashSnapshot: corte.hashSnapshot,
        totalArticulos: corte.totalArticulos,
        totalLotes: corte.totalLotes,
        completado: corte.completado,
        solicitadoPor: corte.solicitadoPor,
        cantidadDetalles: corte._count.detalles,
      })),
      total: cortes.length,
    });
  } catch (error) {
    console.error('Error al listar cortes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validacion = createCorteSchema.safeParse(body);

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

    let resultado;

    if (datos.tipo === 'COMPRA_SEGUN_DEMANDA') {
      resultado = await crearCorteCompraSegunDemanda({
        solicitadoPorId: usuarioId,
        motivo: datos.motivo,
      });
    } else {
      resultado = await crearCorteBajoDemanda({
        solicitadoPorId: usuarioId,
        motivo: datos.motivo,
      });
    }

    return NextResponse.json({
      success: true,
      corte: {
        id: resultado.corte.id,
        tipo: resultado.corte.tipo,
        timestamp: resultado.corte.timestamp,
        hashSnapshot: resultado.corte.hashSnapshot,
        motivo: resultado.corte.motivo,
      },
      totalArticulos: resultado.totalArticulos,
      totalLotes: resultado.totalLotes,
      mensaje: `Corte creado exitosamente con ${resultado.totalLotes} lotes de ${resultado.totalArticulos} artículos`,
    });
  } catch (error) {
    console.error('Error al crear corte:', error);

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
