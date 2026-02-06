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
  bodegaId: z.string().uuid('ID de bodega invalido').optional(),
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
      p_documento: datos.documentoReferencia || undefined,
      p_observaciones: datos.observaciones || undefined,
      p_bodega_id: datos.bodegaId || undefined,
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
    const bodegaId = searchParams.get('bodegaId')

    // Obtener movimientos de salida (despachos)
    let query = supabase
      .from('movimientos')
      .select(`
        *,
        articulo:articulos!articulo_id(sku, nombre, unidad_medida),
        lote:lotes!lote_id(numero_lote, fecha_vencimiento, bodega_id),
        bodega:bodegas!bodega_id(id, codigo, nombre)
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
    if (bodegaId) {
      query = query.eq('bodega_id', bodegaId)
    }

    const { data: movimientos, error, count } = await query.range(offset, offset + limite - 1)

    if (error) {
      console.error('Error al listar despachos:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Fetch unidades_receptoras separately (Supabase doesn't auto-detect this FK)
    const unidadIds = [...new Set((movimientos || []).map(m => m.unidad_receptora_id).filter((id): id is string => id !== null))]
    const { data: unidades } = unidadIds.length > 0
      ? await supabase
          .from('unidades_receptoras')
          .select('id, codigo, nombre')
          .in('id', unidadIds)
      : { data: [] }
    const unidadesMap = new Map((unidades || []).map(u => [u.id, u]))

    // Fetch bodegas separately
    const bodegaIds = [...new Set((movimientos || []).map(m => m.bodega_id).filter((id): id is string => id !== null))]
    const { data: bodegas } = bodegaIds.length > 0
      ? await supabase
          .from('bodegas')
          .select('id, codigo, nombre')
          .in('id', bodegaIds)
      : { data: [] }
    const bodegasMap = new Map((bodegas || []).map(b => [b.id, b]))

    // Transform response to camelCase for frontend
    const despachosTransformed = (movimientos || []).map((mov) => {
      const articulo = mov.articulo as { sku: string; nombre: string; unidad_medida: string } | null
      const lote = mov.lote as { numero_lote: string | null; fecha_vencimiento: string; bodega_id: string | null } | null
      const unidadReceptora = mov.unidad_receptora_id ? unidadesMap.get(mov.unidad_receptora_id) : null
      const bodega = mov.bodega_id ? bodegasMap.get(mov.bodega_id) : null

      return {
        id: mov.id,
        cantidad: mov.cantidad,
        timestamp: mov.created_at,
        anulado: mov.anulado,
        motivoAnulacion: mov.motivo_anulacion,
        receptorNombre: mov.receptor_nombre,
        receptorCedula: mov.receptor_cedula,
        documentoReferencia: mov.documento_referencia || null,
        articulo: articulo ? {
          sku: articulo.sku,
          nombre: articulo.nombre,
          unidadMedida: articulo.unidad_medida,
        } : null,
        lote: lote ? {
          numeroLote: lote.numero_lote,
          fechaVencimiento: lote.fecha_vencimiento,
        } : null,
        unidadReceptora: unidadReceptora ? {
          codigo: unidadReceptora.codigo,
          nombre: unidadReceptora.nombre,
        } : null,
        bodega: bodega ? {
          id: bodega.id,
          codigo: bodega.codigo,
          nombre: bodega.nombre,
        } : null,
      }
    })

    return NextResponse.json({
      despachos: despachosTransformed,
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
