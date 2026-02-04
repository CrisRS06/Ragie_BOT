/**
 * API: POST /api/despachos/[id]/anular
 * Anular un despacho existente y revertir el stock
 *
 * NOTA: Esta funcionalidad requiere transacciones complejas.
 * Implementacion basica para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const anularDespachoSchema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/despachos/[id]/anular - Anular despacho y revertir stock
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json()

    // Validar motivo
    const validacion = anularDespachoSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos invalidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      )
    }

    const { motivo } = validacion.data

    // Buscar el movimiento de salida
    const { data: movimiento, error: fetchError } = await supabase
      .from('movimientos')
      .select(`
        *,
        lote:lotes(id, numero_lote, cantidad_inicial, cantidad_disponible, fecha_vencimiento, costo_unitario, activo, agotado)
      `)
      .eq('id', id)
      .eq('tipo', 'SALIDA')
      .eq('anulado', false)
      .single()

    if (fetchError || !movimiento) {
      return NextResponse.json(
        { success: false, error: 'Despacho no encontrado o ya anulado' },
        { status: 404 }
      )
    }

    // 1. Anular el movimiento de salida
    const { error: updateMovError } = await supabaseAdmin
      .from('movimientos')
      .update({
        anulado: true,
        motivo_anulacion: motivo,
      })
      .eq('id', movimiento.id)

    if (updateMovError) {
      throw updateMovError
    }

    // 2. Revertir el stock al lote
    let cantidadRevertida = 0
    if (movimiento.lote) {
      const nuevaCantidad = Number(movimiento.lote.cantidad_disponible) + Number(movimiento.cantidad)

      const { error: updateLoteError } = await supabaseAdmin
        .from('lotes')
        .update({
          cantidad_disponible: nuevaCantidad,
          agotado: false,
        })
        .eq('id', movimiento.lote.id)

      if (updateLoteError) {
        throw updateLoteError
      }

      cantidadRevertida = Number(movimiento.cantidad)

      // 3. Crear movimiento de ajuste para registro
      await supabaseAdmin
        .from('movimientos')
        .insert({
          articulo_id: movimiento.articulo_id,
          lote_id: movimiento.lote_id,
          tipo: 'AJUSTE_INVENTARIO',
          cantidad: movimiento.cantidad,
          unidad_medida: movimiento.unidad_medida,
          usuario_id: user.id,
          motivo: `Reversion por anulacion de despacho: ${motivo} (Saldo anterior: ${movimiento.lote.cantidad_disponible}, Saldo nuevo: ${nuevaCantidad})`,
        })
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'ANULAR_DESPACHO',
      entidad: 'movimientos',
      entidad_id: id,
      datos_anteriores: {
        anulado: false,
        cantidad: movimiento.cantidad,
      },
      datos_nuevos: {
        anulado: true,
        motivo,
        cantidadRevertida,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Despacho anulado exitosamente. Se revirtieron ${cantidadRevertida} unidades.`,
      data: {
        movimientosAnulados: 1,
        cantidadRevertida,
        lotesRevertidos: movimiento.lote ? [{ loteId: movimiento.lote.id, cantidad: cantidadRevertida }] : [],
      },
    })
  } catch (error) {
    console.error('Error al anular despacho:', error)
    return NextResponse.json(
      { success: false, error: 'Error al anular despacho' },
      { status: 500 }
    )
  }
}
