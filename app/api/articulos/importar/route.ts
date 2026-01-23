/**
 * API: /api/articulos/importar
 * POST - Importar artículos desde archivo Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { procesarImportacion } from '@/lib/services/import-articulos.service';

export const dynamic = 'force-dynamic';

// Aumentar límite del body para archivos
export const maxDuration = 60; // 60 segundos para procesar archivos grandes

/**
 * POST /api/articulos/importar
 * Importa artículos desde un archivo Excel
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear el form-data
    const formData = await request.formData();
    const file = formData.get('archivo') as File | null;
    const actualizarExistentes = formData.get('actualizarExistentes') === 'true';

    // Validar que se envió un archivo
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se envió ningún archivo',
        },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv (futuro soporte)
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo no soportado. Use archivos Excel (.xlsx)',
        },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (10MB)',
        },
        { status: 400 }
      );
    }

    // Convertir a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Obtener IP y User Agent para auditoría
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // TODO: En producción, obtener userId del token/sesión
    const usuarioId = 'admin-temp-id';

    // Procesar importación
    const resultado = await procesarImportacion({
      buffer,
      actualizarExistentes,
      usuarioId,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Importación completada',
      data: resultado,
    });

  } catch (error) {
    console.error('Error al importar artículos:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar importación',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
