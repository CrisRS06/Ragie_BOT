/**
 * POST /api/pedidos/[id]/reducir
 * Reduce (solo bajar) la cantidad solicitada de una o más líneas de un pedido
 * ya enviado, sin devolverlo a borrador. Reducir siempre libera stock, así que
 * es seguro y no requiere re-validar el disponible.
 *
 * Permisos: un ADMINISTRADOR puede reducir en ENVIADO o EN_PREPARACION; el
 * solicitante solo en ENVIADO. La PG function `reducir_lineas_pedido` refuerza
 * el estado y el "solo bajar".
 *
 * Body: { lineas: [{ id, cantidadSolicitada }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rpcPedido } from '@/lib/orden-pedido/rpc'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

const reducirSchema = z.object({
  lineas: z
    .array(
      z.object({
        id: uuidSchema,
        cantidadSolicitada: z.number().int('Debe ser un entero').positive('Debe ser mayor a 0'),
      })
    )
    .min(1, 'Debe indicar al menos una línea'),
})

const INDICIOS_ERROR_NEGOCIO = ['Solo se pueden reducir', 'Solo se puede reducir', 'no pertenece', 'mayor o igual a 1', 'No se especificaron', 'Orden de pedido']

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }
    const auth = await requirePermission('pedidos.crear')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()
    const validacion = reducirSchema.safeParse(body)
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

    const esAdmin = user.rol === 'ADMINISTRADOR'
    const esSolicitante = orden.solicitante_id === user.id
    const estadoOk = esAdmin
      ? orden.estado === 'ENVIADO' || orden.estado === 'EN_PREPARACION'
      : esSolicitante && orden.estado === 'ENVIADO'
    if (!estadoOk) {
      return NextResponse.json(
        { success: false, error: 'No tenés permiso para reducir las cantidades de este pedido en su estado actual' },
        { status: 403 }
      )
    }

    const { data, error: rpcError } = await rpcPedido('reducir_lineas_pedido', {
      p_orden_id: id,
      p_lineas: validacion.data.lineas.map((l) => ({ id: l.id, cantidadSolicitada: l.cantidadSolicitada })),
      p_actor_id: user.id,
    })
    if (rpcError) {
      const msg = rpcError.message || ''
      if (INDICIOS_ERROR_NEGOCIO.some((indicio) => msg.includes(indicio))) {
        return NextResponse.json({ success: false, error: msg }, { status: 400 })
      }
      console.error('Error inesperado reduciendo líneas:', rpcError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    return NextResponse.json({ success: true, resultado: data })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/reducir:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
