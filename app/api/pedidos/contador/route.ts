/**
 * GET /api/pedidos/contador
 * Contador para badges del navbar. Polling cada 60s desde cliente.
 * - OPERADOR/ADMIN: cuántos en bandeja (ENVIADO + EN_PREPARACION).
 * - AUDITOR: cuántos pedidos propios LISTO_RETIRO.
 */

import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'

export async function GET() {
  try {
    const auth = await requirePermission('pedidos.ver_propios')
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const puedeVerTodos = hasPermission(user.rol, 'pedidos.ver_todos')

    let bandejaOperador = 0
    let listosAuditor = 0

    if (puedeVerTodos) {
      const { count } = await supabaseAdmin
        .from('ordenes_pedido')
        .select('id', { count: 'exact', head: true })
        .in('estado', ['ENVIADO', 'EN_PREPARACION'])
      bandejaOperador = count || 0
    }

    // Para todos los roles: contar mis pedidos en LISTO_RETIRO (incluye AUDITOR)
    const { count: countListos } = await supabaseAdmin
      .from('ordenes_pedido')
      .select('id', { count: 'exact', head: true })
      .eq('solicitante_id', user.id)
      .eq('estado', 'LISTO_RETIRO')
    listosAuditor = countListos || 0

    return NextResponse.json({
      success: true,
      bandejaOperador,
      listosAuditor,
      total: bandejaOperador + listosAuditor,
    })
  } catch (error) {
    console.error('Error GET /api/pedidos/contador:', error)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
