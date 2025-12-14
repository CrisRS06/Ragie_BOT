/**
 * Cron Job: Alertas de Vencimiento
 *
 * Se ejecuta diariamente para verificar lotes próximos a vencer
 * y generar alertas FEFO (First Expired, First Out) informativas.
 *
 * NOTA: Las alertas son informativas. El sistema PEPS despacha
 * por orden de entrada, no por fecha de vencimiento.
 */

import { prisma } from '@/lib/prisma';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { ADMIN_USER } from '@/lib/auth';

interface AlertaVencimiento {
  loteId: string;
  articuloId: string;
  articuloNombre: string;
  numeroLote: string | null;
  fechaVencimiento: Date;
  diasRestantes: number;
  cantidadDisponible: number;
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  vencido: boolean;
}

interface ResultadoCronAlertas {
  ejecutado: boolean;
  mensaje: string;
  totalAlertas: number;
  alertasPorSeveridad: {
    criticas: number;
    altas: number;
    medias: number;
    bajas: number;
  };
  lotesVencidos: number;
  error?: string;
}

/**
 * Genera las alertas de vencimiento basado en los lotes actuales
 */
export async function generarAlertasVencimiento(): Promise<AlertaVencimiento[]> {
  const ahora = new Date();
  const alertas: AlertaVencimiento[] = [];

  // Buscar todos los lotes con stock disponible
  const lotes = await prisma.lote.findMany({
    where: {
      cantidadDisponible: { gt: 0 },
      activo: true,
    },
    include: {
      articulo: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { fechaVencimiento: 'asc' },
  });

  for (const lote of lotes) {
    const diasRestantes = Math.ceil(
      (lote.fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determinar severidad
    let severidad: AlertaVencimiento['severidad'];
    const vencido = diasRestantes < 0;

    if (vencido || diasRestantes <= 7) {
      severidad = 'CRITICA';
    } else if (diasRestantes <= 15) {
      severidad = 'ALTA';
    } else if (diasRestantes <= 30) {
      severidad = 'MEDIA';
    } else if (diasRestantes <= 60) {
      severidad = 'BAJA';
    } else {
      continue; // No generar alerta si faltan más de 60 días
    }

    alertas.push({
      loteId: lote.id,
      articuloId: lote.articulo.id,
      articuloNombre: lote.articulo.nombre,
      numeroLote: lote.numeroLote,
      fechaVencimiento: lote.fechaVencimiento,
      diasRestantes,
      cantidadDisponible: lote.cantidadDisponible,
      severidad,
      vencido,
    });
  }

  return alertas;
}

/**
 * Ejecuta el cron job de verificación de alertas
 */
export async function ejecutarCronAlertas(): Promise<ResultadoCronAlertas> {
  try {
    // Generar alertas
    const alertas = await generarAlertasVencimiento();

    // Contar por severidad
    const alertasPorSeveridad = {
      criticas: alertas.filter((a) => a.severidad === 'CRITICA').length,
      altas: alertas.filter((a) => a.severidad === 'ALTA').length,
      medias: alertas.filter((a) => a.severidad === 'MEDIA').length,
      bajas: alertas.filter((a) => a.severidad === 'BAJA').length,
    };

    const lotesVencidos = alertas.filter((a) => a.vencido).length;

    // Registrar en bitácora solo si hay alertas críticas o vencidos
    if (alertasPorSeveridad.criticas > 0 || lotesVencidos > 0) {
      await registrarBitacora({
        usuarioId: ADMIN_USER.id,
        accion: 'CRON_ALERTAS_VENCIMIENTO',
        entidad: 'Lote',
        entidadId: 'verificacion-diaria',
        estadoNuevo: {
          tipo: 'CRON_AUTOMATICO',
          totalAlertas: alertas.length,
          criticas: alertasPorSeveridad.criticas,
          altas: alertasPorSeveridad.altas,
          medias: alertasPorSeveridad.medias,
          bajas: alertasPorSeveridad.bajas,
          lotesVencidos,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Construir mensaje
    let mensaje = `Verificación completada: ${alertas.length} alertas`;
    if (lotesVencidos > 0) {
      mensaje += ` (${lotesVencidos} lotes VENCIDOS)`;
    }

    return {
      ejecutado: true,
      mensaje,
      totalAlertas: alertas.length,
      alertasPorSeveridad,
      lotesVencidos,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    // Registrar error en bitácora
    await registrarBitacora({
      usuarioId: ADMIN_USER.id,
      accion: 'CRON_ALERTAS_ERROR',
      entidad: 'Lote',
      entidadId: 'cron-error',
      estadoNuevo: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      ejecutado: false,
      mensaje: 'Error al verificar alertas',
      totalAlertas: 0,
      alertasPorSeveridad: {
        criticas: 0,
        altas: 0,
        medias: 0,
        bajas: 0,
      },
      lotesVencidos: 0,
      error: errorMessage,
    };
  }
}

/**
 * Obtiene el resumen de alertas actuales
 */
export async function resumenAlertas(): Promise<{
  totalAlertas: number;
  porSeveridad: {
    criticas: number;
    altas: number;
    medias: number;
    bajas: number;
  };
  lotesVencidos: number;
  articulosAfectados: number;
  valorEnRiesgo: number;
}> {
  const alertas = await generarAlertasVencimiento();

  // Contar artículos únicos afectados
  const articulosUnicos = new Set(alertas.map((a) => a.articuloId));

  // Calcular valor en riesgo (simplificado: cantidad disponible de lotes críticos)
  const cantidadCritica = alertas
    .filter((a) => a.severidad === 'CRITICA' || a.vencido)
    .reduce((sum, a) => sum + a.cantidadDisponible, 0);

  return {
    totalAlertas: alertas.length,
    porSeveridad: {
      criticas: alertas.filter((a) => a.severidad === 'CRITICA').length,
      altas: alertas.filter((a) => a.severidad === 'ALTA').length,
      medias: alertas.filter((a) => a.severidad === 'MEDIA').length,
      bajas: alertas.filter((a) => a.severidad === 'BAJA').length,
    },
    lotesVencidos: alertas.filter((a) => a.vencido).length,
    articulosAfectados: articulosUnicos.size,
    valorEnRiesgo: cantidadCritica,
  };
}
