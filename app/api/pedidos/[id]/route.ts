/**
 * API: /api/pedidos/[id]
 * GET - Detalle de una orden con líneas, refs hidratadas, historial desde audit_log.
 *       AUDITOR solo puede ver pedidos propios (filtro server-side).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import { resolverUsuarios } from '@/lib/orden-pedido/resolver-usuarios'
import { crearOrdenPedidoSchema } from '@/lib/validations/orden-pedido.schema'
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

    // Ownership check
    if (!hasPermission(user.rol, 'pedidos.ver_todos') && orden.solicitante_id !== user.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    // Líneas con artículo
    const { data: lineas, error: lineasError } = await supabaseAdmin
      .from('ordenes_pedido_lineas')
      .select(`
        id, cantidad_solicitada, cantidad_entregada, notas, articulo_id,
        articulo:articulos!articulo_id(id, sku, nombre, descripcion_sigaf, unidad_medida, activo)
      `)
      .eq('orden_id', id)
      .order('created_at', { ascending: true })
    if (lineasError) {
      console.error('Error cargando líneas del pedido:', lineasError)
      return NextResponse.json({ success: false, error: 'Error al cargar el pedido' }, { status: 500 })
    }

    // Refs
    const [bodegaRes, unidadRes, usuariosMap] = await Promise.all([
      orden.bodega_id
        ? supabaseAdmin.from('bodegas').select('id, codigo, nombre').eq('id', orden.bodega_id).single()
        : Promise.resolve({ data: null }),
      orden.unidad_receptora_id
        ? supabaseAdmin.from('unidades_receptoras').select('id, codigo, nombre').eq('id', orden.unidad_receptora_id).single()
        : Promise.resolve({ data: null }),
      resolverUsuarios([orden.solicitante_id, orden.aceptado_por_id, orden.entregado_por_id].filter((x): x is string => !!x)),
    ])
    const solicitante = usuariosMap.get(orden.solicitante_id) ?? null
    const aceptadoPor = orden.aceptado_por_id ? usuariosMap.get(orden.aceptado_por_id) ?? null : null
    const entregadoPor = orden.entregado_por_id ? usuariosMap.get(orden.entregado_por_id) ?? null : null

    // Historial desde audit_log
    const { data: historial, error: historialError } = await supabaseAdmin
      .from('audit_log')
      .select('id, accion, created_at, usuario_id, datos_nuevos')
      .eq('entidad', 'orden_pedido')
      .eq('entidad_id', id)
      .order('created_at', { ascending: true })
    if (historialError) {
      console.error('Error cargando historial del pedido:', historialError)
      return NextResponse.json({ success: false, error: 'Error al cargar el pedido' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pedido: {
        id: orden.id,
        numero: orden.numero,
        estado: orden.estado,
        observaciones: orden.observaciones,
        fechaEnvio: orden.fecha_envio,
        fechaAceptacion: orden.fecha_aceptacion,
        fechaListo: orden.fecha_listo,
        fechaEntrega: orden.fecha_entrega,
        receptorNombre: orden.receptor_nombre,
        receptorCedula: orden.receptor_cedula,
        motivoRechazo: orden.motivo_rechazo,
        motivoAnulacion: orden.motivo_anulacion,
        hashFirma: orden.hash_firma,
        createdAt: orden.created_at,
        updatedAt: orden.updated_at,
        bodega: bodegaRes.data,
        unidadReceptora: unidadRes.data,
        solicitanteId: orden.solicitante_id,
        solicitante,
        aceptadoPor,
        entregadoPor,
        lineas: (lineas || []).map((l) => ({
          id: l.id,
          articuloId: l.articulo_id,
          cantidadSolicitada: l.cantidad_solicitada,
          cantidadEntregada: l.cantidad_entregada,
          notas: l.notas,
          articulo: l.articulo,
        })),
        historial: (historial || []).map((h) => ({
          id: h.id,
          accion: h.accion,
          fecha: h.created_at,
          usuarioId: h.usuario_id,
          datos: h.datos_nuevos,
        })),
      },
    })
  } catch (error) {
    console.error('Error GET /api/pedidos/[id]:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PUT /api/pedidos/[id]
 * Edita un pedido en estado BORRADOR (datos + reemplazo de líneas).
 * Solo el solicitante original o un ADMINISTRADOR pueden editar.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      .select('id, numero, estado, solicitante_id')
      .eq('id', id)
      .single()
    if (error || !orden) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (orden.estado !== 'BORRADOR') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden editar pedidos en borrador' },
        { status: 400 }
      )
    }

    if (orden.solicitante_id !== user.id && user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'Solo el solicitante puede editar este borrador' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validacion = crearOrdenPedidoSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const datos = validacion.data

    // Edición atómica: UPDATE cabecera + DELETE líneas viejas + INSERT
    // líneas nuevas en una sola transacción PG (evita borradores corruptos).
    // NOTA: `editar_orden_pedido` (migración 011) aún no está en los tipos
    // generados de Supabase; el cast localizado evita romper el type-check.
    const { error: rpcError } = await (
      supabaseAdmin.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ error: { message: string } | null }>
    )('editar_orden_pedido', {
      p_orden_id: id,
      p_bodega_id: datos.bodegaId,
      p_unidad_receptora_id: datos.unidadReceptoraId,
      p_observaciones: datos.observaciones ?? null,
      p_lineas: datos.lineas.map((l) => ({
        articuloId: l.articuloId,
        cantidadSolicitada: l.cantidadSolicitada,
        notas: l.notas ?? null,
      })),
    })
    if (rpcError) {
      console.error('Error editando orden:', rpcError)
      return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_EDITADO',
      entidad: 'orden_pedido',
      entidad_id: id,
      datos_nuevos: { total_lineas: datos.lineas.length },
    })
    if (auditError) {
      console.error('Fallo audit_log:', auditError)
    }

    return NextResponse.json({
      success: true,
      pedido: { id: orden.id, numero: orden.numero, estado: orden.estado },
    })
  } catch (error) {
    console.error('Error PUT /api/pedidos/[id]:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
