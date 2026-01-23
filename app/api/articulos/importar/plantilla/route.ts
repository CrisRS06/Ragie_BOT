/**
 * API: /api/articulos/importar/plantilla
 * GET - Descargar plantilla Excel para importación de artículos
 */

import { NextResponse } from 'next/server';
import { generarPlantillaImportacion } from '@/lib/services/import-articulos.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/articulos/importar/plantilla
 * Descarga la plantilla Excel para importación masiva de artículos
 */
export async function GET() {
  try {
    const buffer = await generarPlantillaImportacion();
    const uint8Array = new Uint8Array(buffer);

    // Crear response con headers para descarga
    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla_importacion_articulos.xlsx"',
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('Error al generar plantilla:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar plantilla',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
