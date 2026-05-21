/**
 * POST /api/pedidos/[id]/listo
 * Transición EN_PREPARACION → LISTO_RETIRO (OPERADOR/ADMIN).
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
    const auth = await requirePermission('pedidos.marcar_listo')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { data: orden, error } = await supabaseAdmin
      .from('ordenes_pedido')
      .select('id, estado')
      .eq('id', id)
      .single()
    if (error || !orden) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })

    if (orden.estado !== 'EN_PREPARACION') {
      return NextResponse.json({ success: false, error: `No se puede marcar listo desde estado ${orden.estado}` }, { status: 400 })
    }

    const { error: updError } = await supabaseAdmin
      .from('ordenes_pedido')
      .update({ estado: 'LISTO_RETIRO', fecha_listo: new Date().toISOString() })
      .eq('id', id)
    if (updError) {
      console.error('Error marcando listo:', updError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_LISTO_RETIRO',
      entidad: 'orden_pedido',
      entidad_id: id,
      datos_nuevos: { estado: 'LISTO_RETIRO' },
    })
    if (auditError) {
      console.error('Fallo audit_log:', auditError)
    }

    return NextResponse.json({ success: true, estado: 'LISTO_RETIRO' })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/listo:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
