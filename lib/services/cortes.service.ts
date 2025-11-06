/**
 * Servicio de Cortes de Existencias
 * REQUERIMIENTO CRÍTICO: Cortes mensuales automáticos y bajo demanda con snapshot inmutable
 */

import { prisma } from '@/lib/prisma';
import { TipoCorte } from '@prisma/client';
import { generateHash } from '@/lib/utils/hash';
import { registrarBitacora } from './bitacora.service';

/**
 * Genera un snapshot de inventario completo
 */
export async function generarSnapshotInventario() {
  const lotes = await prisma.lote.findMany({
    where: {
      activo: true,
      cantidadDisponible: { gt: 0 },
    },
    include: {
      articulo: {
        select: {
          id: true,
          sku: true,
          nombre: true,
          descripcionSIGAF: true,
          unidadMedida: true,
        },
      },
    },
    orderBy: [{ articulo: { nombre: 'asc' } }, { fechaIngresoTs: 'asc' }],
  });

  return lotes.map((lote) => ({
    loteId: lote.id,
    articuloId: lote.articulo.id,
    articuloSku: lote.articulo.sku,
    articuloNombre: lote.articulo.nombre,
    articuloDescripcionSIGAF: lote.articulo.descripcionSIGAF,
    cantidad: lote.cantidadDisponible,
    unidadMedida: lote.articulo.unidadMedida,
    fechaVencimiento: lote.fechaVencimiento,
    numeroLote: lote.numeroLote,
    ubicacion: lote.ubicacion,
    fechaIngreso: lote.fechaIngresoTs,
  }));
}

/**
 * Genera un hash del snapshot para inmutabilidad
 */
function generarHashSnapshot(snapshot: any[]): string {
  const snapshotString = JSON.stringify(snapshot, null, 0);
  return generateHash(snapshotString);
}

/**
 * Crea un corte de existencias
 */
export async function crearCorte(params: {
  tipo: TipoCorte;
  solicitadoPorId: string;
  motivo?: string;
  periodoInicio?: Date;
  periodoFin?: Date;
}) {
  try {
    // Generar snapshot
    const snapshot = await generarSnapshotInventario();

    if (snapshot.length === 0) {
      throw new Error('No hay existencias para generar el corte');
    }

    // Calcular totales
    const totalArticulos = new Set(snapshot.map((s) => s.articuloId)).size;
    const totalLotes = snapshot.length;

    // Generar hash del snapshot
    const hashSnapshot = generarHashSnapshot(snapshot);

    // Crear corte en la base de datos
    const corte = await prisma.$transaction(async (tx) => {
      // Crear registro de corte
      const nuevoCorte = await tx.corte.create({
        data: {
          tipo: params.tipo,
          solicitadoPorId: params.solicitadoPorId,
          motivo: params.motivo,
          periodoInicio: params.periodoInicio,
          periodoFin: params.periodoFin,
          hashSnapshot,
          totalArticulos,
          totalLotes,
          completado: true,
        },
      });

      // Crear detalles del corte
      await tx.corteDetalle.createMany({
        data: snapshot.map((item) => ({
          corteId: nuevoCorte.id,
          articuloId: item.articuloId,
          articuloSku: item.articuloSku,
          articuloNombre: item.articuloNombre,
          articuloDescripcionSIGAF: item.articuloDescripcionSIGAF,
          loteId: item.loteId,
          cantidad: item.cantidad,
          unidadMedida: item.unidadMedida,
          fechaVencimiento: item.fechaVencimiento,
          ubicacion: item.ubicacion || '',
        })),
      });

      // Registrar en bitácora
      await registrarBitacora({
        usuarioId: params.solicitadoPorId,
        accion: 'CREAR_CORTE',
        entidad: 'Corte',
        entidadId: nuevoCorte.id,
        estadoNuevo: {
          tipo: params.tipo,
          totalArticulos,
          totalLotes,
          hashSnapshot,
        },
      });

      return nuevoCorte;
    });

    return {
      success: true,
      corte,
      snapshot,
      totalArticulos,
      totalLotes,
    };
  } catch (error) {
    console.error('Error al crear corte:', error);
    throw error;
  }
}

/**
 * Crea un corte mensual automático
 */
export async function crearCorteMensualAutomatico(solicitadoPorId: string) {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  return crearCorte({
    tipo: 'MENSUAL_AUTOMATICO',
    solicitadoPorId,
    motivo: `Corte mensual automático - ${hoy.toLocaleDateString('es-CR', {
      month: 'long',
      year: 'numeric',
    })}`,
    periodoInicio: primerDia,
    periodoFin: ultimoDia,
  });
}

/**
 * Crea un corte bajo demanda
 */
export async function crearCorteBajoDemanda(params: {
  solicitadoPorId: string;
  motivo: string;
}) {
  if (!params.motivo || params.motivo.trim().length < 10) {
    throw new Error('El motivo debe tener al menos 10 caracteres');
  }

  return crearCorte({
    tipo: 'BAJO_DEMANDA',
    solicitadoPorId: params.solicitadoPorId,
    motivo: params.motivo,
  });
}

