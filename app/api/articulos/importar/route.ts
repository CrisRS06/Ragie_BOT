/**
 * API: /api/articulos/importar
 * POST - Importar articulos desde archivo Excel
 *
 * NOTA: Esta funcionalidad depende del servicio import-articulos.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/articulos/importar
 * Importa articulos desde un archivo Excel
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

    // Esta funcionalidad requiere el servicio import-articulos.service
    // que usa funciones de procesamiento de Excel y Prisma.
    return NextResponse.json(
      {
        success: false,
        error: 'Importacion de articulos no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio import-articulos.service a Supabase',
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al importar articulos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar importacion',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
