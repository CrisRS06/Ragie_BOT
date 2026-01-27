/**
 * Health Check Endpoint
 * Verifica que la aplicacion y la base de datos esten funcionando
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Verificar conexion a la base de datos con query simple
    const { error } = await supabaseAdmin.from('articulos').select('id').limit(1)

    if (error && !error.message.includes('does not exist')) {
      throw error
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '2.0.0-supabase',
    })
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        version: '2.0.0-supabase',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
