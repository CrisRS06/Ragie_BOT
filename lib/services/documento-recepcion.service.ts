/**
 * Servicio de Documentos de Recepción Multi-Producto
 * Maneja la lógica de negocio para recepciones con múltiples líneas
 */

import { prisma } from '@/lib/prisma';
import { registrarBitacora } from './bitacora.service';
import { EstadoDocumentoRecepcion } from '@prisma/client';

export interface LineaRecepcion {
  articuloId: string;
  cantidad: number;
  costoUnitario?: number;
  fechaVencimiento: Date;
  numeroLoteProveedor?: string;
  ubicacion?: string;
}

export interface CrearDocumentoRecepcionInput {
  proveedorId?: string;
  documentoExterno?: string;
  fechaDocumento?: Date;
  observaciones?: string;
  lineas: LineaRecepcion[];
  usuarioId: string;
  ip?: string;
  userAgent?: string;
}

export interface DocumentoRecepcionResult {
  success: boolean;
  documento: {
    id: string;
    numero: string;
    estado: EstadoDocumentoRecepcion;
    totalLineas: number;
    subtotalSinIva: number;
    montoIva: number;
    totalConIva: number;
  };
  message?: string;
}

/**
 * Genera el número de documento secuencial
 * Formato: REC-YYYY-NNNNN
 */
