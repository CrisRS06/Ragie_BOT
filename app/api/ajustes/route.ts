/**
 * API: /api/ajustes
 * POST - Crear ajuste de inventario
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ajusteSchema = z.object({
  loteId: z.string().uuid('ID de lote invalido'),
  cantidadAjuste: z.number().refine((val) => val !== 0, {
    message: 'La cantidad de ajuste no puede ser cero',
  }),
  observaciones: z.string().min(10, 'Observaciones requeridas'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validacion = ajusteSchema.safeParse(body)

    if (!validacion.success) {
      return NextResponse.json({ success: false, error: 'Datos invalidos', errors: validacion.error.format() }, { status: 400 })
    }

    const { loteId, cantidadAjuste, observaciones } = validacion.data

    // Obtener lote actual
    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .select('*, articulo:articulos(id, sku, nombre, unidad_medida)')
      .eq('id', loteId)
      .single()

    if (loteError || !lote) {
      return NextResponse.json({ success: false, error: 'Lote no encontrado' }, { status: 404 })
    }

    // Calcular nueva cantidad
    const nuevaCantidad = Number(lote.cantidad_disponible) + cantidadAjuste

    if (nuevaCantidad < 0) {
      return NextResponse.json({
        success: false,
        error: `Ajuste invalido: resultaria en cantidad negativa (${nuevaCantidad})`
      }, { status: 400 })
    }

    // Actualizar lote
    const { error: updateError } = await supabaseAdmin
      .from('lotes')
      .update({
        cantidad_disponible: nuevaCantidad,
        agotado: nuevaCantidad <= 0,
      })
      .eq('id', loteId)

    if (updateError) {
      throw updateError
    }

    // Crear movimiento de ajuste
    const { data: movimiento, error: movError } = await supabaseAdmin
      .from('movimientos')
      .insert({
        articulo_id: lote.articulo_id,
        lote_id: loteId,
        tipo: 'AJUSTE',
        cantidad: Math.abs(cantidadAjuste),
        usuario_id: user.id,
        observaciones: `${cantidadAjuste >= 0 ? 'Ajuste positivo' : 'Ajuste negativo'}: ${observaciones} (Saldo anterior: ${lote.cantidad_disponible}, Saldo nuevo: ${nuevaCantidad})`,
        bodega_id: lote.bodega_id,
      })
      .select('id')
      .single()

    if (movError) {
      throw movError
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'AJUSTE_INVENTARIO',
      entidad: 'lotes',
      entidad_id: loteId,
      datos_anteriores: { cantidad_disponible: lote.cantidad_disponible },
      datos_nuevos: { cantidad_disponible: nuevaCantidad, ajuste: cantidadAjuste },
    })

    return NextResponse.json({
      success: true,
      movimientoId: movimiento.id,
      data: {
        loteId,
        cantidadAnterior: Number(lote.cantidad_disponible),
        cantidadNueva: nuevaCantidad,
        ajuste: cantidadAjuste,
      }
    })
  } catch (error) {
    console.error('Error en ajuste:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
