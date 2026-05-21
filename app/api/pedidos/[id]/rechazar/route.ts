/**
 * POST /api/pedidos/[id]/rechazar
 * Transición ENVIADO o EN_PREPARACION → RECHAZADO (OPERADOR/ADMIN).
 * Body: { motivo: string (min 10) }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rechazarOrdenSchema } from '@/lib/validations/orden-pedido.schema'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }
    const auth = await requirePermission('pedidos.rechazar')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()
    const validacion = rechazarOrdenSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: orden, error } = await supabaseAdmin
      .from('ordenes_pedido')
      .select('id, estado')
      .eq('id', id)
      .single()
    if (error || !orden) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })

    if (!['ENVIADO', 'EN_PREPARACION'].includes(orden.estado)) {
      return NextResponse.json({ success: false, error: `No se puede rechazar desde estado ${orden.estado}` }, { status: 400 })
    }

    const { error: updError } = await supabaseAdmin
      .from('ordenes_pedido')
      .update({ estado: 'RECHAZADO', motivo_rechazo: validacion.data.motivo })
      .eq('id', id)
    if (updError) {
      console.error('Error rechazando pedido:', updError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_RECHAZADO',
      entidad: 'orden_pedido',
      entidad_id: id,
      datos_nuevos: { estado: 'RECHAZADO', motivo: validacion.data.motivo },
    })
    if (auditError) {
      console.error('Fallo audit_log:', auditError)
    }

    return NextResponse.json({ success: true, estado: 'RECHAZADO' })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/rechazar:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
