/**
 * Cron Job: Informe Mensual de Inventario
 *
 * Se ejecuta los días 1-3 de cada mes para generar automáticamente
 * el informe mensual de inventario según requisitos regulatorios.
 */

import { prisma } from '@/lib/prisma';
import { generarInformeMensual, verificarNecesidadInformeMensual } from '@/lib/services/informes.service';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { ADMIN_USER } from '@/lib/auth';

interface ResultadoCronInforme {
  ejecutado: boolean;
  mensaje: string;
  informeId?: string;
  error?: string;
}

/**
 * Verifica si es necesario generar el informe mensual
 */
export async function verificarNecesidadInforme(): Promise<{
  necesario: boolean;
  razon: string;
  mesObjetivo: { mes: number; anio: number };
}> {
  const necesidad = await verificarNecesidadInformeMensual();

  // Calcular el mes objetivo (mes anterior)
  const ahora = new Date();
  const mesAnterior = ahora.getMonth() === 0 ? 12 : ahora.getMonth();
  const anioObjetivo = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();

  return {
    necesario: necesidad.necesario,
    razon: necesidad.mensaje,
    mesObjetivo: {
      mes: mesAnterior,
      anio: anioObjetivo,
    },
  };
}

/**
 * Ejecuta el cron job de generación de informe mensual
 */
export async function ejecutarCronInformes(): Promise<ResultadoCronInforme> {
  const ahora = new Date();
  const diaDelMes = ahora.getDate();

  // Solo ejecutar días 1, 2 o 3 del mes
  if (diaDelMes > 3) {
    return {
      ejecutado: false,
      mensaje: `Fuera del período de generación (día ${diaDelMes})`,
    };
  }

  try {
    // Verificar si es necesario generar informe
    const necesidad = await verificarNecesidadInforme();

    if (!necesidad.necesario) {
      return {
        ejecutado: false,
        mensaje: necesidad.razon,
      };
    }

    // Generar el informe
    const resultado = await generarInformeMensual({
      generadoPorId: ADMIN_USER.id,
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: ADMIN_USER.id,
      accion: 'CRON_INFORME_MENSUAL',
      entidad: 'Informe',
      entidadId: resultado.informe.id,
      estadoNuevo: {
        tipo: 'CRON_AUTOMATICO',
        firma: resultado.firma,
        totalArticulos: resultado.datos.length,
        mes: necesidad.mesObjetivo.mes,
        anio: necesidad.mesObjetivo.anio,
      },
    });

    return {
      ejecutado: true,
      mensaje: `Informe mensual ${necesidad.mesObjetivo.mes}/${necesidad.mesObjetivo.anio} generado exitosamente`,
      informeId: resultado.informe.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    // Registrar error en bitácora
    await registrarBitacora({
      usuarioId: ADMIN_USER.id,
      accion: 'CRON_INFORME_ERROR',
      entidad: 'Informe',
      entidadId: 'cron-error',
      estadoNuevo: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      ejecutado: false,
      mensaje: 'Error al generar informe mensual',
      error: errorMessage,
    };
  }
}

/**
 * Obtiene el estado del cron de informes
 */
export async function estadoCronInformes(): Promise<{
  ultimoInforme: Date | null;
  proximaEjecucion: Date;
  informesPendientes: number;
}> {
  // Obtener último informe
  const ultimoInforme = await prisma.informe.findFirst({
    where: { tipo: 'MENSUAL_INVENTARIO' },
    orderBy: { creadoEn: 'desc' },
  });

  // Calcular próxima ejecución
  const ahora = new Date();
  const proximaEjecucion = new Date(ahora);

  if (ahora.getDate() > 3) {
    // Si ya pasó el día 3, próxima ejecución es el día 1 del próximo mes
    proximaEjecucion.setMonth(proximaEjecucion.getMonth() + 1);
    proximaEjecucion.setDate(1);
  } else {
    // Si estamos en días 1-3, próxima es mañana (o día 1 del próximo mes si es día 3)
    if (ahora.getDate() === 3) {
      proximaEjecucion.setMonth(proximaEjecucion.getMonth() + 1);
      proximaEjecucion.setDate(1);
    } else {
      proximaEjecucion.setDate(proximaEjecucion.getDate() + 1);
    }
  }
  proximaEjecucion.setHours(6, 0, 0, 0);

  // Contar informes pendientes (meses sin informe)
  const necesidad = await verificarNecesidadInformeMensual();

  return {
    ultimoInforme: ultimoInforme?.creadoEn || null,
    proximaEjecucion,
    informesPendientes: necesidad.necesario ? 1 : 0,
  };
}
