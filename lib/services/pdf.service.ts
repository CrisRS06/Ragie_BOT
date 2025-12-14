/**
 * Servicio de Generación de PDFs
 * Utiliza pdfkit para generar documentos con firma digital
 */

import PDFDocument from 'pdfkit';
import { generateDocumentHash } from '@/lib/utils/hash';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PDFOptions {
  titulo: string;
  subtitulo?: string;
  generadoPor?: string;
  incluirFirma?: boolean;
}

interface TablaColumna {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Crea un documento PDF base con encabezado institucional
 */
export function crearDocumentoBase(options: PDFOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: options.titulo,
      Author: 'Sistema PEPS - PANI Costa Rica',
      Creator: 'Sistema de Inventario PEPS',
    },
  });

  // Encabezado
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('PATRONATO NACIONAL DE LA INFANCIA', { align: 'center' })
    .fontSize(14)
    .text('Sistema de Inventario PEPS', { align: 'center' })
    .moveDown(0.5);

  // Título del documento
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(options.titulo.toUpperCase(), { align: 'center' });

  if (options.subtitulo) {
    doc.fontSize(12).font('Helvetica').text(options.subtitulo, { align: 'center' });
  }

  doc.moveDown();

  // Línea separadora
  doc
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke();

  doc.moveDown();

  // Información de generación
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Fecha de generación: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, {
      align: 'right',
    });

  if (options.generadoPor) {
    doc.text(`Generado por: ${options.generadoPor}`, { align: 'right' });
  }

  doc.moveDown();

  return doc;
}

/**
 * Agrega una tabla al documento PDF
 */
export function agregarTabla(
  doc: PDFKit.PDFDocument,
  datos: Record<string, any>[],
  columnas: TablaColumna[],
  options?: { fontSize?: number; headerBackground?: string }
): void {
  const fontSize = options?.fontSize || 9;
  const startX = 50;
  const pageWidth = doc.page.width - 100;
  const rowHeight = 20;

  // Calcular anchos de columna
  const totalDefinedWidth = columnas.reduce((sum, col) => sum + (col.width || 0), 0);
  const undefinedCount = columnas.filter((col) => !col.width).length;
  const remainingWidth = pageWidth - totalDefinedWidth;
  const defaultWidth = undefinedCount > 0 ? remainingWidth / undefinedCount : 0;

  const columnWidths = columnas.map((col) => col.width || defaultWidth);

  // Encabezados
  doc.font('Helvetica-Bold').fontSize(fontSize);

  let currentX = startX;
  columnas.forEach((col, i) => {
    doc.text(col.label, currentX, doc.y, {
      width: columnWidths[i],
      align: col.align || 'left',
    });
    currentX += columnWidths[i];
  });

  doc.moveDown(0.5);

  // Línea bajo encabezados
  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + pageWidth, doc.y)
    .stroke();

  doc.moveDown(0.3);

  // Filas de datos
  doc.font('Helvetica').fontSize(fontSize);

  datos.forEach((fila, rowIndex) => {
    // Verificar si necesitamos nueva página
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      doc.y = 50;
    }

    currentX = startX;
    const startY = doc.y;

    columnas.forEach((col, i) => {
      let valor: unknown = col.key.split('.').reduce((obj: Record<string, unknown>, key) => obj?.[key] as Record<string, unknown>, fila as Record<string, unknown>);

      // Formatear fechas
      if (valor instanceof Date) {
        valor = format(valor, 'dd/MM/yyyy');
      }

      doc.text(valor?.toString() || '-', currentX, startY, {
        width: columnWidths[i],
        align: col.align || 'left',
      });
      currentX += columnWidths[i];
    });

    doc.y = startY + rowHeight;

    // Línea separadora cada 5 filas
    if ((rowIndex + 1) % 5 === 0) {
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + pageWidth, doc.y)
        .strokeOpacity(0.3)
        .stroke()
        .strokeOpacity(1);
    }
  });

  doc.moveDown();
}

/**
 * Agrega firma digital al documento
 */
