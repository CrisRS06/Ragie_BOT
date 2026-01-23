/**
 * API: /api/articulos
 * GET - Lista todos los artículos activos del sistema
 * POST - Crear nuevo artículo
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación para crear artículo
const createArticuloSchema = z.object({
  sku: z.string().min(3, 'SKU debe tener al menos 3 caracteres').max(50),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  descripcionSIGAF: z.string().min(10, 'Descripción SIGAF debe tener al menos 10 caracteres').max(500),
  descripcion: z.string().max(500).optional().nullable(),
  unidadMedida: z.enum(['UNIDAD', 'KG', 'LITRO', 'METRO', 'CAJA', 'PAQUETE', 'BOLSA', 'ROLLO', 'GALON', 'LIBRA']),
  stockMinimo: z.number().min(0).optional().nullable(),
  stockMaximo: z.number().min(0).optional().nullable(),
  codigoSIGAF: z.string().max(50).optional().nullable(),
  requiereVencimiento: z.boolean().optional(),
  // FASE 1: Campos adicionales PANI
  codigoBarras: z.string().max(50).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  ivaPercent: z.number().min(0).max(1).optional().default(0.13),
  observaciones: z.string().max(2000).optional().nullable(),
  // FASE 2: Campos adicionales según requisitos de Bodega en Custodia
  codigoPANI: z.string().max(50).optional().nullable(),
  codigoSICOP: z.string().max(50).optional().nullable(),
  codigoSICOPL: z.string().max(50).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  precio: z.number().min(0).optional().nullable(),
  costoReferencia: z.number().min(0).optional().nullable(),
});

export async function GET() {
  try {
    const articulos = await prisma.articulo.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcionSIGAF: true,
        unidadMedida: true,
        stockMinimo: true,
        stockMaximo: true,
        // FASE 1: Campos adicionales PANI
        codigoBarras: true,
        marca: true,
        ivaPercent: true,
        observaciones: true,
        // FASE 2: Campos adicionales Bodega en Custodia
        codigoPANI: true,
        codigoSICOP: true,
        codigoSICOPL: true,
        categoria: true,
        precio: true,
        costoReferencia: true,
        _count: {
          select: {
            lotes: {
              where: {
                activo: true,
                cantidadDisponible: { gt: 0 },
              },
            },
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    // Calcular stock total por artículo
    const articulosConStock = await Promise.all(
      articulos.map(async (articulo) => {
        const stockTotal = await prisma.lote.aggregate({
          where: {
            articuloId: articulo.id,
            activo: true,
          },
          _sum: {
            cantidadDisponible: true,
          },
        });

        return {
          ...articulo,
          stockTotal: stockTotal._sum.cantidadDisponible || 0,
          lotesActivos: articulo._count.lotes,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: articulosConStock,
      total: articulosConStock.length,
    });
  } catch (error) {
    console.error('Error al obtener artículos:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener artículos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articulos - Crear nuevo artículo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validacion = createArticuloSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validacion.data;
    const usuarioId = await getCurrentUserId();

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el SKU no exista
    const skuExistente = await prisma.articulo.findUnique({
      where: { sku: data.sku },
    });

    if (skuExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un artículo con este SKU' },
        { status: 400 }
      );
    }

    // Validar que stockMaximo >= stockMinimo si ambos están definidos
    if (
      data.stockMinimo !== null &&
      data.stockMinimo !== undefined &&
      data.stockMaximo !== null &&
      data.stockMaximo !== undefined &&
      data.stockMaximo < data.stockMinimo
    ) {
      return NextResponse.json(
        { success: false, error: 'Stock máximo no puede ser menor al stock mínimo' },
        { status: 400 }
      );
    }

    // Crear artículo
    const articulo = await prisma.articulo.create({
      data: {
        sku: data.sku,
        nombre: data.nombre,
        descripcion: data.descripcion,
        descripcionSIGAF: data.descripcionSIGAF,
        codigoSIGAF: data.codigoSIGAF,
        unidadMedida: data.unidadMedida,
        stockMinimo: data.stockMinimo,
        stockMaximo: data.stockMaximo,
        requiereVencimiento: data.requiereVencimiento ?? true,
        activo: true,
        // FASE 1: Campos adicionales PANI
        codigoBarras: data.codigoBarras,
        marca: data.marca,
        ivaPercent: data.ivaPercent ?? 0.13,
        observaciones: data.observaciones,
        // FASE 2: Campos adicionales Bodega en Custodia
        codigoPANI: data.codigoPANI,
        codigoSICOP: data.codigoSICOP,
        codigoSICOPL: data.codigoSICOPL,
        categoria: data.categoria,
        precio: data.precio,
        costoReferencia: data.costoReferencia,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'CREAR_ARTICULO',
      entidad: 'Articulo',
      entidadId: articulo.id,
      estadoAnterior: null,
      estadoNuevo: articulo,
    });

    return NextResponse.json({
      success: true,
      message: 'Artículo creado exitosamente',
      data: articulo,
    });
  } catch (error) {
    console.error('Error al crear artículo:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear artículo' },
      { status: 500 }
    );
  }
}
