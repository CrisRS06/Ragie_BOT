/**
 * Servicio de Informes y Reportes
 * REQUERIMIENTO CRÍTICO: Informe mensual automático (1-3 de cada mes) y reporte quincenal
 */

import { prisma } from '@/lib/prisma';
import { TipoInforme } from '@prisma/client';
import { generateDocumentHash, generateDigitalSignature } from '@/lib/utils/hash';
import { registrarBitacora } from './bitacora.service';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Obtiene datos para el informe mensual de inventario
 */
export async function obtenerDatosInformeMensual(
  periodoInicio: Date,
  periodoFin: Date
) {
  // Obtener todos los artículos con sus lotes
  const articulos = await prisma.articulo.findMany({
    where: { activo: true },
    include: {
      lotes: {
        where: {
          OR: [
            { cantidadDisponible: { gt: 0 } },
            {
              movimientos: {
                some: {
                  timestamp: {
                    gte: periodoInicio,
                    lte: periodoFin,
                  },
                },
              },
            },
          ],
        },
        include: {
          movimientos: {
            where: {
              timestamp: {
                gte: periodoInicio,
                lte: periodoFin,
              },
            },
            orderBy: { timestamp: 'asc' },
          },
        },
        orderBy: { fechaIngresoTs: 'asc' },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  // Calcular resumen por artículo
  const resumen = articulos.map((articulo) => {
    const lotes = articulo.lotes.map((lote) => {
      const entradas = lote.movimientos
        .filter((m) => m.tipo === 'ENTRADA')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const salidas = lote.movimientos
        .filter((m) => m.tipo === 'SALIDA' || m.tipo === 'TRANSFERENCIA')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const ajustes = lote.movimientos
        .filter((m) => m.tipo === 'AJUSTE_INVENTARIO')
        .reduce((sum, m) => sum + m.cantidad, 0);

      return {
        loteId: lote.id,
        numeroLote: lote.numeroLote,
        fechaIngreso: lote.fechaIngresoTs,
        fechaVencimiento: lote.fechaVencimiento,
        saldoInicial: lote.cantidadInicial,
        entradas,
        salidas,
        ajustes,
        saldoFinal: lote.cantidadDisponible,
        ubicacion: lote.ubicacion,
      };
    });

    const totalEntradas = lotes.reduce((sum, l) => sum + l.entradas, 0);
    const totalSalidas = lotes.reduce((sum, l) => sum + l.salidas, 0);
    const totalSaldoFinal = lotes.reduce((sum, l) => sum + l.saldoFinal, 0);

    return {
      articulo: {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        descripcionSIGAF: articulo.descripcionSIGAF,
        unidadMedida: articulo.unidadMedida,
      },
      lotes,
      totales: {
        entradas: totalEntradas,
        salidas: totalSalidas,
        saldoFinal: totalSaldoFinal,
      },
    };
  });

  return resumen;
}

/**
 * Genera el informe mensual de inventario
 */
export async function generarInformeMensual(params: {
  periodoInicio?: Date;
  periodoFin?: Date;
  generadoPorId: string;
}) {
  try {
    // Si no se especifica período, usar el mes anterior
    const inicio = params.periodoInicio || startOfMonth(subMonths(new Date(), 1));
    const fin = params.periodoFin || endOfMonth(subMonths(new Date(), 1));

    // Obtener datos
    const datos = await obtenerDatosInformeMensual(inicio, fin);

    // Crear registro de informe
    const informe = await prisma.informe.create({
      data: {
        tipo: 'MENSUAL_INVENTARIO',
        estado: 'GENERANDO',
        periodoInicio: inicio,
        periodoFin: fin,
        generadoPorId: params.generadoPorId,
        totalRegistros: datos.length,
      },
    });

    // Generar firma digital
    const firma = generateDigitalSignature({
      informeId: informe.id,
      tipo: 'MENSUAL_INVENTARIO',
      periodo: { inicio, fin },
      datos,
    });

    // Actualizar con hash
    await prisma.informe.update({
      where: { id: informe.id },
      data: {
        hashDocumento: firma.hash,
        timestampFirma: new Date(firma.timestamp),
        estado: 'COMPLETADO',
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: params.generadoPorId,
      accion: 'GENERAR_INFORME_MENSUAL',
      entidad: 'Informe',
      entidadId: informe.id,
      estadoNuevo: {
        tipo: 'MENSUAL_INVENTARIO',
        periodo: { inicio, fin },
        totalRegistros: datos.length,
      },
    });

    return {
      success: true,
      informe,
      datos,
      firma,
    };
  } catch (error) {
    console.error('Error al generar informe mensual:', error);
    throw error;
  }
}

/**
 * Obtiene datos para el reporte quincenal de movimientos
 */
export async function obtenerDatosReporteQuincenal(
  periodoInicio: Date,
  periodoFin: Date,
  filtros?: {
    articuloId?: string;
    unidadReceptoraId?: string;
    tipo?: string;
  }
) {
  const where: any = {
    timestamp: {
      gte: periodoInicio,
      lte: periodoFin,
    },
    anulado: false,
  };

  if (filtros?.articuloId) {
    where.articuloId = filtros.articuloId;
  }

  if (filtros?.unidadReceptoraId) {
    where.unidadReceptoraId = filtros.unidadReceptoraId;
  }

  if (filtros?.tipo) {
    where.tipo = filtros.tipo;
  }

  const movimientos = await prisma.movimiento.findMany({
    where,
    include: {
      articulo: {
        select: {
          sku: true,
          nombre: true,
          descripcionSIGAF: true,
          unidadMedida: true,
        },
      },
      lote: {
        select: {
          numeroLote: true,
          fechaVencimiento: true,
        },
      },
      unidadReceptora: {
        select: {
          codigo: true,
          nombre: true,
        },
      },
      usuario: {
        select: {
          nombre: true,
          email: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  return movimientos;
}

/**
 * Genera el reporte quincenal de movimientos
 */
export async function generarReporteQuincenal(params: {
  periodoInicio: Date;
  periodoFin: Date;
  generadoPorId: string;
  filtros?: {
    articuloId?: string;
    unidadReceptoraId?: string;
    tipo?: string;
  };
}) {
  try {
    // Obtener datos
    const movimientos = await obtenerDatosReporteQuincenal(
      params.periodoInicio,
      params.periodoFin,
      params.filtros
    );

    // Crear registro de informe
    const informe = await prisma.informe.create({
      data: {
        tipo: 'QUINCENAL_MOVIMIENTOS',
        estado: 'GENERANDO',
        periodoInicio: params.periodoInicio,
        periodoFin: params.periodoFin,
        generadoPorId: params.generadoPorId,
        totalRegistros: movimientos.length,
      },
    });

    // Generar firma digital
    const firma = generateDigitalSignature({
      informeId: informe.id,
      tipo: 'QUINCENAL_MOVIMIENTOS',
      periodo: { inicio: params.periodoInicio, fin: params.periodoFin },
      totalMovimientos: movimientos.length,
    });

    // Actualizar con hash
    await prisma.informe.update({
      where: { id: informe.id },
      data: {
        hashDocumento: firma.hash,
        timestampFirma: new Date(firma.timestamp),
        estado: 'COMPLETADO',
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: params.generadoPorId,
      accion: 'GENERAR_REPORTE_QUINCENAL',
      entidad: 'Informe',
      entidadId: informe.id,
      estadoNuevo: {
        tipo: 'QUINCENAL_MOVIMIENTOS',
        periodo: { inicio: params.periodoInicio, fin: params.periodoFin },
        totalRegistros: movimientos.length,
      },
    });

    return {
      success: true,
      informe,
      movimientos,
      firma,
    };
  } catch (error) {
    console.error('Error al generar reporte quincenal:', error);
    throw error;
  }
}

/**
 * Genera reporte de vencimientos
 */
export async function generarReporteVencimientos(params: {
  diasAnticipacion?: number;
  incluirVencidos?: boolean;
  generadoPorId: string;
}) {
  try {
    const diasAnticipacion = params.diasAnticipacion || 30;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const where: any = {
      activo: true,
      cantidadDisponible: { gt: 0 },
    };

    if (params.incluirVencidos) {
      where.fechaVencimiento = { lte: fechaLimite };
    } else {
      where.fechaVencimiento = {
        gte: new Date(),
        lte: fechaLimite,
      };
    }

    const lotes = await prisma.lote.findMany({
      where,
      include: {
        articulo: {
          select: {
            sku: true,
            nombre: true,
            descripcionSIGAF: true,
            unidadMedida: true,
          },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    // Calcular días hasta vencimiento
    const lotesConDias = lotes.map((lote) => {
      const diasHastaVencimiento = Math.ceil(
        (lote.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...lote,
        diasHastaVencimiento,
        vencido: diasHastaVencimiento < 0,
        severidad:
          diasHastaVencimiento < 0
            ? 'CRITICA'
            : diasHastaVencimiento <= 7
            ? 'ALTA'
            : diasHastaVencimiento <= 15
            ? 'MEDIA'
            : 'BAJA',
      };
    });

    // Crear registro de informe
    const informe = await prisma.informe.create({
      data: {
        tipo: 'VENCIMIENTOS',
        estado: 'COMPLETADO',
        periodoInicio: new Date(),
        periodoFin: fechaLimite,
        generadoPorId: params.generadoPorId,
        totalRegistros: lotesConDias.length,
      },
    });

    return {
      success: true,
      informe,
      lotes: lotesConDias,
    };
  } catch (error) {
    console.error('Error al generar reporte de vencimientos:', error);
    throw error;
  }
}

/**
 * Exporta datos a formato CSV
 */
export function exportarCSV(
  datos: any[],
  columnas: Array<{ key: string; label: string }>
): string {
  const encabezados = columnas.map((c) => c.label);
  const filas = datos.map((dato) =>
    columnas.map((c) => {
      const valor = c.key.split('.').reduce((obj, key) => obj?.[key], dato);
      return valor !== null && valor !== undefined ? String(valor) : 'N/A';
    })
  );

  const csv = [
    encabezados.join(','),
    ...filas.map((fila) => fila.map((campo) => `"${campo}"`).join(',')),
  ].join('\n');

  return csv;
}

/**
 * Marca un informe como enviado al fiscalizador
 */
export async function marcarComoEnviado(informeId: string, acuseRecibo?: string) {
  const informe = await prisma.informe.update({
    where: { id: informeId },
    data: {
      enviadoFiscalizador: true,
      fechaEnvio: new Date(),
      acuseRecibo,
    },
  });

  await registrarBitacora({
    accion: 'ENVIAR_INFORME_FISCALIZADOR',
    entidad: 'Informe',
    entidadId: informeId,
    estadoNuevo: {
      enviadoFiscalizador: true,
      fechaEnvio: informe.fechaEnvio,
    },
  });

  return informe;
}

/**
 * Verifica si es necesario generar el informe mensual
 */
export async function verificarNecesidadInformeMensual(): Promise<{
  necesario: boolean;
  mensaje: string;
  urgente: boolean;
}> {
  const hoy = new Date();
  const diaActual = hoy.getDate();

  // Solo en los primeros 3 días del mes
  if (diaActual > 3) {
    return {
      necesario: false,
      urgente: false,
      mensaje: 'El informe mensual solo se genera en los primeros 3 días del mes',
    };
  }

  // Verificar si ya existe un informe para el mes anterior
  const mesAnterior = subMonths(hoy, 1);
  const inicio = startOfMonth(mesAnterior);
  const fin = endOfMonth(mesAnterior);

  const informeExistente = await prisma.informe.findFirst({
    where: {
      tipo: 'MENSUAL_INVENTARIO',
      periodoInicio: { gte: inicio },
      periodoFin: { lte: fin },
    },
  });

  if (informeExistente) {
    return {
      necesario: false,
      urgente: false,
      mensaje: `Ya existe un informe mensual para ${format(mesAnterior, 'MMMM yyyy', {
        locale: es,
      })}`,
    };
  }

  return {
    necesario: true,
    urgente: diaActual === 3, // Último día para generar
    mensaje: `Es necesario generar el informe mensual de ${format(mesAnterior, 'MMMM yyyy', {
      locale: es,
    })}`,
  };
}
