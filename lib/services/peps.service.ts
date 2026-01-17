/**
 * Servicio PEPS/FIFO (Primeras Entradas, Primeras Salidas)
 * REQUERIMIENTO CRÍTICO: Toda salida debe consumir primero el lote más antiguo
 */

import { prisma } from '@/lib/prisma';
import { registrarBitacora } from './bitacora.service';

export interface LotePEPS {
  id: string;
  cantidadDisponible: number;
  fechaIngresoTs: Date;
  fechaVencimiento: Date;
  numeroLote: string | null;
  ubicacion: string | null;
}

/**
 * Obtiene los lotes disponibles para un artículo en orden PEPS
 */
export async function obtenerLotesPEPS(articuloId: string): Promise<LotePEPS[]> {
  const lotes = await prisma.lote.findMany({
    where: {
      articuloId,
      activo: true,
      agotado: false,
      cantidadDisponible: { gt: 0 },
    },
    orderBy: [
      { fechaIngresoTs: 'asc' }, // PEPS: Primero por fecha de ingreso
    ],
    select: {
      id: true,
      cantidadDisponible: true,
      fechaIngresoTs: true,
      fechaVencimiento: true,
      numeroLote: true,
      ubicacion: true,
    },
  });

  return lotes;
}

/**
 * Calcula qué lotes se deben consumir para una cantidad solicitada (algoritmo PEPS)
 */
export function calcularConsumoPEPS(
  lotes: LotePEPS[],
  cantidadSolicitada: number
): Array<{ loteId: string; cantidad: number }> {
  const consumos: Array<{ loteId: string; cantidad: number }> = [];
  let cantidadRestante = cantidadSolicitada;

  for (const lote of lotes) {
    if (cantidadRestante <= 0) break;

    const cantidadAConsumir = Math.min(lote.cantidadDisponible, cantidadRestante);

    consumos.push({
      loteId: lote.id,
      cantidad: cantidadAConsumir,
    });

    cantidadRestante -= cantidadAConsumir;
  }

  return consumos;
}

/**
 * Valida si hay suficiente stock para una salida
 */
export async function validarStockDisponible(
  articuloId: string,
  cantidadSolicitada: number
): Promise<{ disponible: boolean; stockTotal: number; mensaje?: string }> {
  const lotes = await obtenerLotesPEPS(articuloId);

  const stockTotal = lotes.reduce((sum, lote) => sum + lote.cantidadDisponible, 0);

  if (stockTotal >= cantidadSolicitada) {
    return { disponible: true, stockTotal };
  }

  return {
    disponible: false,
    stockTotal,
    mensaje: `Stock insuficiente. Disponible: ${stockTotal}, Solicitado: ${cantidadSolicitada}`,
  };
}

/**
 * Ejecuta una salida PEPS (despacho)
 * FASE 4: Incluye valorización automática basada en costos PEPS
 */
