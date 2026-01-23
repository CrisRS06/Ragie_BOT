/**
 * API: POST /api/seed
 * Crea o actualiza el usuario admin por defecto
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

const ADMIN_EMAIL = 'admin@bodegaje.example.com';
const ADMIN_PASSWORD = 'Admin2024Secure';

export async function POST() {
  try {
    // Generar hash con la misma función que usa login
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    // Usar upsert para crear o actualizar
    const admin = await prisma.usuario.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        passwordHash,
        activo: true,
      },
      create: {
        email: ADMIN_EMAIL,
        nombre: 'Administrador Sistema',
        passwordHash,
        rol: 'ADMINISTRADOR_CONTRATISTA',
        activo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario admin configurado exitosamente',
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
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });
}