export function agregarFirmaDigital(
  doc: PDFKit.PDFDocument,
  datos: any,
  options?: { incluirQR?: boolean }
): { hash: string; timestamp: string; codigoVerificacion: string } {
  const timestamp = new Date().toISOString();
  const hash = generateDocumentHash(JSON.stringify({ datos, timestamp }));
  const codigoVerificacion = hash.substring(0, 16).toUpperCase();

  // Ir al final del documento
  doc.addPage();

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('FIRMA DIGITAL', { align: 'center' })
    .moveDown();

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Este documento ha sido firmado digitalmente.', { align: 'center' })
    .moveDown();

  // Recuadro de verificación
  const boxX = 100;
  const boxY = doc.y;
  const boxWidth = doc.page.width - 200;
  const boxHeight = 80;

  doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

  doc
    .fontSize(9)
    .text(`Hash SHA-256:`, boxX + 10, boxY + 10)
    .font('Courier')
    .fontSize(8)
    .text(hash, boxX + 10, boxY + 25, { width: boxWidth - 20 })
    .font('Helvetica')
    .fontSize(9)
    .text(`Timestamp: ${timestamp}`, boxX + 10, boxY + 50)
    .text(`Código de verificación: ${codigoVerificacion}`, boxX + 10, boxY + 65);

  doc.moveDown(5);

  doc
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'Para verificar la autenticidad de este documento, utilice el código de verificación en el sistema.',
      { align: 'center' }
    )
    .fillColor('#000000');

  return { hash, timestamp, codigoVerificacion };
}

/**
 * Genera PDF de informe mensual de inventario
 */