export async function ejecutarSalidaPEPS(params: {
  articuloId: string;
  cantidad: number;
  unidadReceptoraId?: string;
  receptorNombre?: string;
  receptorCedula?: string;
  documentoReferencia?: string;
  observaciones?: string;
  usuarioId: string;
  ip?: string;
  userAgent?: string;
  permitirExcepcion?: boolean; // Para casos excepcionales autorizados
}) {
  // Validar stock disponible
  const validacion = await validarStockDisponible(params.articuloId, params.cantidad);

  if (!validacion.disponible) {
    throw new Error(validacion.mensaje);
  }

  // Obtener lotes en orden PEPS (incluyendo costos para valorización)
  const lotesConCosto = await prisma.lote.findMany({
    where: {
      articuloId: params.articuloId,
      activo: true,
      agotado: false,
      cantidadDisponible: { gt: 0 },
    },
    orderBy: [
      { fechaIngresoTs: 'asc' },
    ],
    select: {
      id: true,
      cantidadDisponible: true,
      fechaIngresoTs: true,
      fechaVencimiento: true,
      numeroLote: true,
      ubicacion: true,
      costoUnitario: true, // FASE 4: Necesario para valorización
    },
  });

  // Calcular consumo
  const consumos = calcularConsumoPEPS(lotesConCosto, params.cantidad);

  if (consumos.length === 0) {
    throw new Error('No se pudo calcular el consumo PEPS');
  }

  // Obtener información del artículo (incluyendo IVA)
  const articulo = await prisma.articulo.findUnique({
    where: { id: params.articuloId },
    select: { unidadMedida: true, nombre: true, sku: true, ivaPercent: true },
  });

  if (!articulo) {
    throw new Error('Artículo no encontrado');
  }

  // FASE 4: Variables para valorización total
  let valorTotalSinIva = 0;
  let valorTotalIva = 0;
  let valorTotalConIva = 0;

  // Ejecutar transacción para garantizar atomicidad
  const movimientos = await prisma.$transaction(async (tx) => {
    const movimientosCreados = [];

    for (const consumo of consumos) {
      // Obtener costo del lote para valorización
      const lote = lotesConCosto.find(l => l.id === consumo.loteId);
      const costoUnitarioPEPS = lote?.costoUnitario || 0;

      // FASE 4: Calcular valorización de esta salida
      const subtotalSinIva = consumo.cantidad * costoUnitarioPEPS;
      const montoIva = subtotalSinIva * (articulo.ivaPercent || 0);
      const totalConIva = subtotalSinIva + montoIva;

      // Acumular totales
      valorTotalSinIva += subtotalSinIva;
      valorTotalIva += montoIva;
      valorTotalConIva += totalConIva;

      // Actualizar cantidad del lote
      const loteActualizado = await tx.lote.update({
        where: { id: consumo.loteId },
        data: {
          cantidadDisponible: { decrement: consumo.cantidad },
        },
      });

      // Marcar como agotado si ya no tiene stock
      if (loteActualizado.cantidadDisponible <= 0) {
        await tx.lote.update({
          where: { id: consumo.loteId },
          data: { agotado: true },
        });
      }

      // Crear movimiento de salida con valorización
      const movimiento = await tx.movimiento.create({
        data: {
          tipo: 'SALIDA',
          articuloId: params.articuloId,
          loteId: consumo.loteId,
          cantidad: consumo.cantidad,
          unidadMedida: articulo.unidadMedida,
          unidadReceptoraId: params.unidadReceptoraId,
          receptorNombre: params.receptorNombre,
          receptorCedula: params.receptorCedula,
          documentoReferencia: params.documentoReferencia,
          observaciones: params.observaciones,
          usuarioId: params.usuarioId,
          ip: params.ip,
          userAgent: params.userAgent,
          // FASE 4: Valorización de la salida
          costoUnitarioPEPS,
          subtotalSinIva: subtotalSinIva > 0 ? subtotalSinIva : null,
          montoIva: montoIva > 0 ? montoIva : null,
          totalConIva: totalConIva > 0 ? totalConIva : null,
        },
      });

      movimientosCreados.push(movimiento);

      // Registrar en bitácora con valorización
      await registrarBitacora({
        usuarioId: params.usuarioId,
        accion: 'SALIDA_PEPS',
        entidad: 'Movimiento',
        entidadId: movimiento.id,
        estadoNuevo: {
          tipo: 'SALIDA',
          articulo: articulo.nombre,
          loteId: consumo.loteId,
          cantidad: consumo.cantidad,
          // FASE 4: Incluir valorización
          costoUnitarioPEPS,
          subtotalSinIva,
          montoIva,
          totalConIva,
        },
        ip: params.ip,
        userAgent: params.userAgent,
      });
    }

    return movimientosCreados;
  });

  return {
    success: true,
    movimientos,
    totalSalida: params.cantidad,
    lotesAfectados: consumos.length,
    // FASE 4: Devolver valorización total del despacho
    valorizacion: {
      subtotalSinIva: valorTotalSinIva,
      montoIva: valorTotalIva,
      totalConIva: valorTotalConIva,
      ivaPercent: articulo.ivaPercent,
    },
  };
}

/**
 * Registra una entrada de inventario (recepción)
 * FASE 3: Incluye valorización automática
 */
