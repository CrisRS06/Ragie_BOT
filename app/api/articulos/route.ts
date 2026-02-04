/**
 * API: /api/articulos
 * GET - Lista todos los articulos activos del sistema
 * POST - Crear nuevo articulo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validacion para crear articulo (acepta camelCase del frontend)
const createArticuloSchema = z.object({
  sku: z.string().min(1, 'El código interno es requerido').max(50).transform((val) => val.trim()),
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(200),
  descripcionSIGAF: z.string().max(500).optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
  proveedorId: z.string().uuid().optional().nullable(),
  unidadMedida: z.string().min(1, 'Unidad de medida es requerida'),
  stockMinimo: z.number().min(0).optional().nullable(),
  ivaPercent: z.number().min(0).max(1).optional().default(0.13),
  // Campos opcionales adicionales del formulario
  codigoSIGAF: z.string().max(100).optional().nullable(),
  codigoBarras: z.string().max(100).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
  stockMaximo: z.number().min(0).optional().nullable(),
  requiereVencimiento: z.boolean().optional().default(true),
  codigoPANI: z.string().max(100).optional().nullable(),
  codigoSICOP: z.string().max(100).optional().nullable(),
  codigoSICOPL: z.string().max(100).optional().nullable(),
  categoria: z.string().max(50).optional().nullable(),
  precio: z.number().min(0).optional().nullable(),
  costoReferencia: z.number().min(0).optional().nullable(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener articulos con proveedor
    const { data: articulos, error } = await supabase
      .from('articulos')
      .select('*, proveedores(id, codigo, nombre)')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error al obtener articulos:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Obtener TODOS los lotes activos en UNA sola query (evita N+1)
    const { data: todosLotes } = await supabase
      .from('lotes')
      .select('articulo_id, cantidad_disponible')
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    // Calcular stock y conteo de lotes por artículo en memoria
    const stockPorArticulo: Record<string, { total: number; count: number }> = {}
    if (todosLotes) {
      for (const lote of todosLotes) {
        const articuloId = lote.articulo_id
        if (!stockPorArticulo[articuloId]) {
          stockPorArticulo[articuloId] = { total: 0, count: 0 }
        }
        stockPorArticulo[articuloId].total += Number(lote.cantidad_disponible)
        stockPorArticulo[articuloId].count++
      }
    }

    // Mapear artículos con su stock (sin queries adicionales)
    const articulosConStock = (articulos || []).map((articulo) => {
      const stockInfo = stockPorArticulo[articulo.id] || { total: 0, count: 0 }
      const proveedor = articulo.proveedores as { id: string; codigo: string; nombre: string } | null

      return {
        id: articulo.id,
        sku: articulo.sku,
        nombre: articulo.nombre,
        descripcion: articulo.descripcion,
        descripcionSIGAF: articulo.descripcion_sigaf,
        codigoSIGAF: articulo.codigo_sigaf,
        unidadMedida: articulo.unidad_medida,
        ivaPercent: articulo.iva_percent,
        activo: articulo.activo,
        stockMinimo: articulo.stock_minimo,
        marca: articulo.marca,
        proveedorId: articulo.proveedor_id,
        proveedor: proveedor ? {
          id: proveedor.id,
          codigo: proveedor.codigo,
          nombre: proveedor.nombre,
        } : null,
        stockTotal: stockInfo.total,
        lotesActivos: stockInfo.count,
      }
    })

    return NextResponse.json({
      success: true,
      data: articulosConStock,
      total: articulosConStock.length,
    })
  } catch (error) {
    console.error('Error al obtener articulos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener articulos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/articulos - Crear nuevo articulo
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
    const validacion = createArticuloSchema.safeParse(body)
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

    // Verificar que el SKU no exista
    const { data: existente } = await supabase
      .from('articulos')
      .select('id')
      .eq('sku', data.sku)
      .single()

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un articulo con este SKU' },
        { status: 400 }
      )
    }

    // Crear articulo usando admin client (bypass RLS)
    // Mapear camelCase del frontend a snake_case de la base de datos
    const { data: articulo, error } = await supabaseAdmin
      .from('articulos')
      .insert({
        sku: data.sku,
        nombre: data.nombre,
        descripcion: data.descripcion,
        descripcion_sigaf: data.descripcionSIGAF || null,
        codigo_sigaf: data.codigoSIGAF || null,
        unidad_medida: data.unidadMedida,
        stock_minimo: data.stockMinimo,
        iva_percent: data.ivaPercent,
        marca: data.marca,
        proveedor_id: data.proveedorId || null,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear articulo:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'CREAR_ARTICULO',
      entidad: 'articulos',
      entidad_id: articulo.id,
      datos_nuevos: articulo,
    })

    return NextResponse.json({
      success: true,
      message: 'Articulo creado exitosamente',
      data: articulo,
    })
  } catch (error) {
    console.error('Error al crear articulo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear articulo' },
      { status: 500 }
    )
  }
}
