/**
 * API: /api/pedidos
 * POST  - Crea una nueva orden de pedido (BORRADOR o ENVIADO según ?enviar=true)
 * GET   - Lista pedidos con filtros. AUDITOR sin pedidos.ver_todos ve solo los propios.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import { crearOrdenPedidoSchema } from '@/lib/validations/orden-pedido.schema'
import { resolverUsuarios } from '@/lib/orden-pedido/resolver-usuarios'
import { rpcPedido } from '@/lib/orden-pedido/rpc'
import type { Database } from '@/lib/supabase/database.types'

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('pedidos.crear')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()
    const validacion = crearOrdenPedidoSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const datos = validacion.data
    const enviarAhora = request.nextUrl.searchParams.get('enviar') === 'true'
    const esAdmin = user.rol === 'ADMINISTRADOR'
    const forzar = (body as { forzar?: unknown })?.forzar === true && esAdmin
    const motivo = typeof (body as { motivo?: unknown })?.motivo === 'string' ? (body as { motivo: string }).motivo : null

    // Siempre se crea como BORRADOR; el envío (si aplica) pasa por la misma
    // compuerta atómica que /enviar (valida stock disponible-para-comprometer).
    const { data: orden, error: ordenError } = await supabaseAdmin
      .from('ordenes_pedido')
      .insert({
        solicitante_id: user.id,
        bodega_id: datos.bodegaId,
        unidad_receptora_id: datos.unidadReceptoraId,
        observaciones: datos.observaciones ?? null,
        estado: 'BORRADOR',
        fecha_envio: null,
      })
      .select('id, numero, estado, created_at')
      .single()

    if (ordenError || !orden) {
      console.error('Error creando orden:', ordenError)
      return NextResponse.json({ success: false, error: 'No se pudo crear la orden' }, { status: 500 })
    }

    // Insert líneas
    const lineas = datos.lineas.map((l) => ({
      orden_id: orden.id,
      articulo_id: l.articuloId,
      cantidad_solicitada: l.cantidadSolicitada,
      notas: l.notas ?? null,
    }))
    const { error: lineasError } = await supabaseAdmin.from('ordenes_pedido_lineas').insert(lineas)
    if (lineasError) {
      // Rollback manual: borrar la orden
      const { error: rollbackError } = await supabaseAdmin.from('ordenes_pedido').delete().eq('id', orden.id)
      if (rollbackError) {
        console.error('Fallo rollback de orden tras error de líneas:', rollbackError)
      }
      console.error('Error creando líneas:', lineasError)
      return NextResponse.json({ success: false, error: 'No se pudieron crear las líneas' }, { status: 500 })
    }

    // Audit log de creación (el envío registra su propio PEDIDO_ENVIADO)
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'PEDIDO_CREADO',
      entidad: 'orden_pedido',
      entidad_id: orden.id,
      datos_nuevos: { numero: orden.numero, estado: 'BORRADOR', total_lineas: lineas.length },
    })
    if (auditError) {
      console.error('Fallo audit_log:', auditError)
    }

    let estadoFinal: string = 'BORRADOR'
    if (enviarAhora) {
      // Pre-chequeo de stock (mensaje estructurado). El gate real es la función.
      if (!forzar) {
        const { data: faltantes, error: verErr } = await rpcPedido<unknown[]>('verificar_stock_envio', { p_orden_id: orden.id })
        if (verErr) {
          console.error('Error verificando stock de envío:', verErr)
          return NextResponse.json({ success: false, error: 'No se pudo verificar el stock' }, { status: 500 })
        }
        if (Array.isArray(faltantes) && faltantes.length > 0) {
          // El borrador queda guardado y recuperable; el admin puede forzar.
          return NextResponse.json(
            { success: false, code: 'STOCK_INSUFICIENTE', error: 'El pedido excede el stock disponible',
              faltantes, puedeForzar: esAdmin, pedido: { id: orden.id, numero: orden.numero, estado: 'BORRADOR' } },
            { status: 409 }
          )
        }
      }

      const { error: envErr } = await rpcPedido('enviar_orden_pedido', {
        p_orden_id: orden.id,
        p_actor_id: user.id,
        p_forzar: forzar,
        p_motivo_override: motivo,
      })
      if (envErr) {
        const msg = envErr.message || ''
        if (msg.includes('STOCK_INSUFICIENTE')) {
          // Re-consultamos el detalle estructurado en vez de parsear el mensaje.
          const { data: faltantesRace } = await rpcPedido<unknown[]>('verificar_stock_envio', { p_orden_id: orden.id })
          return NextResponse.json(
            { success: false, code: 'STOCK_INSUFICIENTE', error: 'El pedido excede el stock disponible',
              faltantes: Array.isArray(faltantesRace) ? faltantesRace : [], puedeForzar: esAdmin, pedido: { id: orden.id, numero: orden.numero, estado: 'BORRADOR' } },
            { status: 409 }
          )
        }
        if (msg.includes('motivo') || msg.includes('bodega')) {
          return NextResponse.json({ success: false, error: msg }, { status: 400 })
        }
        console.error('Error inesperado enviando pedido recién creado:', envErr)
        return NextResponse.json({ success: false, error: 'No se pudo completar la operación' }, { status: 500 })
      }
      estadoFinal = 'ENVIADO'
    }

    return NextResponse.json({
      success: true,
      pedido: {
        id: orden.id,
        numero: orden.numero,
        estado: estadoFinal,
        createdAt: orden.created_at,
      },
    })
  } catch (error) {
    console.error('Error POST /api/pedidos:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission('pedidos.ver_propios')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const searchParams = request.nextUrl.searchParams
    const limite = Math.min(parseInt(searchParams.get('limite') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const estado = searchParams.get('estado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const busqueda = searchParams.get('q')
    const soloBandeja = searchParams.get('bandeja') === 'true'

    let query = supabaseAdmin
      .from('ordenes_pedido')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Si NO tiene permiso de ver todos → filtrar por solicitante
    if (!hasPermission(user.rol, 'pedidos.ver_todos')) {
      query = query.eq('solicitante_id', user.id)
    }

    if (estado) query = query.eq('estado', estado as Database['public']['Enums']['estado_orden_pedido'])
    // Costa Rica es UTC-6: anclar el rango al timezone local
    if (fechaDesde) query = query.gte('created_at', `${fechaDesde}T00:00:00-06:00`)
    if (fechaHasta) query = query.lte('created_at', `${fechaHasta}T23:59:59-06:00`)
    if (busqueda) query = query.ilike('numero', `%${busqueda}%`)
    if (soloBandeja) query = query.in('estado', ['ENVIADO', 'EN_PREPARACION'])

    const { data: pedidos, error, count } = await query.range(offset, offset + limite - 1)

    if (error) {
      console.error('Error listando pedidos:', error)
      return NextResponse.json({ success: false, error: 'Error al listar pedidos' }, { status: 500 })
    }

    // Hidratar refs (bodega, unidad_receptora, solicitante)
    const bodegaIds = [...new Set((pedidos || []).map((p) => p.bodega_id).filter(Boolean))] as string[]
    const unidadIds = [...new Set((pedidos || []).map((p) => p.unidad_receptora_id).filter(Boolean))] as string[]
    const solicitanteIds = [...new Set((pedidos || []).map((p) => p.solicitante_id))]

    const [bodegasRes, unidadesRes, usuariosMap] = await Promise.all([
      bodegaIds.length
        ? supabaseAdmin.from('bodegas').select('id, codigo, nombre').in('id', bodegaIds)
        : Promise.resolve({ data: [] }),
      unidadIds.length
        ? supabaseAdmin.from('unidades_receptoras').select('id, codigo, nombre').in('id', unidadIds)
        : Promise.resolve({ data: [] }),
      resolverUsuarios(solicitanteIds),
    ])

    const bodegasMap = new Map((bodegasRes.data || []).map((b) => [b.id, b]))
    const unidadesMap = new Map((unidadesRes.data || []).map((u) => [u.id, u]))

    // Contar líneas por orden
    const ordenIds = (pedidos || []).map((p) => p.id)
    const { data: lineasCount, error: lineasCountError } = ordenIds.length
      ? await supabaseAdmin
          .from('ordenes_pedido_lineas')
          .select('orden_id', { count: 'exact', head: false })
          .in('orden_id', ordenIds)
      : { data: [], error: null }
    if (lineasCountError) {
      console.error('Error contando líneas de pedidos:', lineasCountError)
      return NextResponse.json({ success: false, error: 'Error al listar pedidos' }, { status: 500 })
    }
    const lineasPorOrden = new Map<string, number>()
    ;(lineasCount || []).forEach((l) => {
      lineasPorOrden.set(l.orden_id, (lineasPorOrden.get(l.orden_id) || 0) + 1)
    })

    const data = (pedidos || []).map((p) => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      observaciones: p.observaciones,
      fechaEnvio: p.fecha_envio,
      fechaAceptacion: p.fecha_aceptacion,
      fechaListo: p.fecha_listo,
      fechaEntrega: p.fecha_entrega,
      createdAt: p.created_at,
      totalLineas: lineasPorOrden.get(p.id) || 0,
      bodega: p.bodega_id ? bodegasMap.get(p.bodega_id) || null : null,
      unidadReceptora: p.unidad_receptora_id ? unidadesMap.get(p.unidad_receptora_id) || null : null,
      solicitanteId: p.solicitante_id,
      solicitante: usuariosMap.get(p.solicitante_id) || { id: p.solicitante_id, nombre: 'Usuario', email: null },
    }))

    return NextResponse.json({
      success: true,
      pedidos: data,
      total: count || 0,
      limite,
      offset,
    })
  } catch (error) {
    console.error('Error GET /api/pedidos:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
