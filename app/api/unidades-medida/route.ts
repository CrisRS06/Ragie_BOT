/**
 * API: /api/unidades-medida
 * GET - Lista todas las unidades de medida disponibles
 *
 * Las unidades de medida están definidas como un catálogo estático
 * para mantener consistencia con el esquema actual.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Catálogo de unidades de medida
const UNIDADES_MEDIDA = [
  { id: 'UNIDAD', nombre: 'Unidad', abreviatura: 'ud', activo: true },
  { id: 'KG', nombre: 'Kilogramo', abreviatura: 'kg', activo: true },
  { id: 'LITRO', nombre: 'Litro', abreviatura: 'L', activo: true },
  { id: 'METRO', nombre: 'Metro', abreviatura: 'm', activo: true },
  { id: 'CAJA', nombre: 'Caja', abreviatura: 'cja', activo: true },
  { id: 'PAQUETE', nombre: 'Paquete', abreviatura: 'pqt', activo: true },
  { id: 'BOLSA', nombre: 'Bolsa', abreviatura: 'bls', activo: true },
  { id: 'ROLLO', nombre: 'Rollo', abreviatura: 'rll', activo: true },
  { id: 'GALON', nombre: 'Galón', abreviatura: 'gal', activo: true },
  { id: 'LIBRA', nombre: 'Libra', abreviatura: 'lb', activo: true },
];

/**
 * GET /api/unidades-medida - Lista todas las unidades de medida
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: UNIDADES_MEDIDA,
      total: UNIDADES_MEDIDA.length,
    });
  } catch (error) {
    console.error('Error al obtener unidades de medida:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener unidades de medida' },
      { status: 500 }
    );
  }
}
