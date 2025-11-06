/**
 * API: POST /api/recepciones
 * Crear una nueva recepción de mercancía
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRecepcionSchema } from '@/lib/validations/recepcion.schema';
import { ejecutarEntrada } from '@/lib/services/peps.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parsear body
    const body = await request.json();

    // Validar con Zod
    const validacion = createRecepcionSchema.safeParse(body);

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

    // Obtener IP y User Agent para auditoría
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // TODO: En producción, obtener userId del token/sesión
    // Por ahora usamos un usuario de prueba
    const usuarioId = 'admin-temp-id';

    // Ejecutar entrada usando el servicio PEPS
    const resultado = await ejecutarEntrada({
      articuloId: data.articuloId,
      cantidad: data.cantidad,
      fechaVencimiento: data.fechaVencimiento,
      numeroLote: data.numeroLote,
      proveedor: data.proveedor,
      costoUnitario: data.costoUnitario,
      ubicacion: data.ubicacion,
      documentoReferencia: data.documentoReferencia,
      usuarioId,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Recepción creada exitosamente',
      data: resultado,
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear recepción:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear recepción',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
