/**
 * GET /api/pedidos/[id]/pdf
 * Genera el PDF de la orden de pedido.
 * Si estado=ENTREGADO, incluye sección de firma digital con hash SHA-256.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import { generarOrdenPedidoPDF, type EstadoOrdenPedido } from '@/lib/pdf/orden-pedido-pdf'
import { resolverUsuarios } from '@/lib/orden-pedido/resolver-usuarios'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }
    const auth = await requirePermission('pedidos.ver_propios')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { data: orden, error } = await supabaseAdmin
      .from('ordenes_pedido')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !orden) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (!hasPermission(user.rol, 'pedidos.ver_todos') && orden.solicitante_id !== user.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const [lineasRes, bodegaRes, unidadRes, usuariosMap] = await Promise.all([
      supabaseAdmin
        .from('ordenes_pedido_lineas')
        .select(`id, cantidad_solicitada, cantidad_entregada,
                 articulo:articulos!articulo_id(sku, nombre, unidad_medida)`)
        .eq('orden_id', id)
        .order('created_at', { ascending: true }),
      orden.bodega_id
        ? supabaseAdmin.from('bodegas').select('codigo, nombre').eq('id', orden.bodega_id).single()
        : Promise.resolve({ data: null }),
      orden.unidad_receptora_id
        ? supabaseAdmin.from('unidades_receptoras').select('codigo, nombre').eq('id', orden.unidad_receptora_id).single()
        : Promise.resolve({ data: null }),
      resolverUsuarios([orden.solicitante_id, orden.entregado_por_id].filter((x): x is string => !!x)),
    ])
    const solicitante = usuariosMap.get(orden.solicitante_id) ?? null
    const entregadoPor = orden.entregado_por_id ? usuariosMap.get(orden.entregado_por_id) ?? null : null

    if (lineasRes.error) {
      console.error('Error cargando líneas para el PDF:', lineasRes.error)
      return NextResponse.json({ success: false, error: 'Error al generar PDF' }, { status: 500 })
    }

    const lineas = (lineasRes.data || []).map((l) => {
      const art = l.articulo as { sku: string; nombre: string; unidad_medida: string } | null
      return {
        sku: art?.sku || '',
        articulo: art?.nombre || '',
        unidadMedida: art?.unidad_medida || '',
        cantidadSolicitada: Number(l.cantidad_solicitada),
        cantidadEntregada: l.cantidad_entregada != null ? Number(l.cantidad_entregada) : null,
      }
    })

    const entrega = orden.estado === 'ENTREGADO' && orden.hash_firma
      ? {
          receptor: orden.receptor_nombre || '',
          cedula: orden.receptor_cedula,
          operador: entregadoPor?.nombre || '—',
          hashFirma: orden.hash_firma,
        }
      : undefined

    const buffer = await generarOrdenPedidoPDF({
      numero: orden.numero || '—',
      estado: orden.estado as EstadoOrdenPedido,
      fechaCreacion: orden.created_at || new Date().toISOString(),
      fechaEnvio: orden.fecha_envio,
      fechaEntrega: orden.fecha_entrega,
      solicitante: solicitante ? { nombre: solicitante.nombre, email: solicitante.email } : null,
      bodega: bodegaRes.data,
      unidadReceptora: unidadRes.data,
      observaciones: orden.observaciones,
      lineas,
      entrega,
    })

    const safeNumero = (orden.numero || 'sin-numero').replace(/[^a-zA-Z0-9_-]/g, '_')
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="pedido-${safeNumero}.pdf"`,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Error GET /api/pedidos/[id]/pdf:', error)
    return NextResponse.json({ success: false, error: 'Error al generar PDF' }, { status: 500 })
  }
}
