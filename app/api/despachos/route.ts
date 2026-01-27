/**
 * API: /api/despachos
 * POST - Crea un nuevo despacho usando el algoritmo PEPS (via PostgreSQL function)
 * GET - Lista despachos recientes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const createDespachoSchema = z.object({
  articuloId: z.string().uuid('ID de articulo invalido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  receptor: z.string().min(3, 'Nombre del receptor es requerido'),
  cedulaReceptor: z.string().optional(),
  documentoReferencia: z.string().optional(),
  observaciones: z.string().optional(),
})

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

    // Validar datos de entrada
    const validacion = createDespachoSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada invalidos',
          detalles: validacion.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const datos = validacion.data

    // Verificar que el articulo existe
    const { data: articulo, error: artError } = await supabase
      .from('articulos')
      .select('id, sku, nombre, unidad_medida')
      .eq('id', datos.articuloId)
      .eq('activo', true)
      .single()

    if (artError || !articulo) {
      return NextResponse.json(
        { error: 'Articulo no encontrado' },
        { status: 404 }
      )
    }

    // Llamar funcion PEPS de PostgreSQL
    const { data: consumos, error: pepsError } = await supabaseAdmin.rpc('dispatch_peps', {
      p_articulo_id: datos.articuloId,
      p_cantidad: datos.cantidad,
      p_usuario_id: user.id,
      p_receptor: datos.receptor,
      p_documento: datos.documentoReferencia || null,
      p_observaciones: datos.observaciones || null,
    })

    if (pepsError) {
      console.error('Error en dispatch_peps:', pepsError)
      return NextResponse.json(
        { error: pepsError.message },
        { status: 400 }
      )
    }

    // Calcular totales
    const lotesConsumidos = (consumos || []).map((c: { lote_id: string; cantidad_consumida: number; costo_unitario: number }) => ({
      loteId: c.lote_id,
      cantidadConsumida: c.cantidad_consumida,
      costoUnitario: c.costo_unitario,
    }))

    const costoTotal = lotesConsumidos.reduce(
      (sum: number, c: { cantidadConsumida: number; costoUnitario: number }) => sum + (c.cantidadConsumida * (c.costoUnitario || 0)),
      0
    )

    return NextResponse.json({
      success: true,
      articulo: {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        unidadMedida: articulo.unidad_medida,
      },
      cantidadTotal: datos.cantidad,
      receptor: datos.receptor,
      lotesConsumidos,
      costoTotal,
      mensaje: `Despacho exitoso de ${datos.cantidad} ${articulo.unidad_medida} de ${articulo.nombre}`,
    })
  } catch (error) {
    console.error('Error al crear despacho:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/despachos - Listar despachos recientes
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
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // Obtener movimientos de salida (despachos)
    let query = supabase
      .from('movimientos')
      .select(`
        *,
        articulos (sku, nombre, unidad_medida),
        lotes (numero_lote, fecha_vencimiento)
      `, { count: 'exact' })
      .eq('tipo', 'SALIDA')
      .order('created_at', { ascending: false })

    // Aplicar filtros de fecha
    if (fechaDesde) {
      query = query.gte('created_at', `${fechaDesde}T00:00:00`)
    }
    if (fechaHasta) {
      query = query.lte('created_at', `${fechaHasta}T23:59:59`)
    }

    const { data: movimientos, error, count } = await query.range(offset, offset + limite - 1)

    if (error) {
      console.error('Error al listar despachos:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      despachos: movimientos,
      total: count || 0,
      limite,
      offset,
    })
  } catch (error) {
    console.error('Error al listar despachos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
