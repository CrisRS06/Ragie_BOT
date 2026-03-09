/**
 * API: /api/documentos-recepcion/[id]
 * GET - Obtener documento de recepcion con detalles
 * DELETE - Eliminar documento en estado BORRADOR
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/documentos-recepcion/[id] - Obtener documento con detalles
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

    // Obtener documento con detalles
    const { data: documento, error } = await supabase
      .from('documentos_recepcion')
      .select(`
        id, numero, proveedor_id, documento_externo, fecha_documento, observaciones, estado, usuario_id, created_at, updated_at,
        proveedor:proveedores(id, codigo, nombre),
        usuario:perfiles(id, nombre),
        detalles:detalles_recepcion(
          id, documento_id, articulo_id, cantidad, costo_unitario, fecha_vencimiento, numero_lote_proveedor, ubicacion, lote_id, created_at,
          articulo:articulos(id, sku, nombre, unidad_medida),
          lote:lotes(id, numero_lote, cantidad_disponible)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !documento) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: documento,
    })
  } catch (error) {
    console.error('Error al obtener documento de recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener documento',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documentos-recepcion/[id] - Eliminar documento en BORRADOR
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('recepciones.crear')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    // Verificar que existe y esta en BORRADOR
    const { data: documento, error: fetchError } = await supabase
      .from('documentos_recepcion')
      .select('id, numero, estado')
      .eq('id', id)
      .single()

    if (fetchError || !documento) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    if (documento.estado !== 'BORRADOR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo se pueden eliminar documentos en estado BORRADOR',
          estadoActual: documento.estado,
        },
        { status: 400 }
      )
    }

    // Eliminar detalles primero
    await supabaseAdmin
      .from('detalles_recepcion')
      .delete()
      .eq('documento_id', id)

    // Eliminar documento
    const { error: deleteError } = await supabaseAdmin
      .from('documentos_recepcion')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'ELIMINAR_DOCUMENTO_RECEPCION',
      entidad: 'documentos_recepcion',
      entidad_id: id,
      datos_anteriores: {
        numero: documento.numero,
        estado: documento.estado,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado correctamente',
    })
  } catch (error) {
    console.error('Error al eliminar documento de recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar documento',
      },
      { status: 500 }
    )
  }
}
