/**
 * API: /api/proveedores
 * GET - Lista todos los proveedores
 * POST - Crear nuevo proveedor
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion
const createProveedorSchema = z.object({
  codigo: z.string().min(2, 'Codigo debe tener al menos 2 caracteres').max(20),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  ruc: z.string().max(20).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email('Email invalido').optional().nullable().or(z.literal('')),
  contacto: z.string().max(100).optional().nullable(),
})

/**
 * GET /api/proveedores - Lista todos los proveedores
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

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('proveedores')
      .select('*')
      .order('nombre')

    if (!includeInactive) {
      query = query.eq('activo', true)
    }

    const { data: proveedores, error } = await query

    if (error) {
      console.error('Error al obtener proveedores:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: proveedores || [],
      total: proveedores?.length || 0,
    })
  } catch (error) {
    console.error('Error al obtener proveedores:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener proveedores' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/proveedores - Crear nuevo proveedor
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar datos
    const validacion = createProveedorSchema.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos invalidos',
          errors: validacion.error.format(),
        },
        { status: 400 }
      )
    }

    const data = validacion.data

    // Verificar que el codigo no exista
    const { data: existente } = await supabase
      .from('proveedores')
      .select('id')
      .eq('codigo', data.codigo.toUpperCase())
      .single()

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un proveedor con este codigo' },
        { status: 400 }
      )
    }

    // Crear proveedor usando admin client (bypass RLS)
    const { data: proveedor, error } = await supabaseAdmin
      .from('proveedores')
      .insert({
        codigo: data.codigo.toUpperCase(),
        nombre: data.nombre,
        ruc: data.ruc || null,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        email: data.email || null,
        contacto: data.contacto || null,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear proveedor:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_PROVEEDOR',
      entidad: 'proveedores',
      entidad_id: proveedor.id,
      datos_nuevos: proveedor,
    })

    return NextResponse.json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: proveedor,
    })
  } catch (error) {
    console.error('Error al crear proveedor:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear proveedor' },
      { status: 500 }
    )
  }
}