export async function ejecutarEntrada(params: {
  articuloId: string;
  cantidad: number;
  fechaVencimiento: Date;
  numeroLote?: string;
  proveedor?: string;
  costoUnitario?: number;
  ubicacion?: string;
  documentoReferencia?: string;
  usuarioId: string;
  ip?: string;
  userAgent?: string;
}) {
  // Obtener información del artículo (incluyendo IVA para valorización)
  const articulo = await prisma.articulo.findUnique({
    where: { id: params.articuloId },
    select: { unidadMedida: true, nombre: true, sku: true, ivaPercent: true },
  });

  if (!articulo) {
    throw new Error('Artículo no encontrado');
  }

  // FASE 3: Calcular valorización
  let subtotalSinIva: number | null = null;
  let montoIva: number | null = null;
  let totalConIva: number | null = null;

  if (params.costoUnitario && params.costoUnitario > 0) {
    subtotalSinIva = params.cantidad * params.costoUnitario;
    montoIva = subtotalSinIva * (articulo.ivaPercent || 0);
    totalConIva = subtotalSinIva + montoIva;
  }

  // Ejecutar transacción
  const resultado = await prisma.$transaction(async (tx) => {
    // Crear nuevo lote con valorización
    const lote = await tx.lote.create({
      data: {
        articuloId: params.articuloId,
        cantidadInicial: params.cantidad,
        cantidadDisponible: params.cantidad,
        fechaVencimiento: params.fechaVencimiento,
        numeroLote: params.numeroLote,
        proveedor: params.proveedor,
        costoUnitario: params.costoUnitario,
        ubicacion: params.ubicacion,
        // FASE 3: Valorización
        subtotalSinIva,
        montoIva,
        totalConIva,
      },
    });

    // Crear movimiento de entrada
    const movimiento = await tx.movimiento.create({
      data: {
        tipo: 'ENTRADA',
        articuloId: params.articuloId,
        loteId: lote.id,
        cantidad: params.cantidad,
        unidadMedida: articulo.unidadMedida,
        documentoReferencia: params.documentoReferencia,
        usuarioId: params.usuarioId,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: params.usuarioId,
      accion: 'ENTRADA_INVENTARIO',
      entidad: 'Lote',
      entidadId: lote.id,
      estadoNuevo: {
        articulo: articulo.nombre,
        cantidad: params.cantidad,
        loteNumero: params.numeroLote,
        fechaVencimiento: params.fechaVencimiento,
        // FASE 3: Incluir valorización en bitácora
        costoUnitario: params.costoUnitario,
        subtotalSinIva,
        montoIva,
        totalConIva,
      },
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return { lote, movimiento };
  });

  return {
    success: true,
    lote: resultado.lote,
    movimiento: resultado.movimiento,
    // FASE 3: Devolver valorización
    valorizacion: {
      subtotalSinIva,
      montoIva,
      totalConIva,
      ivaPercent: articulo.ivaPercent,
    },
  };
}

/**
 * Ejecuta un ajuste de inventario (con motivo obligatorio)
 */
export async function ejecutarAjuste(params: {
  loteId: string;
  nuevoSaldo: number;
  motivo: string;
  usuarioId: string;
  ip?: string;
  userAgent?: string;
}) {
  // Obtener información del lote actual
  const lote = await prisma.lote.findUnique({
    where: { id: params.loteId },
    include: { articulo: true },
  });

  if (!lote) {
    throw new Error('Lote no encontrado');
  }

  const diferencia = params.nuevoSaldo - lote.cantidadDisponible;

  // Ejecutar transacción
  const resultado = await prisma.$transaction(async (tx) => {
    // Actualizar lote
    const loteActualizado = await tx.lote.update({
      where: { id: params.loteId },
      data: {
        cantidadDisponible: params.nuevoSaldo,
        agotado: params.nuevoSaldo <= 0,
      },
    });

    // Crear movimiento de ajuste
    const movimiento = await tx.movimiento.create({
      data: {
        tipo: 'AJUSTE_INVENTARIO',
        articuloId: lote.articuloId,
        loteId: params.loteId,
        cantidad: Math.abs(diferencia),
        unidadMedida: lote.articulo.unidadMedida,
        motivo: params.motivo,
        usuarioId: params.usuarioId,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId: params.usuarioId,
      accion: 'AJUSTE_INVENTARIO',
      entidad: 'Lote',
      entidadId: params.loteId,
      estadoAnterior: {
        cantidadDisponible: lote.cantidadDisponible,
      },
      estadoNuevo: {
        cantidadDisponible: params.nuevoSaldo,
        motivo: params.motivo,
        diferencia,
      },
      ip: params.ip,
      userAgent: params.userAgent,
    });

    return { lote: loteActualizado, movimiento };
  });

  return {
    success: true,
    ...resultado,
    diferencia,
  };
}

/**
 * Obtiene sugerencias FEFO (First Expired, First Out) para alertas
 * NOTA: Esto es INFORMATIVO, no afecta el despacho PEPS operativo
 */
export async function obtenerAlertasFEFO(articuloId: string, diasAnticipacion = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

  const lotesProximosAVencer = await prisma.lote.findMany({
    where: {
      articuloId,
      activo: true,
      agotado: false,
      cantidadDisponible: { gt: 0 },
      fechaVencimiento: { lte: fechaLimite },
    },
    orderBy: { fechaVencimiento: 'asc' },
    include: {
      articulo: {
        select: {
          nombre: true,
          sku: true,
          unidadMedida: true,
        },
      },
    },
  });

  return lotesProximosAVencer.map((lote) => {
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
}