export async function generarPDFInformeMensual(params: {
  datos: any[];
  periodoInicio: Date;
  periodoFin: Date;
  generadoPor: string;
}): Promise<{ buffer: Buffer; firma: { hash: string; timestamp: string; codigoVerificacion: string } }> {
  return new Promise((resolve, reject) => {
    try {
      const doc = crearDocumentoBase({
        titulo: 'Informe Mensual de Inventario',
        subtitulo: `Período: ${format(params.periodoInicio, 'dd/MM/yyyy')} - ${format(params.periodoFin, 'dd/MM/yyyy')}`,
        generadoPor: params.generadoPor,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, firma });
      });
      doc.on('error', reject);

      // Resumen general
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('RESUMEN GENERAL')
        .moveDown(0.5);

      const totalArticulos = params.datos.length;
      const totalEntradas = params.datos.reduce((sum, d) => sum + d.totales.entradas, 0);
      const totalSalidas = params.datos.reduce((sum, d) => sum + d.totales.salidas, 0);
      const totalStock = params.datos.reduce((sum, d) => sum + d.totales.saldoFinal, 0);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Total de artículos: ${totalArticulos}`)
        .text(`Total de entradas en el período: ${totalEntradas}`)
        .text(`Total de salidas en el período: ${totalSalidas}`)
        .text(`Stock total actual: ${totalStock}`)
        .moveDown();

      // Detalle por artículo
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DETALLE POR ARTÍCULO')
        .moveDown(0.5);

      params.datos.forEach((articulo) => {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`${articulo.articulo.sku} - ${articulo.articulo.nombre}`)
          .font('Helvetica')
          .fontSize(9)
          .text(`SIGAF: ${articulo.articulo.descripcionSIGAF}`)
          .text(`Unidad: ${articulo.articulo.unidadMedida}`)
          .moveDown(0.3);

        if (articulo.lotes.length > 0) {
          agregarTabla(
            doc,
            articulo.lotes,
            [
              { key: 'numeroLote', label: 'Lote', width: 80 },
              { key: 'fechaVencimiento', label: 'Vence', width: 70 },
              { key: 'entradas', label: 'Entr.', width: 50, align: 'right' },
              { key: 'salidas', label: 'Sal.', width: 50, align: 'right' },
              { key: 'saldoFinal', label: 'Saldo', width: 50, align: 'right' },
            ],
            { fontSize: 8 }
          );
        }

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(
            `Totales: Entradas: ${articulo.totales.entradas}, Salidas: ${articulo.totales.salidas}, Saldo: ${articulo.totales.saldoFinal}`,
            { align: 'right' }
          )
          .moveDown();
      });

      // Firma digital
      const firma = agregarFirmaDigital(doc, params.datos);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera PDF de documento de despacho
 */
export async function generarPDFDespacho(params: {
  despacho: {
    id: string;
    fecha: Date;
    receptor: string;
    cedulaReceptor?: string;
    unidadReceptora?: string;
    observaciones?: string;
  };
  articulo: {
    sku: string;
    nombre: string;
    descripcionSIGAF: string;
    unidadMedida: string;
  };
  lotes: Array<{
    numeroLote: string;
    cantidad: number;
    fechaVencimiento: Date;
  }>;
  cantidadTotal: number;
  generadoPor: string;
}): Promise<{ buffer: Buffer; firma: { hash: string; timestamp: string; codigoVerificacion: string } }> {
  return new Promise((resolve, reject) => {
    try {
      const doc = crearDocumentoBase({
        titulo: 'Documento de Despacho',
        subtitulo: `N° ${params.despacho.id.substring(0, 8).toUpperCase()}`,
        generadoPor: params.generadoPor,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, firma });
      });
      doc.on('error', reject);

      // Información del despacho
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DEL DESPACHO')
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Fecha: ${format(params.despacho.fecha, "dd 'de' MMMM 'de' yyyy", { locale: es })}`)
        .text(`Receptor: ${params.despacho.receptor}`)
        .text(`Cédula: ${params.despacho.cedulaReceptor || 'N/A'}`)
        .text(`Unidad Receptora: ${params.despacho.unidadReceptora || 'N/A'}`)
        .moveDown();

      // Artículo despachado
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('ARTÍCULO DESPACHADO')
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`SKU: ${params.articulo.sku}`)
        .text(`Nombre: ${params.articulo.nombre}`)
        .text(`Descripción SIGAF: ${params.articulo.descripcionSIGAF}`)
        .text(`Unidad de Medida: ${params.articulo.unidadMedida}`)
        .moveDown();

      // Lotes consumidos (PEPS)
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('LOTES CONSUMIDOS (Método PEPS)')
        .moveDown(0.3);

      agregarTabla(doc, params.lotes, [
        { key: 'numeroLote', label: 'N° Lote', width: 150 },
        { key: 'cantidad', label: 'Cantidad', width: 100, align: 'right' },
        { key: 'fechaVencimiento', label: 'Fecha Vencimiento', width: 120 },
      ]);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`CANTIDAD TOTAL DESPACHADA: ${params.cantidadTotal} ${params.articulo.unidadMedida}`, {
          align: 'right',
        })
        .moveDown(2);

      // Observaciones
      if (params.despacho.observaciones) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('OBSERVACIONES:')
          .font('Helvetica')
          .text(params.despacho.observaciones)
          .moveDown();
      }

      // Espacio para firmas físicas
      doc.moveDown(2);
      doc
        .fontSize(10)
        .text('_______________________________', 100, doc.y)
        .text('_______________________________', 350, doc.y - 14);

      doc
        .text('Firma del que entrega', 100, doc.y + 5)
        .text('Firma del que recibe', 350, doc.y - 9);

      // Firma digital
      const firma = agregarFirmaDigital(doc, {
        despacho: params.despacho,
        articulo: params.articulo,
        lotes: params.lotes,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera PDF de corte de existencias
 */
export async function generarPDFCorte(params: {
  corte: {
    id: string;
    tipo: string;
    fecha: Date;
    motivo?: string;
    hashSnapshot: string;
  };
  detalles: Array<{
    articulo: { sku: string; nombre: string; unidadMedida: string };
    lote: { numeroLote: string; fechaVencimiento: Date };
    cantidad: number;
  }>;
  generadoPor: string;
}): Promise<{ buffer: Buffer; firma: { hash: string; timestamp: string; codigoVerificacion: string } }> {
  return new Promise((resolve, reject) => {
    try {
      const doc = crearDocumentoBase({
        titulo: 'Corte de Existencias',
        subtitulo: `Tipo: ${params.corte.tipo.replace(/_/g, ' ')}`,
        generadoPor: params.generadoPor,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, firma });
      });
      doc.on('error', reject);

      // Información del corte
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DEL CORTE')
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`ID: ${params.corte.id}`)
        .text(`Fecha: ${format(params.corte.fecha, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`)
        .text(`Tipo: ${params.corte.tipo.replace(/_/g, ' ')}`)
        .text(`Motivo: ${params.corte.motivo || 'Corte automático'}`)
        .moveDown(0.5);

      // Hash del snapshot
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Hash de verificación del snapshot:')
        .font('Courier')
        .fontSize(8)
        .text(params.corte.hashSnapshot)
        .moveDown();

      // Detalle de existencias
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('DETALLE DE EXISTENCIAS')
        .moveDown(0.3);

      agregarTabla(doc, params.detalles, [
        { key: 'articulo.sku', label: 'SKU', width: 80 },
        { key: 'articulo.nombre', label: 'Artículo', width: 150 },
        { key: 'lote.numeroLote', label: 'Lote', width: 80 },
        { key: 'lote.fechaVencimiento', label: 'Vence', width: 70 },
        { key: 'cantidad', label: 'Cantidad', width: 60, align: 'right' },
        { key: 'articulo.unidadMedida', label: 'Unidad', width: 50 },
      ]);

      // Totales
      const totalItems = params.detalles.length;
      const totalUnidades = params.detalles.reduce((sum, d) => sum + d.cantidad, 0);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Total de registros: ${totalItems}`, { align: 'right' })
        .text(`Total de unidades: ${totalUnidades}`, { align: 'right' })
        .moveDown();

      // Firma digital
      const firma = agregarFirmaDigital(doc, {
        corte: params.corte,
        totalItems,
        totalUnidades,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
