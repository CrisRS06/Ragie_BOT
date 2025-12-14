/**
 * API: /api/unidades-receptoras
 * GET - Lista todas las unidades receptoras
 * POST - Crear nueva unidad receptora
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación
const createUnidadReceptoraSchema = z.object({
  codigo: z.string().min(2, 'Código debe tener al menos 2 caracteres').max(20),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
});

/**
 * GET /api/unidades-receptoras - Lista todas las unidades receptoras
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const unidades = await prisma.unidadReceptora.findMany({
      where: includeInactive ? {} : { activo: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: unidades,
      total: unidades.length,
    });
  } catch (error) {
    console.error('Error al obtener unidades receptoras:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener unidades receptoras' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/unidades-receptoras - Crear nueva unidad receptora
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validacion = createUnidadReceptoraSchema.safeParse(body);
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
    const usuarioId = getCurrentUserId();

    // Verificar que el código no exista
    const codigoExistente = await prisma.unidadReceptora.findUnique({
      where: { codigo: data.codigo },
    });

    if (codigoExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una unidad receptora con este código' },
        { status: 400 }
      );
    }

    // Crear unidad receptora
    const unidad = await prisma.unidadReceptora.create({
      data: {
        codigo: data.codigo.toUpperCase(),
        nombre: data.nombre,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        responsable: data.responsable || null,
        activo: true,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'CREAR_UNIDAD_RECEPTORA',
      entidad: 'UnidadReceptora',
      entidadId: unidad.id,
      estadoAnterior: null,
      estadoNuevo: unidad,
    });

    return NextResponse.json({
      success: true,
      message: 'Unidad receptora creada exitosamente',
      data: unidad,
    });
  } catch (error) {
    console.error('Error al crear unidad receptora:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear unidad receptora' },
      { status: 500 }
    );
  }
}
