/**
 * POST /api/pedidos/[id]/enviar
 * Transición BORRADOR → ENVIADO vía la PG function `enviar_orden_pedido`, que
 * valida la demanda contra el disponible-para-comprometer (stock − pedidos
 * abiertos) por bodega y bloquea el sobre-pedido.
 *
 * Body opcional `{ forzar, motivo }`: solo un ADMINISTRADOR puede forzar el
 * envío pese al faltante (queda auditado con el motivo). Si falta stock y no se
 * fuerza, responde 409 con `code: 'STOCK_INSUFICIENTE'` y el detalle por artículo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rpcPedido } from '@/lib/orden-pedido/rpc'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = (await request.json().catch(() => ({}))) as { forzar?: unknown; motivo?: unknown }
    const esAdmin = user.rol === 'ADMINISTRADOR'
    const forzar = body?.forzar === true && esAdmin
    const motivo = typeof body?.motivo === 'string' ? body.motivo : null

    // Pre-chequeo de stock para devolver un mensaje estructurado (UX). El gate
    // autoritativo y libre de carreras es la propia función enviar_orden_pedido.
    if (!forzar) {
      const { data: faltantes, error: verErr } = await rpcPedido<unknown[]>('verificar_stock_envio', { p_orden_id: id })
      if (verErr) {
        console.error('Error verificando stock de envío:', verErr)
        return NextResponse.json({ success: false, error: 'No se pudo verificar el stock' }, { status: 500 })
      }
      if (Array.isArray(faltantes) && faltantes.length > 0) {
        return NextResponse.json(
          { success: false, code: 'STOCK_INSUFICIENTE', error: 'El pedido excede el stock disponible', faltantes, puedeForzar: esAdmin },
          { status: 409 }
        )
      }
    }

    const { data, error: envErr } = await rpcPedido('enviar_orden_pedido', {
      p_orden_id: id,
      p_actor_id: user.id,
      p_forzar: forzar,
      p_motivo_override: motivo,
    })
    if (envErr) {
      const msg = envErr.message || ''
      if (msg.includes('STOCK_INSUFICIENTE')) {
        // Carrera: el stock se agotó entre el pre-chequeo y el flip atómico.
        // Re-consultamos el detalle estructurado en vez de parsear el mensaje.
        const { data: faltantesRace } = await rpcPedido<unknown[]>('verificar_stock_envio', { p_orden_id: id })
        return NextResponse.json(
          { success: false, code: 'STOCK_INSUFICIENTE', error: 'El pedido excede el stock disponible',
            faltantes: Array.isArray(faltantesRace) ? faltantesRace : [], puedeForzar: esAdmin },
          { status: 409 }
        )
      }
      if (msg.includes('BORRADOR') || msg.includes('líneas') || msg.includes('motivo') || msg.includes('bodega')) {
        return NextResponse.json({ success: false, error: msg }, { status: 400 })
      }
      console.error('Error inesperado enviando pedido:', envErr)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    return NextResponse.json({ success: true, estado: 'ENVIADO', resultado: data })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/enviar:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
