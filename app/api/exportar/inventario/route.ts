/**
 * API: /api/exportar/inventario
 * GET - Exporta el inventario actual a Excel
 *
 * NOTA: Esta funcionalidad depende del servicio excel.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    // Esta funcionalidad requiere el servicio excel.service
    // que usa funciones de generacion de Excel complejas.
    return NextResponse.json(
      {
        success: false,
        error: 'Exportacion a Excel no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio excel.service a Supabase. Use /api/reportes/valor-bodega para obtener los datos en JSON.',
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al exportar inventario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar inventario' },
      { status: 500 }
    )
  }
}
