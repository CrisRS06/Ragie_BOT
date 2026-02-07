/**
 * API: /api/documentos-recepcion
 * POST - Crear nuevo documento de recepcion multi-producto
 * GET - Listar documentos de recepcion
 *
 * NOTA: Esta funcionalidad depende de servicios complejos de Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documentos-recepcion - Listar documentos
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
    const estado = searchParams.get('estado')
    const proveedorId = searchParams.get('proveedorId')
    const limite = parseInt(searchParams.get('limite') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const bodegaId = searchParams.get('bodegaId')

    let query = supabase
      .from('documentos_recepcion')
      .select(`
        *,
        proveedor:proveedores!proveedor_id(id, codigo, nombre),
        usuario:perfiles!usuario_id(id, nombre),
        bodega:bodegas!bodega_id(id, codigo, nombre)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1)

    if (estado) {
      query = query.eq('estado', estado)
    }
    if (proveedorId) {
      query = query.eq('proveedor_id', proveedorId)
    }
    if (bodegaId) {
      query = query.eq('bodega_id', bodegaId)
    }

    const { data: documentos, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: documentos || [],
      total: count || 0,
      limite,
      offset,
    })
  } catch (error) {
    console.error('Error al listar documentos de recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al listar documentos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documentos-recepcion - Crear documento de recepcion multi-producto
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
    const { proveedorId, documentoExterno, fechaDocumento, observaciones, detalles, bodegaId } = body

    // Validar que hay detalles
    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debe incluir al menos un articulo en el documento' },
        { status: 400 }
      )
    }

    // Generar numero de documento
    const fecha = new Date()
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')

    // Obtener contador para numero secuencial
    const { count } = await supabase
      .from('documentos_recepcion')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${anio}-${mes}-01`)

    const secuencial = String((count || 0) + 1).padStart(4, '0')
    const numero = `REC-${anio}${mes}-${secuencial}`

    // Crear documento en estado BORRADOR
    const { data: documento, error: docError } = await supabaseAdmin
      .from('documentos_recepcion')
      .insert({
        numero,
        proveedor_id: proveedorId || null,
        documento_externo: documentoExterno || null,
        fecha_documento: fechaDocumento || null,
        observaciones: observaciones || null,
        estado: 'BORRADOR',
        usuario_id: user.id,
        bodega_id: bodegaId || null,
      })
      .select()
      .single()

    if (docError) {
      throw docError
    }

    // Insertar detalles
    const detallesInsert = detalles.map((detalle: {
      articuloId: string
      cantidad: number
      costoUnitario?: number
      fechaVencimiento?: string
      numeroLoteProveedor?: string
      ubicacion?: string
    }) => ({
      documento_id: documento.id,
      articulo_id: detalle.articuloId,
      cantidad: detalle.cantidad,
      costo_unitario: detalle.costoUnitario || null,
      fecha_vencimiento: detalle.fechaVencimiento || null,
      numero_lote_proveedor: detalle.numeroLoteProveedor || null,
      ubicacion: detalle.ubicacion || null,
    }))

    const { error: detallesError } = await supabaseAdmin
      .from('detalles_recepcion')
      .insert(detallesInsert)

    if (detallesError) {
      // Eliminar documento si falla
      await supabaseAdmin.from('documentos_recepcion').delete().eq('id', documento.id)
      throw detallesError
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_DOCUMENTO_RECEPCION',
      entidad: 'documentos_recepcion',
      entidad_id: documento.id,
      datos_nuevos: {
        numero,
        proveedorId,
        bodegaId,
        cantidadArticulos: detalles.length,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: documento.id,
        numero: documento.numero,
        estado: documento.estado,
        cantidadArticulos: detalles.length,
      },
      mensaje: `Documento ${numero} creado en estado BORRADOR`,
    })
  } catch (error) {
    console.error('Error al crear documento de recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear documento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
