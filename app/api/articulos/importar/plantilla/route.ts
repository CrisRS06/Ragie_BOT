/**
 * API: /api/articulos/importar/plantilla
 * GET - Descargar plantilla Excel para importacion de articulos
 *
 * NOTA: Esta funcionalidad depende del servicio import-articulos.service que usa Prisma.
 * Stub implementado para version Supabase.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/articulos/importar/plantilla
 * Descarga la plantilla Excel para importacion masiva de articulos
 */
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

    // Esta funcionalidad requiere el servicio import-articulos.service
    // que genera la plantilla Excel.
    return NextResponse.json(
      {
        success: false,
        error: 'Generacion de plantilla no implementada en version Supabase',
        message: 'Esta operacion requiere migracion del servicio import-articulos.service a Supabase',
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error al generar plantilla:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar plantilla',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
