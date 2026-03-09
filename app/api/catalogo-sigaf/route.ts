/**
 * API: /api/catalogo-sigaf
 * GET - Buscar códigos en el catálogo SIGAF
 * POST - Crear código manualmente
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sanitizePostgrestValue } from '@/lib/utils/sanitize'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validación para crear código
const createCodigoSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido').max(100),
  descripcion: z.string().min(1, 'Descripción es requerida').max(500),
  partida: z.string().max(100).optional().nullable(),
  precio_unitario: z.number().min(0).optional().nullable(),
  iva_percent: z.number().min(0).max(1).optional().nullable(),
  clasificacion: z.string().max(200).optional().nullable(),
  contratacion: z.string().max(100).optional().nullable(),
  contratista: z.string().max(200).optional().nullable(),
  plazo_entrega: z.string().max(100).optional().nullable(),
  analista: z.string().max(100).optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
})

/**
 * GET /api/catalogo-sigaf - Buscar códigos
 * Query params: q (búsqueda), limite, offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const limite = parseInt(searchParams.get('limite') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('catalogo_sigaf')
      .select('*', { count: 'exact' })
      .eq('activo', true)
      .order('codigo')
      .range(offset, offset + limite - 1)

    // Búsqueda por código o descripción
    if (q.length >= 2) {
      const safeQ = sanitizePostgrestValue(q)
      query = query.or(`codigo.ilike.%${safeQ}%,descripcion.ilike.%${safeQ}%`)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Error al buscar en catálogo SIGAF:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: items || [],
      total: count || 0,
      limite,
      offset,
    })
  } catch (error) {
    console.error('Error al buscar en catálogo SIGAF:', error)
    return NextResponse.json(
      { success: false, error: 'Error al buscar en catálogo' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/catalogo-sigaf - Crear código manualmente
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('catalogo.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()

    // Validar datos
    const validacion = createCodigoSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      )
    }

    const data = validacion.data

    // Verificar que el código no exista
    const { data: existente } = await supabase
      .from('catalogo_sigaf')
      .select('id')
      .eq('codigo', data.codigo)
      .single()

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un código SIGAF con ese valor' },
        { status: 400 }
      )
    }

    // Crear código
    const { data: codigo, error } = await supabaseAdmin
      .from('catalogo_sigaf')
      .insert({
        codigo: data.codigo,
        descripcion: data.descripcion,
        partida: data.partida || null,
        precio_unitario: data.precio_unitario || null,
        iva_percent: data.iva_percent ?? 0.13,
        clasificacion: data.clasificacion || null,
        contratacion: data.contratacion || null,
        contratista: data.contratista || null,
        plazo_entrega: data.plazo_entrega || null,
        analista: data.analista || null,
        observaciones: data.observaciones || null,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear código SIGAF:', error)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_CODIGO_SIGAF',
      entidad: 'catalogo_sigaf',
      entidad_id: codigo.id,
      datos_nuevos: codigo,
    })

    return NextResponse.json({
      success: true,
      message: 'Código SIGAF creado exitosamente',
      data: codigo,
    })
  } catch (error) {
    console.error('Error al crear código SIGAF:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear código' },
      { status: 500 }
    )
  }
}
