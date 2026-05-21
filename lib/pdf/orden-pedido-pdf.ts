/**
 * Generador de PDF para Órdenes de Pedido (PANI ↔ Super Cadena).
 *
 * El mismo generador produce dos variantes según el estado:
 *  - Estados pre-entrega: documento "ORDEN DE PEDIDO" informativo (no firmado).
 *  - Estado ENTREGADO: "BOLETA DE ENTREGA FIRMADA" con hash SHA-256 y firma del operador.
 *
 * Adaptado de lib/pdf/despacho-pdf.ts para mantener consistencia visual institucional.
 */

import PDFDocument from 'pdfkit'

export interface LineaOrdenPedidoPDF {
  sku: string
  articulo: string
  unidadMedida: string
  cantidadSolicitada: number
  cantidadEntregada: number | null
}

export type EstadoOrdenPedido =
  | 'BORRADOR'
  | 'ENVIADO'
  | 'EN_PREPARACION'
  | 'LISTO_RETIRO'
  | 'ENTREGADO'
  | 'RECHAZADO'
  | 'ANULADO'

export interface OrdenPedidoPDFData {
  numero: string
  estado: EstadoOrdenPedido
  fechaCreacion: string
  fechaEnvio: string | null
  fechaEntrega: string | null
  solicitante: { nombre: string; email: string | null } | null
  bodega: { codigo: string; nombre: string } | null
  unidadReceptora: { codigo: string; nombre: string } | null
  observaciones: string | null
  lineas: LineaOrdenPedidoPDF[]
  /** Solo presente cuando estado === ENTREGADO */
  entrega?: {
    receptor: string
    cedula: string | null
    operador: string
    hashFirma: string
  }
}

