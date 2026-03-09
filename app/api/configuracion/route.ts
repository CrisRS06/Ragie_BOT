/**
 * API: /api/configuracion
 * GET - Obtener configuracion del sistema
 * PUT - Actualizar configuracion del sistema
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Valores por defecto del sistema
const DEFAULT_CONFIG: Record<string, { valor: string; tipo: string; descripcion: string }> = {
  diasAlertaVencimiento: {
    valor: '30',
    tipo: 'NUMBER',
    descripcion: 'Dias antes del vencimiento para generar alerta',
  },
  diasAlertaCritico: {
    valor: '7',
    tipo: 'NUMBER',
    descripcion: 'Dias para alerta critica de vencimiento',
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
    descripcion: 'Nombre de la organizacion',
  },
  emailNotificaciones: {
    valor: '',
    tipo: 'STRING',
    descripcion: 'Email para envio de notificaciones',
  },
  maxRecepcionesDia: {
    valor: '100',
    tipo: 'NUMBER',
    descripcion: 'Maximo de recepciones por dia',
  },
  maxDespachosDia: {
    valor: '100',
    tipo: 'NUMBER',
    descripcion: 'Maximo de despachos por dia',
  },
}

// Funcion para parsear valor segun tipo
function parseValue(valor: string, tipo: string): string | number | boolean {
  switch (tipo) {
    case 'NUMBER':
      return parseInt(valor, 10)
    case 'BOOLEAN':
      return valor === 'true'
    default:
      return valor
  }
}

// Funcion para convertir a string
function stringifyValue(valor: unknown): string {
  if (typeof valor === 'boolean') return valor ? 'true' : 'false'
  if (typeof valor === 'number') return valor.toString()
  return String(valor)
}

/**
 * GET /api/configuracion - Obtener configuracion actual
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar todas las configuraciones existentes
    const { data: configs, error } = await supabase
      .from('configuracion')
      .select('*')

    if (error) {
      console.error('Error al obtener configuracion:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener configuracion' },
        { status: 500 }
      )
    }

    // Construir objeto de configuracion con defaults
    const resultado: Record<string, unknown> = {}

    // Primero agregar valores por defecto
    for (const [clave, config] of Object.entries(DEFAULT_CONFIG)) {
      resultado[clave] = parseValue(config.valor, config.tipo)
    }

    // Sobrescribir con valores de la base de datos
    for (const config of configs || []) {
      resultado[config.clave] = parseValue(config.valor, config.tipo)
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('Error al obtener configuracion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuracion' },
      { status: 500 }
    )
  }
}

// Schema de validacion para actualizar configuracion
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
})

/**
 * PUT /api/configuracion - Actualizar configuracion
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission('configuracion.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()

    // Validar datos
    const validacion = updateConfigSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos invalidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      )
    }

    const datosActualizados = validacion.data

    // Obtener configuracion anterior para audit_log
    const { data: configAnterior } = await supabase
      .from('configuracion')
      .select('*')

    const estadoAnterior: Record<string, unknown> = {}
    for (const config of configAnterior || []) {
      estadoAnterior[config.clave] = parseValue(config.valor, config.tipo)
    }

    // Actualizar cada clave
    for (const [clave, valor] of Object.entries(datosActualizados)) {
      if (valor === undefined || valor === null) continue

      const defaultConfig = DEFAULT_CONFIG[clave]
      const tipo = defaultConfig?.tipo || 'STRING'

      // Upsert - insertar o actualizar
      const { error } = await supabaseAdmin
        .from('configuracion')
        .upsert({
          clave,
          valor: stringifyValue(valor),
          tipo,
          descripcion: defaultConfig?.descripcion || clave,
        }, {
          onConflict: 'clave',
        })

      if (error) {
        console.error(`Error al actualizar ${clave}:`, error)
      }
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'ACTUALIZAR_CONFIGURACION',
      entidad: 'configuracion',
      entidad_id: 'sistema',
      datos_anteriores: estadoAnterior as Record<string, string | number | boolean>,
      datos_nuevos: datosActualizados as Record<string, string | number | boolean>,
    })

    // Obtener configuracion actualizada
    const { data: configsActualizadas } = await supabase
      .from('configuracion')
      .select('*')

    const resultado: Record<string, unknown> = {}

    for (const [clave, config] of Object.entries(DEFAULT_CONFIG)) {
      resultado[clave] = parseValue(config.valor, config.tipo)
    }
    for (const config of configsActualizadas || []) {
      resultado[config.clave] = parseValue(config.valor, config.tipo)
    }

    return NextResponse.json({
      success: true,
      message: 'Configuracion actualizada exitosamente',
      data: resultado,
    })
  } catch (error) {
    console.error('Error al actualizar configuracion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuracion' },
      { status: 500 }
    )
  }
}
