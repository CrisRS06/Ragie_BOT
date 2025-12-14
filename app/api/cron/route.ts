/**
 * API: /api/cron
 *
 * Endpoint para ejecutar tareas cron programadas.
 * Puede ser llamado por servicios externos como Vercel Cron,
 * AWS CloudWatch Events, o manualmente para testing.
 *
 * GET - Obtener estado de los cron jobs
 * POST - Ejecutar cron jobs específicos
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ejecutarCronInformes,
  verificarNecesidadInforme,
} from '@/lib/cron/informes.cron';
import {
  ejecutarCronCortes,
  verificarNecesidadCorte,
} from '@/lib/cron/cortes.cron';
import {
  ejecutarCronAlertas,
  resumenAlertas,
} from '@/lib/cron/alertas.cron';
import { CRON_SCHEDULES } from '@/lib/cron';

// Token de seguridad para proteger los endpoints cron
const CRON_SECRET = process.env.CRON_SECRET || 'desarrollo-local';

/**
 * Verifica la autorización del request
 */
function verificarAutorizacion(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');

  // Permitir en desarrollo
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Verificar token Bearer o header x-cron-secret
  if (authHeader === `Bearer ${CRON_SECRET}` || cronSecret === CRON_SECRET) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron - Obtener estado de los cron jobs
 */
export async function GET(request: NextRequest) {
  if (!verificarAutorizacion(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Obtener estado de cada cron
    const [necesidadInforme, necesidadCorte, alertas] = await Promise.all([
      verificarNecesidadInforme(),
      verificarNecesidadCorte(),
      resumenAlertas(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      schedules: CRON_SCHEDULES,
      estado: {
        informeMensual: {
          necesario: necesidadInforme.necesario,
          razon: necesidadInforme.razon,
          mesObjetivo: necesidadInforme.mesObjetivo,
        },
        corteMensual: {
          necesario: necesidadCorte.necesario,
          razon: necesidadCorte.razon,
          mesObjetivo: necesidadCorte.mesObjetivo,
        },
        alertasVencimiento: {
          totalAlertas: alertas.totalAlertas,
          porSeveridad: alertas.porSeveridad,
          lotesVencidos: alertas.lotesVencidos,
          articulosAfectados: alertas.articulosAfectados,
        },
      },
    });
  } catch (error) {
    console.error('Error al obtener estado de cron:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron - Ejecutar cron jobs
 *
 * Body:
 * - job: 'informes' | 'cortes' | 'alertas' | 'all'
 * - force: boolean (ignora restricciones de día)
 */
export async function POST(request: NextRequest) {
  if (!verificarAutorizacion(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { job = 'all', force = false } = body;

    const resultados: Record<string, any> = {};

    // Ejecutar jobs según solicitud
    if (job === 'informes' || job === 'all') {
      if (force) {
        // Forzar ejecución ignorando restricciones de día
        const necesidad = await verificarNecesidadInforme();
        if (necesidad.necesario) {
          const { generarInformeMensual } = await import('@/lib/services/informes.service');
          const { ADMIN_USER } = await import('@/lib/auth');

          const resultado = await generarInformeMensual({
            generadoPorId: ADMIN_USER.id,
          });

          resultados.informes = {
            ejecutado: true,
            mensaje: `Informe forzado generado: ${resultado.informe.id}`,
            informeId: resultado.informe.id,
          };
        } else {
          resultados.informes = {
            ejecutado: false,
            mensaje: necesidad.razon,
          };
        }
      } else {
        resultados.informes = await ejecutarCronInformes();
      }
    }

    if (job === 'cortes' || job === 'all') {
      if (force) {
        // Forzar ejecución ignorando restricciones de día
        const necesidad = await verificarNecesidadCorte();
        if (necesidad.necesario) {
          const { crearCorte } = await import('@/lib/services/cortes.service');
          const { ADMIN_USER } = await import('@/lib/auth');

          const resultado = await crearCorte({
            tipo: 'MENSUAL_AUTOMATICO',
            motivo: `Corte mensual forzado - ${necesidad.mesObjetivo.mes}/${necesidad.mesObjetivo.anio}`,
            solicitadoPorId: ADMIN_USER.id,
          });

          resultados.cortes = {
            ejecutado: true,
            mensaje: `Corte forzado generado: ${resultado.corte.id}`,
            corteId: resultado.corte.id,
          };
        } else {
          resultados.cortes = {
            ejecutado: false,
            mensaje: necesidad.razon,
          };
        }
      } else {
        resultados.cortes = await ejecutarCronCortes();
      }
    }

    if (job === 'alertas' || job === 'all') {
      resultados.alertas = await ejecutarCronAlertas();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      job,
      force,
      resultados,
    });
  } catch (error) {
    console.error('Error al ejecutar cron:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar cron jobs' },
      { status: 500 }
    );
  }
}
