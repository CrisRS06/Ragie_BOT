/**
 * Servicio de Exportación a Excel
 * FASE 7: Exportación de reportes a formato Excel (.xlsx)
 */

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';

/**
 * Genera reporte de inventario en Excel
 */
export async function generarExcelInventario(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema PEPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Inventario', {
    headerFooter: {
      firstHeader: 'Reporte de Inventario - Sistema PEPS',
    },
  });

  // Encabezados
  sheet.columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Artículo', key: 'nombre', width: 30 },
    { header: 'Descripción SIGAF', key: 'descripcionSIGAF', width: 40 },
    { header: 'Marca', key: 'marca', width: 15 },
    { header: 'Unidad', key: 'unidadMedida', width: 10 },
    { header: 'Stock Total', key: 'stockTotal', width: 12 },
    { header: 'Stock Mínimo', key: 'stockMinimo', width: 12 },
    { header: 'IVA %', key: 'ivaPercent', width: 10 },
    { header: 'Lotes Activos', key: 'lotesActivos', width: 12 },
  ];

  // Estilo de encabezados
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Obtener datos
  const articulos = await prisma.articulo.findMany({
    where: { activo: true },
    include: {
      lotes: {
        where: {
          activo: true,
          agotado: false,
          cantidadDisponible: { gt: 0 },
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  // Agregar filas
  for (const art of articulos) {
    const stockTotal = art.lotes.reduce((sum, l) => sum + l.cantidadDisponible, 0);
    sheet.addRow({
      sku: art.sku,
      nombre: art.nombre,
      descripcionSIGAF: art.descripcionSIGAF,
      marca: art.marca || '',
      unidadMedida: art.unidadMedida,
      stockTotal,
      stockMinimo: art.stockMinimo || 0,
      ivaPercent: (art.ivaPercent * 100) + '%',
      lotesActivos: art.lotes.length,
    });
  }

  // Agregar totales
  const lastRow = sheet.lastRow?.number || 1;
  sheet.addRow({});
  sheet.addRow({
    sku: 'TOTAL',
    stockTotal: { formula: `SUM(F2:F${lastRow})` },
    lotesActivos: { formula: `SUM(I2:I${lastRow})` },
  });
  sheet.getRow(lastRow + 2).font = { bold: true };

  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Genera reporte de valor de bodega en Excel
 */
export async function generarExcelValorBodega(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema PEPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Valor de Bodega', {
    headerFooter: {
      firstHeader: 'Reporte de Valor de Bodega - Sistema PEPS',
    },
  });

  // Encabezados
  sheet.columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Artículo', key: 'nombre', width: 30 },
    { header: 'Marca', key: 'marca', width: 15 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'IVA %', key: 'ivaPercent', width: 10 },
    { header: 'Valor Sin IVA', key: 'valorSinIva', width: 15 },
    { header: 'Monto IVA', key: 'montoIva', width: 15 },
    { header: 'Valor Con IVA', key: 'valorConIva', width: 15 },
  ];

  // Estilo de encabezados
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF217346' },
  };

  // Obtener datos
  const articulos = await prisma.articulo.findMany({
    where: { activo: true },
    include: {
      lotes: {
        where: {
          activo: true,
          agotado: false,
          cantidadDisponible: { gt: 0 },
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  let totalSinIva = 0;
  let totalIva = 0;
  let totalConIva = 0;

  // Agregar filas
  for (const art of articulos) {
    let cantidadTotal = 0;
    let valorSinIva = 0;

    for (const lote of art.lotes) {
      cantidadTotal += lote.cantidadDisponible;
      valorSinIva += lote.cantidadDisponible * (lote.costoUnitario || 0);
    }

    const montoIva = valorSinIva * (art.ivaPercent || 0);
    const valorConIva = valorSinIva + montoIva;

    totalSinIva += valorSinIva;
    totalIva += montoIva;
    totalConIva += valorConIva;

    sheet.addRow({
      sku: art.sku,
      nombre: art.nombre,
      marca: art.marca || '',
      cantidad: cantidadTotal,
      unidad: art.unidadMedida,
      ivaPercent: (art.ivaPercent * 100) + '%',
      valorSinIva,
      montoIva,
      valorConIva,
    });
  }

  // Formatear columnas de moneda
  ['G', 'H', 'I'].forEach(col => {
    sheet.getColumn(col).numFmt = '"₡"#,##0.00';
  });

  // Agregar totales
  const lastRow = sheet.lastRow?.number || 1;
  sheet.addRow({});
  const totalRow = sheet.addRow({
    sku: 'TOTAL',
    valorSinIva: totalSinIva,
    montoIva: totalIva,
    valorConIva: totalConIva,
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCFFCC' },
  };

  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Genera Kardex de un artículo en Excel
 */
export async function generarExcelKardex(
  articuloId: string,
  fechaDesde?: string,
  fechaHasta?: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema PEPS';
  workbook.created = new Date();

  // Obtener artículo
  const articulo = await prisma.articulo.findUnique({
    where: { id: articuloId },
  });

  if (!articulo) {
    throw new Error('Artículo no encontrado');
  }

  const sheet = workbook.addWorksheet(`Kardex ${articulo.sku}`, {
    headerFooter: {
      firstHeader: `Kardex - ${articulo.nombre}`,
    },
  });

  // Info del artículo
  sheet.addRow(['KARDEX - SISTEMA PEPS']);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow(['Artículo:', articulo.nombre]);
  sheet.addRow(['SKU:', articulo.sku]);
  sheet.addRow(['Unidad:', articulo.unidadMedida]);
  sheet.addRow(['Fecha de Reporte:', new Date().toLocaleDateString('es-CR')]);
  sheet.addRow([]);

  // Encabezados de movimientos
  const headerRow = sheet.addRow([
    'Fecha',
    'Tipo',
    'Descripción',
    'Lote',
    'Entrada',
    'Salida',
    'Costo Unit.',
    'Valor Mov.',
    'Saldo Cant.',
    'Saldo Valor',
  ]);

  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  // Construir filtros
  const filtroFecha: Record<string, Date> = {};
  if (fechaDesde) filtroFecha.gte = new Date(fechaDesde);
  if (fechaHasta) {
    const fechaFin = new Date(fechaHasta);
    fechaFin.setHours(23, 59, 59, 999);
    filtroFecha.lte = fechaFin;
  }

  // Obtener movimientos
  const movimientos = await prisma.movimiento.findMany({
    where: {
      articuloId,
      anulado: false,
      ...(Object.keys(filtroFecha).length > 0 ? { timestamp: filtroFecha } : {}),
    },
    include: {
      lote: true,
      unidadReceptora: true,
    },
    orderBy: { timestamp: 'asc' },
  });

  // Calcular saldos
  let saldoCantidad = 0;
  let saldoValor = 0;

  for (const mov of movimientos) {
    const costoUnitario = mov.costoUnitarioPEPS || mov.lote?.costoUnitario || 0;
    const valorMov = mov.cantidad * costoUnitario;

    let entrada = 0;
    let salida = 0;
    let descripcion = '';

    if (mov.tipo === 'ENTRADA') {
      entrada = mov.cantidad;
      saldoCantidad += mov.cantidad;
      saldoValor += valorMov;
      descripcion = `Recepción - ${mov.lote?.numeroLote || 'Sin lote'}`;
    } else if (mov.tipo === 'SALIDA') {
      salida = mov.cantidad;
      saldoCantidad -= mov.cantidad;
      saldoValor -= valorMov;
      descripcion = mov.unidadReceptora
        ? `Despacho a ${mov.unidadReceptora.nombre}`
        : `Despacho a ${mov.receptorNombre || 'N/A'}`;
    } else if (mov.tipo === 'AJUSTE_INVENTARIO') {
      descripcion = `Ajuste: ${mov.motivo || 'Sin motivo'}`;
      if (mov.motivo?.toLowerCase().includes('faltante') ||
          mov.motivo?.toLowerCase().includes('merma')) {
        salida = mov.cantidad;
        saldoCantidad -= mov.cantidad;
        saldoValor -= valorMov;
      } else {
        entrada = mov.cantidad;
        saldoCantidad += mov.cantidad;
        saldoValor += valorMov;
      }
    }

    sheet.addRow([
      mov.timestamp.toLocaleDateString('es-CR') + ' ' + mov.timestamp.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
      mov.tipo,
      descripcion,
      mov.lote?.numeroLote || '-',
      entrada || '',
      salida || '',
      costoUnitario,
      valorMov,
      saldoCantidad,
      saldoValor,
    ]);
  }

  // Ajustar anchos
  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 30;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 12;
  sheet.getColumn(8).width = 15;
  sheet.getColumn(9).width = 12;
  sheet.getColumn(10).width = 15;

  // Formatear columnas de moneda
  ['G', 'H', 'J'].forEach(col => {
    sheet.getColumn(col).numFmt = '"₡"#,##0.00';
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Genera reporte de entregas por albergue en Excel
 */
export async function generarExcelEntregasPorAlbergue(
  fechaDesde?: string,
  fechaHasta?: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema PEPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Entregas por Albergue');

  // Encabezados
  sheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Albergue', key: 'albergue', width: 25 },
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Artículo', key: 'articulo', width: 25 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'Receptor', key: 'receptor', width: 20 },
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Valor', key: 'valor', width: 15 },
  ];

  // Estilo de encabezados
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7030A0' },
  };

  // Construir filtros
  const filtroFecha: Record<string, Date> = {};
  if (fechaDesde) filtroFecha.gte = new Date(fechaDesde);
  if (fechaHasta) {
    const fechaFin = new Date(fechaHasta);
    fechaFin.setHours(23, 59, 59, 999);
    filtroFecha.lte = fechaFin;
  }

  // Obtener despachos
  const despachos = await prisma.movimiento.findMany({
    where: {
      tipo: 'SALIDA',
      anulado: false,
      unidadReceptoraId: { not: null },
      ...(Object.keys(filtroFecha).length > 0 ? { timestamp: filtroFecha } : {}),
    },
    include: {
      articulo: true,
      unidadReceptora: true,
    },
    orderBy: [
      { unidadReceptoraId: 'asc' },
      { timestamp: 'desc' },
    ],
  });

  // Agregar filas
  for (const desp of despachos) {
    sheet.addRow({
      fecha: desp.timestamp.toLocaleDateString('es-CR') + ' ' + desp.timestamp.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
      albergue: desp.unidadReceptora?.nombre || 'N/A',
      codigo: desp.unidadReceptora?.codigo || '',
      articulo: desp.articulo.nombre,
      cantidad: desp.cantidad,
      unidad: desp.articulo.unidadMedida,
      receptor: desp.receptorNombre || '',
      cedula: desp.receptorCedula || '',
      valor: desp.totalConIva || (desp.cantidad * (desp.costoUnitarioPEPS || 0)),
    });
  }

  // Formatear columna de valor
  sheet.getColumn('I').numFmt = '"₡"#,##0.00';

  return await workbook.xlsx.writeBuffer() as Buffer;
}