/**
 * Crea un corte para compra según demanda
 */
export async function crearCorteCompraSegunDemanda(params: {
  solicitadoPorId: string;
  motivo: string;
}) {
  return crearCorte({
    tipo: 'COMPRA_SEGUN_DEMANDA',
    solicitadoPorId: params.solicitadoPorId,
    motivo: `Compra según demanda: ${params.motivo}`,
  });
}

/**
 * Obtiene un corte con todos sus detalles
 */
export async function obtenerCorte(corteId: string) {
  const corte = await prisma.corte.findUnique({
    where: { id: corteId },
    include: {
      solicitadoPor: {
        select: {
          nombre: true,
          email: true,
          rol: true,
        },
      },
      detalles: {
        orderBy: [{ articuloNombre: 'asc' }],
      },
    },
  });

  if (!corte) {
    throw new Error('Corte no encontrado');
  }

  return corte;
}

/**
 * Verifica la integridad de un corte
 */
export async function verificarIntegridadCorte(corteId: string) {
  const corte = await obtenerCorte(corteId);

  // Reconstruir snapshot desde los detalles
  const snapshotReconstruido = corte.detalles.map((d) => ({
    loteId: d.loteId,
    articuloId: d.articuloId,
    articuloSku: d.articuloSku,
    articuloNombre: d.articuloNombre,
    articuloDescripcionSIGAF: d.articuloDescripcionSIGAF,
    cantidad: d.cantidad,
    unidadMedida: d.unidadMedida,
    fechaVencimiento: d.fechaVencimiento,
    ubicacion: d.ubicacion,
  }));

  // Calcular hash del snapshot reconstruido
  const hashCalculado = generarHashSnapshot(snapshotReconstruido);

  // Comparar con el hash almacenado
  const integroCorrecto = hashCalculado === corte.hashSnapshot;

  return {
    integro: integroCorrecto,
    hashAlmacenado: corte.hashSnapshot,
    hashCalculado,
    mensaje: integroCorrecto
      ? 'El corte es íntegro y no ha sido modificado'
      : 'ADVERTENCIA: El corte ha sido modificado o está corrupto',
  };
}

/**
 * Obtiene todos los cortes con filtros
 */
export async function obtenerCortes(filtros?: {
  tipo?: TipoCorte;
  desde?: Date;
  hasta?: Date;
  limite?: number;
}) {
  const where: any = {};

  if (filtros?.tipo) {
    where.tipo = filtros.tipo;
  }

  if (filtros?.desde || filtros?.hasta) {
    where.timestamp = {};
    if (filtros.desde) where.timestamp.gte = filtros.desde;
    if (filtros.hasta) where.timestamp.lte = filtros.hasta;
  }

  const cortes = await prisma.corte.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filtros?.limite || 50,
    include: {
      solicitadoPor: {
        select: {
          nombre: true,
          email: true,
        },
      },
      _count: {
        select: { detalles: true },
      },
    },
  });

  return cortes;
}

/**
 * Exporta un corte a formato CSV
 */
export function exportarCorteCSV(corte: Awaited<ReturnType<typeof obtenerCorte>>): string {
  const encabezados = [
    'SKU',
    'Artículo',
    'Descripción SIGAF',
    'Lote',
    'Cantidad',
    'Unidad',
    'Fecha Vencimiento',
    'Ubicación',
  ];

  const filas = corte.detalles.map((d) => [
    d.articuloSku,
    d.articuloNombre,
    d.articuloDescripcionSIGAF,
    d.loteId,
    d.cantidad.toString(),
    d.unidadMedida,
    d.fechaVencimiento.toLocaleDateString('es-CR'),
    d.ubicacion || 'N/A',
  ]);

  const csv = [
    encabezados.join(','),
    ...filas.map((fila) => fila.map((campo) => `"${campo}"`).join(',')),
  ].join('\n');

  return csv;
}

/**
 * Verifica si es necesario generar un corte mensual
 */
export async function verificarNecesidadCorteMensual(): Promise<{
  necesario: boolean;
  mensaje: string;
}> {
  const hoy = new Date();
  const diaActual = hoy.getDate();

  // Solo en los primeros 3 días del mes
  if (diaActual > 3) {
    return {
      necesario: false,
      mensaje: 'El corte mensual solo se genera en los primeros 3 días del mes',
    };
  }

  // Verificar si ya existe un corte para este mes
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  const corteExistente = await prisma.corte.findFirst({
    where: {
      tipo: 'MENSUAL_AUTOMATICO',
      timestamp: {
        gte: primerDia,
        lte: ultimoDia,
      },
    },
  });

  if (corteExistente) {
    return {
      necesario: false,
      mensaje: `Ya existe un corte mensual para ${hoy.toLocaleDateString('es-CR', {
        month: 'long',
        year: 'numeric',
      })}`,
    };
  }

  return {
    necesario: true,
    mensaje: `Es necesario generar el corte mensual de ${hoy.toLocaleDateString('es-CR', {
      month: 'long',
      year: 'numeric',
    })}`,
  };
}
