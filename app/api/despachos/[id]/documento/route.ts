/**
 * API: GET /api/despachos/[id]/documento
 * Genera el documento PDF de un despacho
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarPDFDespacho } from '@/lib/services/pdf.service';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: despachoId } = await params;

    // Buscar movimientos relacionados al despacho por el ID (buscamos en bitácora o por patrón)
    // Como no tenemos una tabla de despachos, buscamos movimientos de salida recientes
    // En un sistema real, tendríamos una tabla de despachos

    // Obtener el movimiento principal
    const movimiento = await prisma.movimiento.findFirst({
      where: {
        id: despachoId,
        tipo: 'SALIDA',
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
        lote: {
          select: {
            id: true,
            numeroLote: true,
            fechaVencimiento: true,
          },
        },
        unidadReceptora: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!movimiento) {
      return NextResponse.json(
        { error: 'Despacho no encontrado' },
        { status: 404 }
      );
    }

    const usuario = getCurrentUser();

    // Generar PDF
    const { buffer, firma } = await generarPDFDespacho({
      despacho: {
        id: despachoId,
        fecha: movimiento.timestamp,
        receptor: movimiento.receptorNombre || 'No especificado',
        cedulaReceptor: movimiento.receptorCedula || undefined,
        unidadReceptora: movimiento.unidadReceptora?.nombre,
        observaciones: movimiento.documentoReferencia || undefined,
      },
      articulo: {
        sku: movimiento.articulo.sku,
        nombre: movimiento.articulo.nombre,
        descripcionSIGAF: movimiento.articulo.descripcionSIGAF,
        unidadMedida: movimiento.articulo.unidadMedida,
      },
      lotes: [
        {
          numeroLote: movimiento.lote?.numeroLote || `LOTE-${movimiento.loteId?.substring(0, 8) || 'N/A'}`,
          cantidad: movimiento.cantidad,
          fechaVencimiento: movimiento.lote?.fechaVencimiento || new Date(),
        },
      ],
      cantidadTotal: movimiento.cantidad,
      generadoPor: usuario.nombre,
    });

    // Retornar PDF (convertir Buffer a Uint8Array para compatibilidad)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="despacho-${despachoId.substring(0, 8)}.pdf"`,
        'X-Document-Hash': firma.hash,
        'X-Document-Verification': firma.codigoVerificacion,
      },
    });
  } catch (error) {
    console.error('Error al generar documento de despacho:', error);
    return NextResponse.json(
      { error: 'Error al generar el documento PDF' },
      { status: 500 }
    );
  }
}
