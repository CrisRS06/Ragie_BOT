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

    let query = supabase
      .from('documentos_recepcion')
      .select(`
        *,
        proveedor:proveedores(id, codigo, nombre),
        usuario:perfiles(id, nombre)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1)

    if (estado) {
      query = query.eq('estado', estado)
    }
    if (proveedorId) {
      query = query.eq('proveedor_id', proveedorId)
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
 * POST /api/documentos-recepcion - Crear documento
 * NOTA: Esta funcionalidad requiere logica compleja de transacciones.
 * Stub para version Supabase.
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

    // Esta funcionalidad requiere el servicio documento-recepcion.service
    // que usa Prisma con transacciones complejas.
    // Por ahora, retornamos un stub.
    return NextResponse.json(
      {
        success: false,
        error: 'Funcionalidad no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio documento-recepcion.service a Supabase',
      },
      { status: 501 }
    )
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
