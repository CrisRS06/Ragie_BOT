/**
 * POST /api/pedidos/[id]/entregar
 * Transición LISTO_RETIRO → ENTREGADO. Llama la PG function `entregar_orden_pedido`
 * que descuenta lotes vía dispatch_peps() y calcula hash de firma atómicamente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { entregarOrdenSchema } from '@/lib/validations/orden-pedido.schema'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

// Indicios de error de negocio esperado lanzados por la función PG
// (dispatch_peps / entregar_orden_pedido). Si el mensaje los contiene,
// es un 400 con causa conocida; si no, es un error inesperado → 500.
const INDICIOS_ERROR_NEGOCIO = ['Stock insuficiente', 'LISTO_RETIRO', 'Orden de pedido', 'Receptor']

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }
    const auth = await requirePermission('pedidos.entregar')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()
    const validacion = entregarOrdenSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const datos = validacion.data

    // Convertir líneas TS al formato JSONB que espera la función PG (camelCase preservado)
    const lineasJsonb = datos.lineas
      ? datos.lineas.map((l) => ({ id: l.id, cantidadEntregada: l.cantidadEntregada }))
      : null

    const { data, error } = await supabaseAdmin.rpc('entregar_orden_pedido', {
      p_orden_id: id,
      p_usuario_id: user.id,
      p_receptor: datos.receptor,
      p_cedula: datos.cedula,
      p_lineas: lineasJsonb,
    })

    if (error) {
      const mensaje = error.message || ''
      const esErrorNegocio = INDICIOS_ERROR_NEGOCIO.some((indicio) => mensaje.includes(indicio))
      if (esErrorNegocio) {
        // Causa conocida (stock insuficiente, estado inválido, receptor, etc.)
        return NextResponse.json({ success: false, error: mensaje }, { status: 400 })
      }
      // Error inesperado: no exponer detalles internos al cliente
      console.error('Error inesperado entregando pedido:', error)
      return NextResponse.json(
        { success: false, error: 'Error al procesar la entrega' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, resultado: data })
  } catch (error) {
    console.error('Error POST /api/pedidos/[id]/entregar:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
