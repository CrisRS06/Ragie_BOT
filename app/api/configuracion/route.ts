/**
 * API: /api/configuracion
 * GET - Obtener configuración del sistema
 * PUT - Actualizar configuración del sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { registrarBitacora } from '@/lib/services/bitacora.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Valores por defecto del sistema
const DEFAULT_CONFIG: Record<string, { valor: string; tipo: string; descripcion: string }> = {
  diasAlertaVencimiento: {
    valor: '30',
    tipo: 'NUMBER',
    descripcion: 'Días antes del vencimiento para generar alerta',
  },
  diasAlertaCritico: {
    valor: '7',
    tipo: 'NUMBER',
    descripcion: 'Días para alerta crítica de vencimiento',
  },
  permitirStockNegativo: {
    valor: 'false',
    tipo: 'BOOLEAN',
    descripcion: 'Permitir que el stock sea negativo',
  },
  requiereFirmaDigital: {
    valor: 'false',
    tipo: 'BOOLEAN',
    descripcion: 'Requerir firma digital en despachos',
  },
  formatoFecha: {
    valor: 'es-CR',
    tipo: 'STRING',
    descripcion: 'Formato de fecha del sistema',
  },
  zonaHoraria: {
    valor: 'America/Costa_Rica',
    tipo: 'STRING',
    descripcion: 'Zona horaria del sistema',
  },
  nombreOrganizacion: {
    valor: 'PANI',
    tipo: 'STRING',
    descripcion: 'Nombre de la organización',
  },
  emailNotificaciones: {
    valor: '',
    tipo: 'STRING',
    descripcion: 'Email para envío de notificaciones',
  },
  maxRecepcionesDia: {
    valor: '100',
    tipo: 'NUMBER',
    descripcion: 'Máximo de recepciones por día',
  },
  maxDespachosDia: {
    valor: '100',
    tipo: 'NUMBER',
    descripcion: 'Máximo de despachos por día',
  },
};

// Función para parsear valor según tipo
function parseValue(valor: string, tipo: string): string | number | boolean {
  switch (tipo) {
    case 'NUMBER':
      return parseInt(valor, 10);
    case 'BOOLEAN':
      return valor === 'true';
    default:
      return valor;
  }
}

// Función para convertir a string
function stringifyValue(valor: unknown): string {
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') return valor.toString();
  return String(valor);
}

/**
 * GET /api/configuracion - Obtener configuración actual
 */
export async function GET() {
  try {
    // Buscar todas las configuraciones existentes
    const configs = await prisma.configuracion.findMany();

    // Construir objeto de configuración con defaults
    const resultado: Record<string, unknown> = {};

    // Primero agregar valores por defecto
    for (const [clave, config] of Object.entries(DEFAULT_CONFIG)) {
      resultado[clave] = parseValue(config.valor, config.tipo);
    }

    // Sobrescribir con valores de la base de datos
    for (const config of configs) {
      resultado[config.clave] = parseValue(config.valor, config.tipo);
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// Schema de validación para actualizar configuración
const updateConfigSchema = z.object({
  diasAlertaVencimiento: z.number().min(1).max(365).optional(),
  diasAlertaCritico: z.number().min(1).max(30).optional(),
  permitirStockNegativo: z.boolean().optional(),
  requiereFirmaDigital: z.boolean().optional(),
  formatoFecha: z.enum(['es-CR', 'es-ES', 'en-US']).optional(),
  zonaHoraria: z.string().optional(),
  nombreOrganizacion: z.string().min(2).max(100).optional(),
  emailNotificaciones: z.string().email().nullable().optional(),
  maxRecepcionesDia: z.number().min(1).max(1000).optional(),
  maxDespachosDia: z.number().min(1).max(1000).optional(),
});

/**
 * PUT /api/configuracion - Actualizar configuración
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const usuarioId = getCurrentUserId();

    // Validar datos
    const validacion = updateConfigSchema.safeParse(body);
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

    const datosActualizados = validacion.data;

    // Obtener configuración anterior para bitácora
    const configAnterior = await prisma.configuracion.findMany();
    const estadoAnterior: Record<string, unknown> = {};
    for (const config of configAnterior) {
      estadoAnterior[config.clave] = parseValue(config.valor, config.tipo);
    }

    // Actualizar cada clave
    for (const [clave, valor] of Object.entries(datosActualizados)) {
      if (valor === undefined || valor === null) continue;

      const defaultConfig = DEFAULT_CONFIG[clave];
      const tipo = defaultConfig?.tipo || 'STRING';

      await prisma.configuracion.upsert({
        where: { clave },
        update: {
          valor: stringifyValue(valor),
        },
        create: {
          clave,
          valor: stringifyValue(valor),
          tipo,
          descripcion: defaultConfig?.descripcion || clave,
        },
      });
    }

    // Registrar en bitácora
    await registrarBitacora({
      usuarioId,
      accion: 'ACTUALIZAR_CONFIGURACION',
      entidad: 'Configuracion',
      entidadId: 'sistema',
      estadoAnterior,
      estadoNuevo: datosActualizados,
    });

    // Obtener configuración actualizada
    const configsActualizadas = await prisma.configuracion.findMany();
    const resultado: Record<string, unknown> = {};

    for (const [clave, config] of Object.entries(DEFAULT_CONFIG)) {
      resultado[clave] = parseValue(config.valor, config.tipo);
    }
    for (const config of configsActualizadas) {
      resultado[config.clave] = parseValue(config.valor, config.tipo);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: resultado,
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
