/**
 * Servicio de Bitácora Inmutable
 * REQUERIMIENTO CRÍTICO: Sistema de auditoría con hashing encadenado
 */

import { prisma } from '@/lib/prisma';
import { generateChainedHash, verifyChainIntegrity } from '@/lib/utils/hash';

export interface BitacoraEntry {
  usuarioId?: string;
  accion: string;
  entidad: string;
  entidadId: string;
  estadoAnterior?: any;
  estadoNuevo?: any;
  ip?: string;
  userAgent?: string;
}

/**
 * Registra una entrada en la bitácora con hash encadenado
 */
export async function registrarBitacora(entry: BitacoraEntry) {
  try {
    // Obtener el último registro para encadenar
    const ultimoRegistro = await prisma.bitacora.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { hashActual: true },
    });

    // Preparar datos para el hash
    const eventData = {
      usuarioId: entry.usuarioId,
      accion: entry.accion,
      entidad: entry.entidad,
      entidadId: entry.entidadId,
      estadoAnterior: entry.estadoAnterior,
      estadoNuevo: entry.estadoNuevo,
      timestamp: new Date().toISOString(),
    };

    // Generar hash encadenado
    const hashAnterior = ultimoRegistro?.hashActual || null;
    const hashActual = generateChainedHash(hashAnterior, eventData);

    // Insertar en la bitácora (append-only)
    const registro = await prisma.bitacora.create({
      data: {
        usuarioId: entry.usuarioId,
        accion: entry.accion,
        entidad: entry.entidad,
        entidadId: entry.entidadId,
        estadoAnterior: entry.estadoAnterior ? JSON.stringify(entry.estadoAnterior) : null,
        estadoNuevo: entry.estadoNuevo ? JSON.stringify(entry.estadoNuevo) : null,
        ip: entry.ip,
        userAgent: entry.userAgent,
        hashActual,
        hashAnterior,
      },
    });

    return registro;
  } catch (error) {
    console.error('Error al registrar en bitácora:', error);
    throw error;
  }
}

/**
 * Verifica la integridad completa de la bitácora
 */
export async function verificarIntegridad(options?: {
  desde?: Date;
  hasta?: Date;
  limite?: number;
}) {
  try {
    const where: any = {};

    if (options?.desde || options?.hasta) {
      where.timestamp = {};
      if (options.desde) where.timestamp.gte = options.desde;
      if (options.hasta) where.timestamp.lte = options.hasta;
    }

    const registros = await prisma.bitacora.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: options?.limite,
      select: {
        id: true,
        hashActual: true,
        hashAnterior: true,
        timestamp: true,
        accion: true,
        entidad: true,
        entidadId: true,
      },
    });

    const resultado = verifyChainIntegrity(registros);

    return {
      ...resultado,
      totalRegistros: registros.length,
      primerRegistro: registros[0]?.timestamp,
      ultimoRegistro: registros[registros.length - 1]?.timestamp,
    };
  } catch (error) {
    console.error('Error al verificar integridad:', error);
    throw error;
  }
}

/**
 * Exporta la bitácora para auditoría externa
 */
export async function exportarBitacora(options?: {
  desde?: Date;
  hasta?: Date;
  entidad?: string;
  usuarioId?: string;
}) {
  try {
    const where: any = {};

    if (options?.desde || options?.hasta) {
      where.timestamp = {};
      if (options.desde) where.timestamp.gte = options.desde;
      if (options.hasta) where.timestamp.lte = options.hasta;
    }

    if (options?.entidad) {
      where.entidad = options.entidad;
    }

    if (options?.usuarioId) {
      where.usuarioId = options.usuarioId;
    }

    const registros = await prisma.bitacora.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        usuario: {
          select: {
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    return registros.map((r) => ({
      id: r.id,
      fecha: r.timestamp,
      usuario: r.usuario ? `${r.usuario.nombre} (${r.usuario.email})` : 'Sistema',
      rol: r.usuario?.rol || 'SISTEMA',
      accion: r.accion,
      entidad: r.entidad,
      entidadId: r.entidadId,
      estadoAnterior: r.estadoAnterior,
      estadoNuevo: r.estadoNuevo,
      ip: r.ip,
      userAgent: r.userAgent,
      hashActual: r.hashActual,
      hashAnterior: r.hashAnterior,
    }));
  } catch (error) {
    console.error('Error al exportar bitácora:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de cambios de una entidad específica
 */
export async function obtenerHistorialEntidad(entidad: string, entidadId: string) {
  try {
    const registros = await prisma.bitacora.findMany({
      where: {
        entidad,
        entidadId,
      },
      orderBy: { timestamp: 'desc' },
      include: {
        usuario: {
          select: {
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    return registros;
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw error;
  }
}
