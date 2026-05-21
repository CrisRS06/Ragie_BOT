/**
 * POST /api/pedidos/[id]/anular
 * Anula una orden. Reglas:
 *  - Solicitante puede anular su propia orden en BORRADOR o ENVIADO.
 *  - OPERADOR puede anular una orden en LISTO_RETIRO (caso "no retirado").
 *  - ADMINISTRADOR puede anular cualquier orden no terminal.
 * Body: { motivo: string (min 5) }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import { anularOrdenSchema } from '@/lib/validations/orden-pedido.schema'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }
    const auth = await requirePermission('pedidos.anular_propio')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()
    const validacion = anularOrdenSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: orden, error } = await supabaseAdmin
      .from('ordenes_pedido')
      .select('id, solicitante_id, estado')
      .eq('id', id)
      .single()
    if (error || !orden) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })

    const esSolicitante = orden.solicitante_id === user.id
    const esAdmin = user.rol === 'ADMINISTRADOR' || hasPermission(user.rol, 'pedidos.anular_cualquiera')
    const esOperador = user.rol === 'OPERADOR'

    // Verificar quién puede anular en cada estado
    const puede =
      esAdmin ||
      (esSolicitante && (orden.estado === 'BORRADOR' || orden.estado === 'ENVIADO')) ||
      (esOperador && orden.estado === 'LISTO_RETIRO')

    if (!puede) {
      return NextResponse.json(
        { success: false, error: `No autorizado para anular en estado ${orden.estado}` },
        { status: 403 }
      )
    }

    const { error: updError } = await supabaseAdmin
      .from('ordenes_pedido')
      .update({ estado: 'ANULADO', motivo_anulacion: validacion.data.motivo })
      .eq('id', id)
    if (updError) {
      console.error('Error anulando pedido:', updError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_ANULADO',
      entidad: 'orden_pedido',
      entidad_id: id,
      datos_nuevos: { estado: 'ANULADO', motivo: validacion.data.motivo, estado_previo: orden.estado },
    })
    if (auditError) {
      console.error('Fallo audit_log:', auditError)
    }

    return NextResponse.json({ success: true, estado: 'ANULADO' })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/anular:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
