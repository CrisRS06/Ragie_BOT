/**
 * API: /api/recepciones
 * GET - Listar recepciones
 * POST - Crear una nueva recepcion de mercancia
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createRecepcionSchema = z.object({
  articuloId: z.string().uuid('ID de articulo invalido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  fechaVencimiento: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de vencimiento invalida',
  }),
  costoUnitario: z.number().min(0).optional(),
  numeroLote: z.string().optional(),
  proveedor: z.string().optional(),
  documentoReferencia: z.string().optional(),
  bodegaId: z.string().uuid('ID de bodega invalido').optional(),
})

/**
 * GET /api/recepciones - Listar recepciones (entradas)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limite = parseInt(searchParams.get('limite') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const articuloId = searchParams.get('articuloId')

    const bodegaId = searchParams.get('bodegaId')

    // Query base
    let query = supabase
      .from('movimientos')
      .select(`
        *,
        articulo:articulos!articulo_id(sku, nombre, unidad_medida),
        lote:lotes!lote_id(id, numero_lote, cantidad_inicial, cantidad_disponible, fecha_vencimiento, proveedor, bodega_id),
        bodega:bodegas!bodega_id(id, codigo, nombre)
      `, { count: 'exact' })
      .eq('tipo', 'ENTRADA')
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1)

    if (articuloId) {
      query = query.eq('articulo_id', articuloId)
    }

    if (bodegaId) {
      query = query.eq('bodega_id', bodegaId)
    }

    const { data: movimientos, error, count } = await query

    if (error) {
      console.error('Error al listar recepciones:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: movimientos,
      total: count || 0,
      limite,
      offset,
    })
  } catch (error) {
    console.error('Error al listar recepciones:', error)
    return NextResponse.json(
      { success: false, error: 'Error al listar recepciones' },
      { status: 500 }
    )
  }
}

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

    // Validar con Zod
    const validacion = createRecepcionSchema.safeParse(body)
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

    // Verificar que el articulo existe
    const { data: articulo, error: artError } = await supabase
      .from('articulos')
      .select('id, nombre, unidad_medida')
      .eq('id', data.articuloId)
      .eq('activo', true)
      .single()

    if (artError || !articulo) {
      return NextResponse.json(
        { success: false, error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Llamar funcion de recepcion de PostgreSQL
    const { data: loteId, error: recError } = await supabaseAdmin.rpc('receive_inventory', {
      p_articulo_id: data.articuloId,
      p_cantidad: data.cantidad,
      p_fecha_vencimiento: data.fechaVencimiento,
      p_costo_unitario: data.costoUnitario || 0,
      p_usuario_id: user.id,
      p_proveedor: data.proveedor || undefined,
      p_numero_lote: data.numeroLote || undefined,
      p_documento: data.documentoReferencia || undefined,
      p_bodega_id: data.bodegaId || undefined,
    })

    if (recError) {
      console.error('Error en receive_inventory:', recError)
      return NextResponse.json(
        { success: false, error: recError.message },
        { status: 500 }
      )
    }

    // Obtener el lote creado
    const { data: lote } = await supabaseAdmin
      .from('lotes')
      .select('*')
      .eq('id', loteId)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Recepcion creada exitosamente',
      data: {
        loteId,
        lote,
        articulo: {
          id: articulo.id,
          nombre: articulo.nombre,
          unidadMedida: articulo.unidad_medida,
        },
        cantidad: data.cantidad,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Error al crear recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear recepcion',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
