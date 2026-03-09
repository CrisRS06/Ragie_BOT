/**
 * API: /api/documentos-recepcion/[id]/anular
 * POST - Anular documento de recepcion
 *
 * NOTA: Esta funcionalidad depende del servicio documento-recepcion.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/documentos-recepcion/[id]/anular
 * Anula un documento de recepcion
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await requirePermission('recepciones.anular')
    if (auth instanceof NextResponse) return auth

    // Esta funcionalidad requiere el servicio documento-recepcion.service
    // que usa funciones complejas de transacciones Prisma.
    return NextResponse.json(
      {
        success: false,
        error: 'Anulacion de documentos no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio documento-recepcion.service a Supabase',
        documentoId: id,
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al anular documento de recepcion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al anular documento',
      },
      { status: 500 }
    )
  }
}