export async function generarOrdenPedidoPDF(datos: OrdenPedidoPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const esEntrega = datos.estado === 'ENTREGADO' && !!datos.entrega
      const titulo = esEntrega ? 'BOLETA DE ENTREGA FIRMADA' : 'ORDEN DE PEDIDO'

      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        info: {
          Title: `${titulo} - ${datos.numero}`,
          Author: 'Sistema de Inventario PEPS - PANI',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
      const leftMargin = doc.page.margins.left
      const fmtFecha = (iso: string | null) =>
        iso
          ? new Date(iso).toLocaleDateString('es-CR', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })
          : '—'

      // === HEADER ===
      doc.fontSize(14).font('Helvetica-Bold').text('PANI - Patronato Nacional de la Infancia', { align: 'center' })
      doc.fontSize(10).font('Helvetica').text('Sistema de Inventario PEPS', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(16).font('Helvetica-Bold').text(titulo, { align: 'center' })
      doc.moveDown(0.5)
      doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke()
      doc.moveDown(0.5)

      // === DATOS GENERALES ===
      doc.fontSize(10).font('Helvetica-Bold').text('Número: ', { continued: true })
      doc.font('Helvetica').text(datos.numero, { continued: true })
      doc.text('          ', { continued: true })
      doc.font('Helvetica-Bold').text('Estado: ', { continued: true })
      doc.font('Helvetica').text(datos.estado)

      doc.font('Helvetica-Bold').text('Fecha solicitud: ', { continued: true })
      doc.font('Helvetica').text(fmtFecha(datos.fechaCreacion))

      if (datos.fechaEnvio) {
        doc.font('Helvetica-Bold').text('Fecha envío: ', { continued: true })
        doc.font('Helvetica').text(fmtFecha(datos.fechaEnvio))
      }
      if (esEntrega && datos.fechaEntrega) {
        doc.font('Helvetica-Bold').text('Fecha entrega: ', { continued: true })
        doc.font('Helvetica').text(fmtFecha(datos.fechaEntrega))
      }

      if (datos.bodega) {
        doc.font('Helvetica-Bold').text('Bodega: ', { continued: true })
        doc.font('Helvetica').text(`${datos.bodega.codigo} - ${datos.bodega.nombre}`)
      }

      doc.moveDown(0.5)
      doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke()
      doc.moveDown(0.5)

      // === SOLICITANTE / DESTINO ===
      doc.fontSize(11).font('Helvetica-Bold').text('SOLICITANTE')
      doc.moveDown(0.3)
      doc.fontSize(10)
      if (datos.solicitante) {
        doc.font('Helvetica-Bold').text('Nombre: ', { continued: true })
        doc.font('Helvetica').text(datos.solicitante.nombre)
        if (datos.solicitante.email) {
          doc.font('Helvetica-Bold').text('Correo: ', { continued: true })
          doc.font('Helvetica').text(datos.solicitante.email)
        }
      }
      if (datos.unidadReceptora) {
        doc.font('Helvetica-Bold').text('Unidad receptora: ', { continued: true })
        doc.font('Helvetica').text(`${datos.unidadReceptora.codigo} - ${datos.unidadReceptora.nombre}`)
      }
      doc.moveDown(0.5)
      doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke()
      doc.moveDown(0.5)

      // === TABLA DE ARTÍCULOS ===
      doc.fontSize(11).font('Helvetica-Bold').text('DETALLE DE ARTÍCULOS')
      doc.moveDown(0.5)

      // Columnas: SKU | Artículo | Solicitada | Entregada* | U.M.
      const showEntregada = esEntrega
      const colSku = 70
      const colCantSol = 65
      const colCantEntr = showEntregada ? 65 : 0
      const colUM = 55
      const colArt = pageWidth - colSku - colCantSol - colCantEntr - colUM

      const drawHeader = () => {
        const top = doc.y
        let x = leftMargin
        doc.rect(x, top, pageWidth, 18).fill('#f3f4f6')
        doc.fill('#000000').fontSize(8).font('Helvetica-Bold')
        doc.text('SKU', x + 4, top + 5, { width: colSku }); x += colSku
        doc.text('Artículo', x + 4, top + 5, { width: colArt }); x += colArt
        doc.text('Solicitada', x + 4, top + 5, { width: colCantSol - 8, align: 'right' }); x += colCantSol
        if (showEntregada) {
          doc.text('Entregada', x + 4, top + 5, { width: colCantEntr - 8, align: 'right' }); x += colCantEntr
        }
        doc.text('U.M.', x + 4, top + 5, { width: colUM })
        doc.y = top + 20
      }

      drawHeader()
      doc.fontSize(8).font('Helvetica')
      let totalSolicitada = 0
      let totalEntregada = 0
      const minRowHeight = 18

      for (let i = 0; i < datos.lineas.length; i++) {
        const linea = datos.lineas[i]
        const textHeight = doc.heightOfString(linea.articulo, { width: colArt - 8 })
        const rowHeight = Math.max(minRowHeight, textHeight + 8)

        if (doc.y + rowHeight > doc.page.height - 80) {
          doc.addPage()
          drawHeader()
          doc.fontSize(8).font('Helvetica')
        }

        const top = doc.y
        let x = leftMargin
        if (i % 2 === 1) {
          doc.rect(x, top, pageWidth, rowHeight).fill('#f9fafb')
          doc.fill('#000000')
        }
        doc.text(linea.sku, x + 4, top + 4, { width: colSku }); x += colSku
        doc.text(linea.articulo, x + 4, top + 4, { width: colArt - 8 }); x += colArt
        doc.text(linea.cantidadSolicitada.toString(), x + 4, top + 4, { width: colCantSol - 8, align: 'right' }); x += colCantSol
        if (showEntregada) {
          doc.text(linea.cantidadEntregada != null ? linea.cantidadEntregada.toString() : '—',
            x + 4, top + 4, { width: colCantEntr - 8, align: 'right' })
          x += colCantEntr
        }
        doc.text(linea.unidadMedida, x + 4, top + 4, { width: colUM })

        totalSolicitada += linea.cantidadSolicitada
        if (linea.cantidadEntregada != null) totalEntregada += linea.cantidadEntregada
        doc.y = top + rowHeight
      }

      doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke()
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica-Bold')
      let resumen = `Total solicitado: ${totalSolicitada}`
      if (showEntregada) resumen += `  |  Total entregado: ${totalEntregada}`
      doc.text(resumen, { align: 'right' })
      doc.moveDown(0.8)

      // === OBSERVACIONES ===
      if (datos.observaciones) {
        doc.fontSize(10).font('Helvetica-Bold').text('Observaciones: ', { continued: true })
        doc.font('Helvetica').text(datos.observaciones)
        doc.moveDown(0.8)
      }

      // === FIRMA DIGITAL (solo si ENTREGADO) ===
      if (esEntrega && datos.entrega) {
        if (doc.y > doc.page.height - 200) doc.addPage()

        doc.fontSize(11).font('Helvetica-Bold').text('FIRMA DIGITAL')
        doc.moveDown(0.3)
        const hash = datos.entrega.hashFirma
        const hashCorto = hash.length > 24 ? `${hash.slice(0, 16)}…${hash.slice(-8)}` : hash
        doc.fontSize(9).font('Helvetica-Bold').text('Hash SHA-256: ', { continued: true })
        doc.font('Courier').text(hash)
        doc.font('Helvetica-Bold').text('Resumen: ', { continued: true })
        doc.font('Courier').text(hashCorto)
        doc.font('Helvetica-Bold').text('Verificado: ', { continued: true })
        doc.font('Helvetica').text(`${fmtFecha(datos.fechaEntrega)} por ${datos.entrega.operador}`)
        doc.font('Helvetica-Bold').text('Receptor: ', { continued: true })
        doc.font('Helvetica').text(
          `${datos.entrega.receptor}${datos.entrega.cedula ? ` (cédula ${datos.entrega.cedula})` : ''}`
        )
        doc.moveDown(0.8)

        // Espacio para firmas físicas opcionales
        const firmaY = doc.y + 30
        const firmaWidth = (pageWidth - 60) / 2
        doc.moveTo(leftMargin, firmaY).lineTo(leftMargin + firmaWidth, firmaY).stroke()
        doc.fontSize(9).font('Helvetica-Bold')
          .text('Entregado por', leftMargin, firmaY + 5, { width: firmaWidth, align: 'center' })
        doc.fontSize(8).font('Helvetica')
          .text(datos.entrega.operador, leftMargin, firmaY + 18, { width: firmaWidth, align: 'center' })

        const rightX = leftMargin + firmaWidth + 60
        doc.moveTo(rightX, firmaY).lineTo(rightX + firmaWidth, firmaY).stroke()
        doc.fontSize(9).font('Helvetica-Bold')
          .text('Recibido por', rightX, firmaY + 5, { width: firmaWidth, align: 'center' })
        doc.fontSize(8).font('Helvetica')
          .text(datos.entrega.receptor, rightX, firmaY + 18, { width: firmaWidth, align: 'center' })
      }

      // === FOOTER ===
      doc.fontSize(7).font('Helvetica').text(
        `Documento generado el ${new Date().toLocaleDateString('es-CR')} - Sistema de Inventario PEPS - PANI Costa Rica`,
        leftMargin,
        doc.page.height - 40,
        { width: pageWidth, align: 'center' }
      )

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