async function generarNumeroDocumento(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  // Buscar el último documento del año actual
  const ultimoDocumento = await prisma.documentoRecepcion.findFirst({
    where: {
      numero: {
        startsWith: prefix,
      },
    },
    orderBy: {
      numero: 'desc',
    },
    select: {
      numero: true,
    },
  });

  let secuencia = 1;
  if (ultimoDocumento) {
    const match = ultimoDocumento.numero.match(/REC-\d{4}-(\d{5})/);
    if (match) {
      secuencia = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(secuencia).padStart(5, '0')}`;
}

/**
 * Crea un nuevo documento de recepción en estado BORRADOR
 */
export async function crearDocumentoRecepcion(
  input: CrearDocumentoRecepcionInput
): Promise<DocumentoRecepcionResult> {
  const {
    proveedorId,
    documentoExterno,
    fechaDocumento,
    observaciones,
    lineas,
    usuarioId,
    ip,
    userAgent,
  } = input;

  if (lineas.length === 0) {
    throw new Error('El documento debe tener al menos una línea');
  }

  // Obtener artículos para calcular IVA
  const articuloIds = [...new Set(lineas.map((l) => l.articuloId))];
  const articulos = await prisma.articulo.findMany({
    where: { id: { in: articuloIds } },
    select: { id: true, ivaPercent: true, nombre: true, unidadMedida: true },
  });
  const articulosMap = new Map(articulos.map((a) => [a.id, a]));

  // Validar que todos los artículos existan
  for (const linea of lineas) {
    if (!articulosMap.has(linea.articuloId)) {
      throw new Error(`Artículo no encontrado: ${linea.articuloId}`);
    }
  }

  // Generar número de documento
  const numero = await generarNumeroDocumento();

  // Calcular totales
  let subtotalSinIva = 0;
  let montoIva = 0;

  const lineasConValores = lineas.map((linea, index) => {
    const articulo = articulosMap.get(linea.articuloId)!;
    const costoUnitario = linea.costoUnitario || 0;
    const lineaSubtotal = linea.cantidad * costoUnitario;
    const lineaIva = lineaSubtotal * (articulo.ivaPercent || 0);

    subtotalSinIva += lineaSubtotal;
    montoIva += lineaIva;

    return {
      numeroLinea: index + 1,
      articuloId: linea.articuloId,
      cantidad: linea.cantidad,
      costoUnitario: costoUnitario > 0 ? costoUnitario : null,
      fechaVencimiento: linea.fechaVencimiento,
      numeroLoteProveedor: linea.numeroLoteProveedor || null,
      ubicacion: linea.ubicacion || null,
      subtotalSinIva: lineaSubtotal > 0 ? lineaSubtotal : null,
      montoIva: lineaIva > 0 ? lineaIva : null,
      totalConIva: lineaSubtotal + lineaIva > 0 ? lineaSubtotal + lineaIva : null,
    };
  });

  const totalConIva = subtotalSinIva + montoIva;

  // Crear documento con detalles en una transacción
  const documento = await prisma.$transaction(async (tx) => {
    const doc = await tx.documentoRecepcion.create({
      data: {
        numero,
        proveedorId,
        documentoExterno,
        fechaDocumento,
        subtotalSinIva,
        montoIva,
        totalConIva,
        estado: 'BORRADOR',
        observaciones,
        usuarioId,
        ip,
        userAgent,
        detalles: {
          create: lineasConValores,
        },
      },
      include: {
        detalles: true,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'CREAR_DOCUMENTO_RECEPCION',
      entidad: 'DocumentoRecepcion',
      entidadId: doc.id,
      estadoNuevo: {
        numero: doc.numero,
        totalLineas: doc.detalles.length,
        subtotalSinIva,
        montoIva,
        totalConIva,
      },
      ip,
      userAgent,
    });

    return doc;
  });

  return {
    success: true,
    documento: {
      id: documento.id,
      numero: documento.numero,
      estado: documento.estado,
      totalLineas: documento.detalles.length,
      subtotalSinIva: documento.subtotalSinIva,
      montoIva: documento.montoIva,
      totalConIva: documento.totalConIva,
    },
  };
}

/**
 * Procesa un documento de recepción en estado BORRADOR
 * Crea los lotes y movimientos correspondientes
 */
export async function procesarDocumentoRecepcion(params: {
  documentoId: string;
  usuarioId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{
  success: boolean;
  documento: {
    id: string;
    numero: string;
    estado: EstadoDocumentoRecepcion;
  };
  lotesCreados: number;
  movimientosCreados: number;
  message?: string;
}> {
  const { documentoId, usuarioId, ip, userAgent } = params;

  // Obtener documento con detalles
  const documento = await prisma.documentoRecepcion.findUnique({
    where: { id: documentoId },
    include: {
      detalles: {
        where: { procesado: false, anulado: false },
        include: {
          articulo: {
            select: { unidadMedida: true, nombre: true, ivaPercent: true },
          },
        },
        orderBy: { numeroLinea: 'asc' },
      },
    },
  });

  if (!documento) {
    throw new Error('Documento no encontrado');
  }

  if (documento.estado !== 'BORRADOR') {
    throw new Error(`El documento no está en estado BORRADOR (estado actual: ${documento.estado})`);
  }

  if (documento.detalles.length === 0) {
    throw new Error('No hay líneas pendientes de procesar');
  }

  // Procesar cada línea creando lotes y movimientos
  const resultado = await prisma.$transaction(async (tx) => {
    let lotesCreados = 0;
    let movimientosCreados = 0;

    for (const detalle of documento.detalles) {
      // Crear lote con timestamp único para PEPS
      // Agregar un pequeño delay en el timestamp para garantizar orden PEPS
      const timestampPEPS = new Date(Date.now() + detalle.numeroLinea);

      const lote = await tx.lote.create({
        data: {
          articuloId: detalle.articuloId,
          cantidadInicial: detalle.cantidad,
          cantidadDisponible: detalle.cantidad,
          fechaIngresoTs: timestampPEPS,
          fechaVencimiento: detalle.fechaVencimiento,
          numeroLote: detalle.numeroLoteProveedor,
          proveedor: documento.documentoExterno, // Usar documento externo como referencia
          costoUnitario: detalle.costoUnitario,
          ubicacion: detalle.ubicacion,
          subtotalSinIva: detalle.subtotalSinIva,
          montoIva: detalle.montoIva,
          totalConIva: detalle.totalConIva,
        },
      });
      lotesCreados++;

      // Crear movimiento de entrada
      const movimiento = await tx.movimiento.create({
        data: {
          tipo: 'ENTRADA',
          articuloId: detalle.articuloId,
          loteId: lote.id,
          cantidad: detalle.cantidad,
          unidadMedida: detalle.articulo.unidadMedida,
          documentoReferencia: documento.numero,
          usuarioId,
          ip,
          userAgent,
        },
      });
      movimientosCreados++;

      // Actualizar detalle con referencias al lote y movimiento
      await tx.detalleRecepcion.update({
        where: { id: detalle.id },
        data: {
          loteId: lote.id,
          movimientoId: movimiento.id,
          procesado: true,
        },
      });

      // Registrar en bitácora cada lote creado
      await registrarBitacora({
        usuarioId,
        accion: 'ENTRADA_INVENTARIO',
        entidad: 'Lote',
        entidadId: lote.id,
        estadoNuevo: {
          documentoRecepcion: documento.numero,
          articulo: detalle.articulo.nombre,
          cantidad: detalle.cantidad,
          loteNumero: detalle.numeroLoteProveedor,
          fechaVencimiento: detalle.fechaVencimiento,
          costoUnitario: detalle.costoUnitario,
        },
        ip,
        userAgent,
      });
    }

    // Actualizar estado del documento
    await tx.documentoRecepcion.update({
      where: { id: documentoId },
      data: {
        estado: 'PROCESADO',
      },
    });

    // Registrar cambio de estado en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'PROCESAR_DOCUMENTO_RECEPCION',
      entidad: 'DocumentoRecepcion',
      entidadId: documentoId,
      estadoAnterior: { estado: 'BORRADOR' },
      estadoNuevo: {
        estado: 'PROCESADO',
        lotesCreados,
        movimientosCreados,
      },
      ip,
      userAgent,
    });

    return { lotesCreados, movimientosCreados };
  });

  return {
    success: true,
    documento: {
      id: documento.id,
      numero: documento.numero,
      estado: 'PROCESADO',
    },
    ...resultado,
  };
}

/**
 * Anula un documento de recepción
 * Si está en BORRADOR, solo cambia el estado
 * Si está PROCESADO, revierte los lotes y movimientos
 */
export async function anularDocumentoRecepcion(params: {
  documentoId: string;
  motivo: string;
  usuarioId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{
  success: boolean;
  documento: {
    id: string;
    numero: string;
    estado: EstadoDocumentoRecepcion;
  };
  message?: string;
}> {
  const { documentoId, motivo, usuarioId, ip, userAgent } = params;

  if (!motivo || motivo.trim().length < 10) {
    throw new Error('El motivo de anulación debe tener al menos 10 caracteres');
  }

  // Obtener documento con detalles
  const documento = await prisma.documentoRecepcion.findUnique({
    where: { id: documentoId },
    include: {
      detalles: {
        include: {
          lote: true,
        },
      },
    },
  });

  if (!documento) {
    throw new Error('Documento no encontrado');
  }

  if (documento.estado === 'ANULADO_TOTAL') {
    throw new Error('El documento ya está anulado');
  }

  const resultado = await prisma.$transaction(async (tx) => {
    // Si el documento está procesado, verificar si se puede revertir
    if (documento.estado === 'PROCESADO') {
      // Verificar que ningún lote tenga salidas
      for (const detalle of documento.detalles) {
        if (detalle.lote && detalle.lote.cantidadDisponible < detalle.lote.cantidadInicial) {
          throw new Error(
            `No se puede anular: el lote de línea ${detalle.numeroLinea} ya tiene salidas registradas`
          );
        }
      }

      // Revertir lotes (marcar como inactivos/agotados)
      for (const detalle of documento.detalles) {
        if (detalle.loteId) {
          await tx.lote.update({
            where: { id: detalle.loteId },
            data: {
              activo: false,
              agotado: true,
              cantidadDisponible: 0,
            },
          });
        }

        // Anular movimiento
        if (detalle.movimientoId) {
          await tx.movimiento.update({
            where: { id: detalle.movimientoId },
            data: {
              anulado: true,
              motivoAnulacion: motivo,
              anuladoEn: new Date(),
              anuladoPorId: usuarioId,
            },
          });
        }

        // Marcar detalle como anulado
        await tx.detalleRecepcion.update({
          where: { id: detalle.id },
          data: {
            anulado: true,
            motivoAnulacion: motivo,
          },
        });
      }
    }

    // Actualizar documento
    await tx.documentoRecepcion.update({
      where: { id: documentoId },
      data: {
        estado: 'ANULADO_TOTAL',
        motivoAnulacion: motivo,
        anuladoEn: new Date(),
        anuladoPorId: usuarioId,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'ANULAR_DOCUMENTO_RECEPCION',
      entidad: 'DocumentoRecepcion',
      entidadId: documentoId,
      estadoAnterior: { estado: documento.estado },
      estadoNuevo: {
        estado: 'ANULADO_TOTAL',
        motivo,
      },
      ip,
      userAgent,
    });

    return 'ANULADO_TOTAL' as EstadoDocumentoRecepcion;
  });

  return {
    success: true,
    documento: {
      id: documento.id,
      numero: documento.numero,
      estado: resultado,
    },
    message: 'Documento anulado correctamente',
  };
}

/**
 * Obtiene un documento de recepción con sus detalles
 */
export async function obtenerDocumentoRecepcion(documentoId: string) {
  const documento = await prisma.documentoRecepcion.findUnique({
    where: { id: documentoId },
    include: {
      proveedor: {
        select: { id: true, codigo: true, nombre: true },
      },
      usuario: {
        select: { id: true, nombre: true },
      },
      detalles: {
        include: {
          articulo: {
            select: {
              id: true,
              sku: true,
              nombre: true,
              descripcionSIGAF: true,
              unidadMedida: true,
              ivaPercent: true,
            },
          },
          lote: {
            select: {
              id: true,
              cantidadDisponible: true,
              agotado: true,
            },
          },
        },
        orderBy: { numeroLinea: 'asc' },
      },
    },
  });

  return documento;
}

/**
 * Lista documentos de recepción con filtros
 */
export async function listarDocumentosRecepcion(params: {
  estado?: EstadoDocumentoRecepcion;
  proveedorId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  limite?: number;
  offset?: number;
}) {
  const { estado, proveedorId, fechaDesde, fechaHasta, limite = 20, offset = 0 } = params;

  const where: Record<string, unknown> = {};

  if (estado) {
    where.estado = estado;
  }

  if (proveedorId) {
    where.proveedorId = proveedorId;
  }

  if (fechaDesde || fechaHasta) {
    where.timestamp = {};
    if (fechaDesde) {
      (where.timestamp as Record<string, Date>).gte = fechaDesde;
    }
    if (fechaHasta) {
      (where.timestamp as Record<string, Date>).lte = fechaHasta;
    }
  }

  const [documentos, total] = await Promise.all([
    prisma.documentoRecepcion.findMany({
      where,
      include: {
        proveedor: {
          select: { codigo: true, nombre: true },
        },
        usuario: {
          select: { nombre: true },
        },
        _count: {
          select: { detalles: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limite,
      skip: offset,
    }),
    prisma.documentoRecepcion.count({ where }),
  ]);

  return {
    data: documentos,
    total,
    limite,
    offset,
  };
}
