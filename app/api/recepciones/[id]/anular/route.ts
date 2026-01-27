/**
 * API: POST /api/recepciones/[id]/anular
 * Anular una recepcion existente
 *
 * NOTA: Esta funcionalidad requiere transacciones complejas.
 * Stub implementado para version Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const anularRecepcionSchema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/recepciones/[id]/anular - Anular recepcion
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
    const validacion = anularRecepcionSchema.safeParse(body)
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

    // Buscar el movimiento de entrada
    const { data: movimiento, error: fetchError } = await supabase
      .from('movimientos')
      .select(`
        *,
        lote:lotes(*)
      `)
      .eq('tipo', 'ENTRADA')
      .or(`id.eq.${id},lote_id.eq.${id}`)
      .single()

    if (fetchError || !movimiento) {
      return NextResponse.json(
        { success: false, error: 'Recepcion no encontrada' },
        { status: 404 }
      )
    }

    if (movimiento.anulado) {
      return NextResponse.json(
        { success: false, error: 'Esta recepcion ya esta anulada' },
        { status: 400 }
      )
    }

    // Verificar que el lote no ha sido consumido
    if (movimiento.lote) {
      const cantidadConsumida =
        Number(movimiento.lote.cantidad_inicial) - Number(movimiento.lote.cantidad_disponible)

      if (cantidadConsumida > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `No se puede anular: ya se han despachado ${cantidadConsumida} unidades de este lote`,
          },
          { status: 400 }
        )
      }
    }

    // 1. Anular el movimiento
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

    // 2. Desactivar el lote si existe
    if (movimiento.lote) {
      const { error: updateLoteError } = await supabaseAdmin
        .from('lotes')
        .update({
          activo: false,
          cantidad_disponible: 0,
          agotado: true,
        })
        .eq('id', movimiento.lote.id)

      if (updateLoteError) {
        throw updateLoteError
      }
    }

    // 3. Crear movimiento de ajuste para dejar registro
    await supabaseAdmin
      .from('movimientos')
      .insert({
        articulo_id: movimiento.articulo_id,
        lote_id: movimiento.lote_id,
        tipo: 'AJUSTE_INVENTARIO',
        cantidad: -movimiento.cantidad,
        unidad_medida: movimiento.unidad_medida,
        usuario_id: user.id,
        motivo: `Anulacion de recepcion: ${motivo} (Saldo anterior: ${movimiento.cantidad}, Saldo nuevo: 0)`,
      })

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'ANULAR_RECEPCION',
      entidad: 'movimientos',
      entidad_id: movimiento.id,
      datos_anteriores: {
        anulado: false,
        loteActivo: true,
        cantidad: movimiento.cantidad,
      },
      datos_nuevos: {
        anulado: true,
        loteActivo: false,
        motivo,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Recepcion anulada exitosamente',
      data: { id: movimiento.id, anulado: true },
    })
  } catch (error) {
    console.error('Error al anular recepcion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al anular recepcion' },
      { status: 500 }
    )
  }
}
