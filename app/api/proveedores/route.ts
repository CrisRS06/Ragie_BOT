/**
 * API: /api/proveedores
 * GET - Lista todos los proveedores
 * POST - Crear nuevo proveedor
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Schema de validación
const createProveedorSchema = z.object({
  codigo: z.string().min(2, 'Código debe tener al menos 2 caracteres').max(20),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  ruc: z.string().max(20).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  contacto: z.string().max(100).optional().nullable(),
});

/**
 * GET /api/proveedores - Lista todos los proveedores
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const proveedores = await prisma.proveedor.findMany({
      where: includeInactive ? {} : { activo: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: proveedores,
      total: proveedores.length,
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener proveedores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proveedores - Crear nuevo proveedor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validacion = createProveedorSchema.safeParse(body);
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

    // Verificar que el código no exista
    const codigoExistente = await prisma.proveedor.findUnique({
      where: { codigo: data.codigo },
    });

    if (codigoExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un proveedor con este código' },
        { status: 400 }
      );
    }

    // Crear proveedor
    const proveedor = await prisma.proveedor.create({
      data: {
        codigo: data.codigo.toUpperCase(),
        nombre: data.nombre,
        ruc: data.ruc || null,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        email: data.email || null,
        contacto: data.contacto || null,
        activo: true,
      },
    });

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'CREAR_PROVEEDOR',
      entidad: 'Proveedor',
      entidadId: proveedor.id,
      estadoAnterior: null,
      estadoNuevo: proveedor,
    });

    return NextResponse.json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: proveedor,
    });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear proveedor' },
      { status: 500 }
    );
  }
}
