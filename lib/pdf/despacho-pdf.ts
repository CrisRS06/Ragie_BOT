/**
 * Generador de PDF para Boleta de Despacho
 * Usa pdfkit para generar documentos PDF con formato institucional PANI
 */

import PDFDocument from 'pdfkit';

export interface LineaDespacho {
  sku: string;
  articulo: string;
  cantidad: number;
  unidadMedida: string;
  lote: string | null;
  fechaVencimiento: string | null;
}

export interface BoletaDespachoData {
  referencia: string;
  fecha: string;
  bodega: { codigo: string; nombre: string } | null;
  receptor: {
    nombre: string;
    cedula: string | null;
    unidadReceptora: { codigo: string; nombre: string } | null;
  };
  lineas: LineaDespacho[];
  observaciones: string | null;
}

export async function generarBoletaDespacho(datos: BoletaDespachoData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: {
          Title: `Boleta de Despacho - ${datos.referencia}`,
          Author: 'Sistema de Inventario PEPS - PANI',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftMargin = doc.page.margins.left;

      // === HEADER ===
      doc.fontSize(14).font('Helvetica-Bold')
        .text('PANI - Patronato Nacional de la Infancia', { align: 'center' });
      doc.fontSize(10).font('Helvetica')
        .text('Sistema de Inventario PEPS', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(16).font('Helvetica-Bold')
        .text('BOLETA DE DESPACHO', { align: 'center' });

      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // === DATOS GENERALES ===
      const fechaFormateada = new Date(datos.fecha).toLocaleDateString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const refCorta = datos.referencia.substring(0, 8).toUpperCase();

      doc.fontSize(10).font('Helvetica-Bold').text('Fecha: ', { continued: true });
      doc.font('Helvetica').text(fechaFormateada, { continued: true });
      doc.text('          ', { continued: true });
      doc.font('Helvetica-Bold').text('Ref: ', { continued: true });
      doc.font('Helvetica').text(refCorta);

      if (datos.bodega) {
        doc.font('Helvetica-Bold').text('Bodega: ', { continued: true });
        doc.font('Helvetica').text(`${datos.bodega.codigo} - ${datos.bodega.nombre}`);
      }

      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // === RECEPTOR ===
      doc.fontSize(11).font('Helvetica-Bold').text('RECEPTOR');
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica-Bold').text('Nombre: ', { continued: true });
      doc.font('Helvetica').text(datos.receptor.nombre);

      if (datos.receptor.cedula) {
        doc.font('Helvetica-Bold').text('Cédula: ', { continued: true });
        doc.font('Helvetica').text(datos.receptor.cedula);
      }

      if (datos.receptor.unidadReceptora) {
        doc.font('Helvetica-Bold').text('Unidad Receptora: ', { continued: true });
        doc.font('Helvetica').text(
          `${datos.receptor.unidadReceptora.codigo} - ${datos.receptor.unidadReceptora.nombre}`
        );
      }

      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // === TABLA DE ARTÍCULOS ===
      doc.fontSize(11).font('Helvetica-Bold').text('DETALLE DE ARTÍCULOS');
      doc.moveDown(0.5);

      // Definir columnas
      const colWidths = {
        sku: 70,
        articulo: pageWidth - 70 - 55 - 50 - 70 - 70,
        cantidad: 55,
        um: 50,
        lote: 70,
        venc: 70,
      };

      // Función para dibujar header de tabla (reutilizable en nuevas páginas)
      const drawTableHeader = () => {
        const tableTop = doc.y;
        let x = leftMargin;

        doc.rect(x, tableTop, pageWidth, 18).fill('#f3f4f6');
        doc.fill('#000000');

        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('SKU', x + 4, tableTop + 5, { width: colWidths.sku });
        x += colWidths.sku;
        doc.text('Artículo', x + 4, tableTop + 5, { width: colWidths.articulo });
        x += colWidths.articulo;
        doc.text('Cant.', x + 4, tableTop + 5, { width: colWidths.cantidad, align: 'right' });
        x += colWidths.cantidad;
        doc.text('U.M.', x + 4, tableTop + 5, { width: colWidths.um });
        x += colWidths.um;
        doc.text('Lote', x + 4, tableTop + 5, { width: colWidths.lote });
        x += colWidths.lote;
        doc.text('Venc.', x + 4, tableTop + 5, { width: colWidths.venc });

        doc.y = tableTop + 20;
      };

      drawTableHeader();

      // Filas de datos
      doc.fontSize(8).font('Helvetica');
      let totalUnidades = 0;
      const rowHeight = 18;

      for (let i = 0; i < datos.lineas.length; i++) {
        const linea = datos.lineas[i];

        // Verificar si necesitamos nueva página
        if (doc.y + rowHeight > doc.page.height - 60) {
          doc.addPage();
          drawTableHeader();
          doc.fontSize(8).font('Helvetica');
        }

        const rowTop = doc.y;
        let x = leftMargin;

        // Alternar color de fondo
        if (i % 2 === 1) {
          doc.rect(x, rowTop, pageWidth, 16).fill('#f9fafb');
          doc.fill('#000000');
        }

        const vencFormateada = linea.fechaVencimiento
          ? new Date(linea.fechaVencimiento).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '-';

        doc.text(linea.sku, x + 4, rowTop + 4, { width: colWidths.sku });
        x += colWidths.sku;
        doc.text(linea.articulo, x + 4, rowTop + 4, { width: colWidths.articulo, ellipsis: true });
        x += colWidths.articulo;
        doc.text(Math.abs(linea.cantidad).toString(), x + 4, rowTop + 4, { width: colWidths.cantidad - 8, align: 'right' });
        x += colWidths.cantidad;
        doc.text(linea.unidadMedida, x + 4, rowTop + 4, { width: colWidths.um });
        x += colWidths.um;
        doc.text(linea.lote || '-', x + 4, rowTop + 4, { width: colWidths.lote });
        x += colWidths.lote;
        doc.text(vencFormateada, x + 4, rowTop + 4, { width: colWidths.venc });

        totalUnidades += Math.abs(linea.cantidad);
        doc.y = rowTop + rowHeight;
      }

      // Línea debajo de la tabla
      doc.moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.3);

      // Total
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Total: ${datos.lineas.length} artículo(s), ${totalUnidades} unidades`, { align: 'right' });

      doc.moveDown(0.8);

      // === OBSERVACIONES ===
      if (datos.observaciones) {
        doc.fontSize(10).font('Helvetica-Bold').text('Observaciones: ', { continued: true });
        doc.font('Helvetica').text(datos.observaciones);
        doc.moveDown(0.8);
      }

      // === FIRMAS ===
      // Verificar si necesitamos nueva página
      if (doc.y > doc.page.height - 180) {
        doc.addPage();
      }

      const firmaY = doc.y + 40;
      const firmaWidth = (pageWidth - 60) / 2;

      // Firma izquierda - Entregado por
      doc.moveTo(leftMargin, firmaY)
        .lineTo(leftMargin + firmaWidth, firmaY)
        .stroke();
      doc.fontSize(9).font('Helvetica-Bold')
        .text('Entregado por', leftMargin, firmaY + 5, { width: firmaWidth, align: 'center' });
      doc.fontSize(8).font('Helvetica')
        .text('Nombre: ________________________', leftMargin, firmaY + 18, { width: firmaWidth, align: 'center' })
        .text('Firma: _________________________', leftMargin, firmaY + 30, { width: firmaWidth, align: 'center' });

      // Firma derecha - Recibido por
      const rightX = leftMargin + firmaWidth + 60;
      doc.moveTo(rightX, firmaY)
        .lineTo(rightX + firmaWidth, firmaY)
        .stroke();
      doc.fontSize(9).font('Helvetica-Bold')
        .text('Recibido por', rightX, firmaY + 5, { width: firmaWidth, align: 'center' });
      doc.fontSize(8).font('Helvetica')
        .text(`Nombre: ${datos.receptor.nombre}`, rightX, firmaY + 18, { width: firmaWidth, align: 'center' })
        .text('Firma: _________________________', rightX, firmaY + 30, { width: firmaWidth, align: 'center' });

      // Footer
      doc.fontSize(7).font('Helvetica')
        .text(
          `Documento generado el ${new Date().toLocaleDateString('es-CR')} - Sistema de Inventario PEPS - PANI Costa Rica`,
          leftMargin,
          doc.page.height - 40,
          { width: pageWidth, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
