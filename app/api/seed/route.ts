/**
 * API: POST /api/seed
 * Crea el usuario admin por defecto si no existe
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Verificar si ya existe un usuario admin
    const adminExists = await prisma.usuario.findFirst({
      where: { rol: 'ADMINISTRADOR_CONTRATISTA' },
    });

    if (adminExists) {
      return NextResponse.json({
        success: true,
        message: 'Usuario admin ya existe',
        created: false,
      });
    }

    // Crear usuario admin por defecto
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const admin = await prisma.usuario.create({
      data: {
        email: 'admin@pani.go.cr',
        nombre: 'Administrador Sistema',
        passwordHash,
        rol: 'ADMINISTRADOR_CONTRATISTA',
        activo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario admin creado exitosamente',
      created: true,
      user: {
        email: admin.email,
        nombre: admin.nombre,
        rol: admin.rol,
      },
    });
  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear usuario admin' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para ejecutar el seed',
    credentials: {
      email: 'admin@pani.go.cr',
      password: 'Password123!',
    },
  });
}
