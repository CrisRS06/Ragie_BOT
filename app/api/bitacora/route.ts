/**
 * API: GET /api/bitacora
 * Lista eventos de la bitácora con filtros
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const accion = searchParams.get('accion');
    const entidad = searchParams.get('entidad');
    const usuarioId = searchParams.get('usuarioId');
    const limite = parseInt(searchParams.get('limite') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtro
    const where: any = {};

    if (desde || hasta) {
      where.timestamp = {};
      if (desde) where.timestamp.gte = new Date(desde);
      if (hasta) where.timestamp.lte = new Date(hasta);
    }

    if (accion) where.accion = accion;
    if (entidad) where.entidad = entidad;
    if (usuarioId) where.usuarioId = usuarioId;

    // Obtener registros
    const registros = await prisma.bitacora.findMany({
      where,
      include: {
        usuario: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limite,
      skip: offset,
    });

    const total = await prisma.bitacora.count({ where });

    // Obtener lista de acciones únicas para filtros
    const acciones = await prisma.bitacora.groupBy({
      by: ['accion'],
      _count: true,
      orderBy: { _count: { accion: 'desc' } },
      take: 20,
    });

    // Obtener lista de entidades únicas para filtros
    const entidades = await prisma.bitacora.groupBy({
      by: ['entidad'],
      _count: true,
      orderBy: { _count: { entidad: 'desc' } },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      registros: registros.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        accion: r.accion,
        entidad: r.entidad,
        entidadId: r.entidadId,
        estadoAnterior: r.estadoAnterior,
        estadoNuevo: r.estadoNuevo,
        hashActual: r.hashActual,
        hashAnterior: r.hashAnterior,
        usuario: r.usuario,
        ip: r.ip,
        userAgent: r.userAgent,
      })),
      filtrosDisponibles: {
        acciones: acciones.map((a) => ({ accion: a.accion, count: a._count })),
        entidades: entidades.map((e) => ({ entidad: e.entidad, count: e._count })),
      },
      paginacion: {
        total,
        limite,
        offset,
        paginas: Math.ceil(total / limite),
      },
    });
  } catch (error) {
    console.error('Error al listar bitácora:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
