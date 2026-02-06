/**
 * Generador de PDF para Reporte de Inventario
 * Usa pdfkit para generar documentos PDF con formato institucional PANI
 */

import PDFDocument from 'pdfkit';

export interface LineaInventario {
  sku: string;
  nombre: string;
  unidadMedida: string;
  stockTotal: number;
  stockMinimo: number | null;
  estado: 'OK' | 'Stock bajo' | 'Sin stock' | 'Alerta venc.';
}

export interface ReporteInventarioData {
  fecha: string;
  generadoPor: string;
  bodega: { codigo: string; nombre: string } | null;
  articulos: LineaInventario[];
}

export async function generarReporteInventario(datos: ReporteInventarioData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        layout: 'landscape',
        info: {
          Title: 'Reporte de Inventario - PANI',
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
        .text('REPORTE DE INVENTARIO', { align: 'center' });
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

      doc.fontSize(10).font('Helvetica-Bold').text('Fecha: ', { continued: true });
      doc.font('Helvetica').text(fechaFormateada, { continued: true });
      doc.text('          ', { continued: true });
      doc.font('Helvetica-Bold').text('Generado por: ', { continued: true });
      doc.font('Helvetica').text(datos.generadoPor);

      doc.font('Helvetica-Bold').text('Bodega: ', { continued: true });
      doc.font('Helvetica').text(
        datos.bodega ? `${datos.bodega.codigo} - ${datos.bodega.nombre}` : 'Todas las bodegas'
      );

      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // === TABLA DE INVENTARIO ===
      const colWidths = {
        sku: 80,
        nombre: pageWidth - 80 - 60 - 70 - 70 - 80,
        um: 60,
        stock: 70,
        minimo: 70,
        estado: 80,
      };

      const drawTableHeader = () => {
        const tableTop = doc.y;
        let x = leftMargin;

        doc.rect(x, tableTop, pageWidth, 18).fill('#1e40af');
        doc.fill('#ffffff');

        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('SKU', x + 4, tableTop + 5, { width: colWidths.sku });
        x += colWidths.sku;
        doc.text('Artículo', x + 4, tableTop + 5, { width: colWidths.nombre });
        x += colWidths.nombre;
        doc.text('U.M.', x + 4, tableTop + 5, { width: colWidths.um });
        x += colWidths.um;
        doc.text('Stock', x + 4, tableTop + 5, { width: colWidths.stock - 8, align: 'right' });
        x += colWidths.stock;
        doc.text('Mínimo', x + 4, tableTop + 5, { width: colWidths.minimo - 8, align: 'right' });
        x += colWidths.minimo;
        doc.text('Estado', x + 4, tableTop + 5, { width: colWidths.estado, align: 'center' });

        doc.fill('#000000');
        doc.y = tableTop + 20;
      };

      drawTableHeader();

      // Filas
      doc.fontSize(8).font('Helvetica');
      let totalUnidades = 0;
      const rowHeight = 16;

      for (let i = 0; i < datos.articulos.length; i++) {
        const articulo = datos.articulos[i];

        // Verificar si necesitamos nueva página
        if (doc.y + rowHeight > doc.page.height - 60) {
          doc.addPage();
          drawTableHeader();
        }

        const rowTop = doc.y;
        let x = leftMargin;

        // Alternar color de fondo
        if (i % 2 === 1) {
          doc.rect(x, rowTop, pageWidth, rowHeight).fill('#f9fafb');
          doc.fill('#000000');
        }

        doc.text(articulo.sku, x + 4, rowTop + 4, { width: colWidths.sku });
        x += colWidths.sku;
        doc.text(articulo.nombre, x + 4, rowTop + 4, { width: colWidths.nombre, ellipsis: true });
        x += colWidths.nombre;
        doc.text(articulo.unidadMedida, x + 4, rowTop + 4, { width: colWidths.um });
        x += colWidths.um;
        doc.text(articulo.stockTotal.toString(), x + 4, rowTop + 4, { width: colWidths.stock - 8, align: 'right' });
        x += colWidths.stock;
        doc.text(
          articulo.stockMinimo !== null ? articulo.stockMinimo.toString() : '-',
          x + 4, rowTop + 4,
          { width: colWidths.minimo - 8, align: 'right' }
        );
        x += colWidths.minimo;

        // Estado con color
        const estadoColor = {
          'OK': '#16a34a',
          'Stock bajo': '#ea580c',
          'Sin stock': '#9ca3af',
          'Alerta venc.': '#dc2626',
        }[articulo.estado] || '#000000';

        doc.fill(estadoColor);
        doc.text(articulo.estado, x + 4, rowTop + 4, { width: colWidths.estado, align: 'center' });
        doc.fill('#000000');

        totalUnidades += articulo.stockTotal;
        doc.y = rowTop + rowHeight + 2;
      }

      // Línea debajo de la tabla
      doc.moveTo(leftMargin, doc.y)
        .lineTo(leftMargin + pageWidth, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // Totales
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Total artículos: ${datos.articulos.length}          Total unidades: ${totalUnidades}`, { align: 'right' });

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
