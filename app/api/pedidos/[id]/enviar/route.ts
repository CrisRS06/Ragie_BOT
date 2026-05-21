/**
 * POST /api/pedidos/[id]/enviar
 * Transición BORRADOR → ENVIADO. Solo el solicitante puede enviar su propia orden.
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
      .select('id, solicitante_id, estado')
      .eq('id', id)
      .single()
    if (error || !orden) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })

    if (orden.solicitante_id !== user.id && user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ success: false, error: 'Solo el solicitante puede enviar este pedido' }, { status: 403 })
    }
    if (orden.estado !== 'BORRADOR') {
      return NextResponse.json({ success: false, error: `No se puede enviar desde estado ${orden.estado}` }, { status: 400 })
    }

    // Validar que tenga al menos una línea
    const { count } = await supabaseAdmin
      .from('ordenes_pedido_lineas')
      .select('id', { count: 'exact', head: true })
      .eq('orden_id', id)
    if (!count || count === 0) {
      return NextResponse.json({ success: false, error: 'El pedido no tiene líneas, agregue artículos antes de enviar' }, { status: 400 })
    }

    const { error: updError } = await supabaseAdmin
      .from('ordenes_pedido')
      .update({ estado: 'ENVIADO', fecha_envio: new Date().toISOString() })
      .eq('id', id)
    if (updError) {
      console.error('Error enviando pedido:', updError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_ENVIADO',
      entidad: 'orden_pedido',
      entidad_id: id,
      datos_nuevos: { estado: 'ENVIADO' },
    })
    if (auditError) {
      console.error('Fallo audit_log:', auditError)
    }

    return NextResponse.json({ success: true, estado: 'ENVIADO' })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/enviar:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
