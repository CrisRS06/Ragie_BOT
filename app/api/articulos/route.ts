/**
 * API: /api/articulos
 * GET - Lista todos los articulos activos del sistema
 * POST - Crear nuevo articulo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para crear articulo
const createArticuloSchema = z.object({
  sku: z.string().min(3, 'SKU debe tener al menos 3 caracteres').max(50),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  descripcion_sigaf: z.string().min(10, 'Descripcion SIGAF debe tener al menos 10 caracteres').max(500),
  descripcion: z.string().max(500).optional().nullable(),
  unidad_medida: z.string().min(1, 'Unidad de medida es requerida'),
  stock_minimo: z.number().min(0).optional().nullable(),
  iva_percent: z.number().min(0).max(1).optional().default(0.13),
})

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

    // Obtener articulos
    const { data: articulos, error } = await supabase
      .from('articulos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error al obtener articulos:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Calcular stock total por articulo
    const articulosConStock = await Promise.all(
      (articulos || []).map(async (articulo) => {
        const { data: stockData } = await supabase
          .from('lotes')
          .select('cantidad_disponible')
          .eq('articulo_id', articulo.id)
          .eq('activo', true)
          .gt('cantidad_disponible', 0)

        const stockTotal = stockData?.reduce((sum, lote) => sum + Number(lote.cantidad_disponible), 0) || 0
        const lotesActivos = stockData?.length || 0

        return {
          ...articulo,
          stockTotal,
          lotesActivos,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: articulosConStock,
      total: articulosConStock.length,
    })
  } catch (error) {
    console.error('Error al obtener articulos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener articulos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/articulos - Crear nuevo articulo
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar datos
    const validacion = createArticuloSchema.safeParse(body)
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

    const data = validacion.data

    // Verificar que el SKU no exista
    const { data: existente } = await supabase
      .from('articulos')
      .select('id')
      .eq('sku', data.sku)
      .single()

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un articulo con este SKU' },
        { status: 400 }
      )
    }

    // Crear articulo usando admin client (bypass RLS)
    const { data: articulo, error } = await supabaseAdmin
      .from('articulos')
      .insert({
        sku: data.sku,
        nombre: data.nombre,
        descripcion: data.descripcion,
        descripcion_sigaf: data.descripcion_sigaf,
        unidad_medida: data.unidad_medida,
        stock_minimo: data.stock_minimo,
        iva_percent: data.iva_percent,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear articulo:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_ARTICULO',
      entidad: 'articulos',
      entidad_id: articulo.id,
      datos_nuevos: articulo,
    })

    return NextResponse.json({
      success: true,
      message: 'Articulo creado exitosamente',
      data: articulo,
    })
  } catch (error) {
    console.error('Error al crear articulo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear articulo' },
      { status: 500 }
    )
  }
}
