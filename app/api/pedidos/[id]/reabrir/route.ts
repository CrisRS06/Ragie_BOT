/**
 * POST /api/pedidos/[id]/reabrir
 * Devuelve un pedido ENVIADO a BORRADOR para corregirlo (cantidades, líneas) y
 * reenviarlo. Solo el solicitante original o un ADMINISTRADOR, y solo mientras
 * el bodeguero no lo haya aceptado (estado ENVIADO). La transición la valida el
 * trigger PG `validar_transicion_pedido`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }
    const auth = await requirePermission('pedidos.crear')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { data: orden, error } = await supabaseAdmin
      .from('ordenes_pedido')
      .select('id, numero, solicitante_id, estado')
      .eq('id', id)
      .single()
    if (error || !orden) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })

    if (orden.solicitante_id !== user.id && user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ success: false, error: 'Solo el solicitante o un administrador pueden devolver el pedido a borrador' }, { status: 403 })
    }
    if (orden.estado !== 'ENVIADO') {
      return NextResponse.json(
        { success: false, error: `Solo se puede devolver a borrador un pedido enviado (actual: ${orden.estado})` },
        { status: 400 }
      )
    }

    const { error: updError } = await supabaseAdmin
      .from('ordenes_pedido')
      .update({ estado: 'BORRADOR', fecha_envio: null })
      .eq('id', id)
    if (updError) {
      // Carrera: el bodeguero pudo aceptar/rechazar el pedido entre la lectura
      // y este UPDATE. El trigger PG validar_transicion_pedido lo rechaza.
      if ((updError.message || '').includes('Transición')) {
        return NextResponse.json(
          { success: false, error: 'El pedido ya cambió de estado, recargá la página' },
          { status: 409 }
        )
      }
      console.error('Error reabriendo pedido:', updError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_REABIERTO',
      entidad: 'orden_pedido',
      entidad_id: id,
      datos_anteriores: { estado: 'ENVIADO' },
      datos_nuevos: { estado: 'BORRADOR', numero: orden.numero },
    })
    if (auditError) console.error('Fallo audit_log:', auditError)

    return NextResponse.json({ success: true, estado: 'BORRADOR' })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/reabrir:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
