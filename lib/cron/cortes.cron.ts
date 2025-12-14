/**
 * Cron Job: Corte Mensual de Existencias
 *
 * Se ejecuta el día 1 de cada mes a las 00:01 para generar
 * automáticamente el snapshot inmutable del inventario.
 */

import { prisma } from '@/lib/prisma';
import { crearCorte } from '@/lib/services/cortes.service';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { ADMIN_USER } from '@/lib/auth';

interface ResultadoCronCorte {
  ejecutado: boolean;
  mensaje: string;
  corteId?: string;
  error?: string;
}

/**
 * Verifica si es necesario generar el corte mensual
 */
export async function verificarNecesidadCorte(): Promise<{
  necesario: boolean;
  razon: string;
  mesObjetivo: { mes: number; anio: number };
}> {
  const ahora = new Date();
  // El corte del día 1 es para el mes anterior
  const mesAnterior = ahora.getMonth() === 0 ? 12 : ahora.getMonth();
  const anioCorte = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();

  // Buscar si ya existe corte para el mes anterior
  const inicioMes = new Date(anioCorte, mesAnterior - 1, 1);
  const finMes = new Date(anioCorte, mesAnterior, 0, 23, 59, 59);

  const corteExistente = await prisma.corte.findFirst({
    where: {
      tipo: 'MENSUAL_AUTOMATICO',
      timestamp: {
        gte: inicioMes,
        lte: finMes,
      },
    },
  });

  return {
    necesario: !corteExistente,
    razon: corteExistente
      ? `Corte de ${mesAnterior}/${anioCorte} ya existe`
      : `Necesario generar corte de ${mesAnterior}/${anioCorte}`,
    mesObjetivo: {
      mes: mesAnterior,
      anio: anioCorte,
    },
  };
}

/**
 * Ejecuta el cron job de generación de corte mensual
 */
export async function ejecutarCronCortes(): Promise<ResultadoCronCorte> {
  const ahora = new Date();
  const diaDelMes = ahora.getDate();

  // Solo ejecutar el día 1 del mes
  if (diaDelMes !== 1) {
    return {
      ejecutado: false,
      mensaje: `No es día de corte (día ${diaDelMes})`,
    };
  }

  try {
    // Verificar si es necesario generar corte
    const necesidad = await verificarNecesidadCorte();

    if (!necesidad.necesario) {
      return {
        ejecutado: false,
        mensaje: necesidad.razon,
      };
    }

    // Generar el corte
    const mesAnterior = necesidad.mesObjetivo.mes;
    const anioCorte = necesidad.mesObjetivo.anio;

    const resultado = await crearCorte({
      tipo: 'MENSUAL_AUTOMATICO',
      motivo: `Corte mensual automático - ${mesAnterior}/${anioCorte}`,
      solicitadoPorId: ADMIN_USER.id,
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: ADMIN_USER.id,
      accion: 'CRON_CORTE_MENSUAL',
      entidad: 'CorteExistencias',
      entidadId: resultado.corte.id,
      estadoNuevo: {
        tipo: 'CRON_AUTOMATICO',
        hash: resultado.corte.hashSnapshot,
        totalArticulos: resultado.totalArticulos,
        mes: mesAnterior,
        anio: anioCorte,
      },
    });

    return {
      ejecutado: true,
      mensaje: `Corte mensual ${mesAnterior}/${anioCorte} generado exitosamente`,
      corteId: resultado.corte.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    // Registrar error en bitácora
    await registrarBitacora({
      usuarioId: ADMIN_USER.id,
      accion: 'CRON_CORTE_ERROR',
      entidad: 'CorteExistencias',
      entidadId: 'cron-error',
      estadoNuevo: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      ejecutado: false,
      mensaje: 'Error al generar corte mensual',
      error: errorMessage,
    };
  }
}

/**
 * Obtiene el estado del cron de cortes
 */
export async function estadoCronCortes(): Promise<{
  ultimoCorte: Date | null;
  proximaEjecucion: Date;
  cortesPendientes: number;
}> {
  // Obtener último corte mensual
  const ultimoCorte = await prisma.corte.findFirst({
    where: { tipo: 'MENSUAL_AUTOMATICO' },
    orderBy: { timestamp: 'desc' },
  });

  // Calcular próxima ejecución (día 1 del próximo mes)
  const ahora = new Date();
  const proximaEjecucion = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1, 0, 1, 0);

  // Contar cortes pendientes
  const necesidad = await verificarNecesidadCorte();

  return {
    ultimoCorte: ultimoCorte?.timestamp || null,
    proximaEjecucion,
    cortesPendientes: necesidad.necesario ? 1 : 0,
  };
}
