/**
 * API: /api/articulos/[id]
 * GET - Obtener detalle de articulo
 * PUT - Actualizar articulo
 * DELETE - Desactivar articulo (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para actualizar articulo
const updateArticuloSchema = z.object({
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200).optional(),
  descripcion_sigaf: z.string().max(500).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  unidad_medida: z.string().optional(),
  stock_minimo: z.number().min(0).optional().nullable(),
  iva_percent: z.number().min(0).max(1).optional(),
  proveedor_id: z.string().uuid().optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/articulos/[id] - Obtener detalle de articulo
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener articulo
    const { data: articulo, error } = await supabase
      .from('articulos')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !articulo) {
      return NextResponse.json(
        { success: false, error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener lotes activos
    const { data: lotes } = await supabase
      .from('lotes')
      .select('*')
      .eq('articulo_id', id)
      .eq('activo', true)
      .order('fecha_ingreso', { ascending: true })

    // Contar movimientos
    const { count: totalMovimientos } = await supabase
      .from('movimientos')
      .select('*', { count: 'exact', head: true })
      .eq('articulo_id', id)

    // Calcular stock total
    const stockTotal = (lotes || []).reduce(
      (sum, lote) => sum + Number(lote.cantidad_disponible),
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        ...articulo,
        lotes: lotes || [],
        stockTotal,
        lotesActivos: lotes?.length || 0,
        totalMovimientos: totalMovimientos || 0,
      },
    })
  } catch (error) {
    console.error('Error al obtener articulo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener articulo' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/articulos/[id] - Actualizar articulo
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
    const validacion = updateArticuloSchema.safeParse(body)
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

    // Verificar que el articulo existe
    const { data: articuloExistente, error: fetchError } = await supabase
      .from('articulos')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !articuloExistente) {
      return NextResponse.json(
        { success: false, error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    const data = validacion.data

    // Actualizar articulo
    const { data: articuloActualizado, error } = await supabaseAdmin
      .from('articulos')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'EDITAR_ARTICULO',
      entidad: 'articulos',
      entidad_id: id,
      datos_anteriores: articuloExistente,
      datos_nuevos: articuloActualizado,
    })

    return NextResponse.json({
      success: true,
      message: 'Articulo actualizado exitosamente',
      data: articuloActualizado,
    })
  } catch (error) {
    console.error('Error al actualizar articulo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar articulo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/articulos/[id] - Desactivar articulo (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el articulo existe
    const { data: articulo, error: fetchError } = await supabase
      .from('articulos')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !articulo) {
      return NextResponse.json(
        { success: false, error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que no tiene stock activo
    const { data: lotes } = await supabase
      .from('lotes')
      .select('cantidad_disponible')
      .eq('articulo_id', id)
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    if (lotes && lotes.length > 0) {
      const stockTotal = lotes.reduce((sum, lote) => sum + Number(lote.cantidad_disponible), 0)
      return NextResponse.json(
        {
          success: false,
          error: `No se puede desactivar: el articulo tiene ${stockTotal} unidades en stock`,
        },
        { status: 400 }
      )
    }

    // Soft delete - solo desactivar
    const { data: articuloDesactivado, error } = await supabaseAdmin
      .from('articulos')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'DESACTIVAR_ARTICULO',
      entidad: 'articulos',
      entidad_id: id,
      datos_anteriores: { activo: true },
      datos_nuevos: { activo: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Articulo desactivado exitosamente',
      data: articuloDesactivado,
    })
  } catch (error) {
    console.error('Error al desactivar articulo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al desactivar articulo' },
      { status: 500 }
    )
  }
}
