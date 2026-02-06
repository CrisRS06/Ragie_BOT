/**
 * API: GET /api/exportar/inventario
 * Genera un PDF del inventario actual
 *
 * Query params:
 * - bodegaId: string - Filtrar por bodega
 * - soloConStock: boolean - Solo artículos con stock > 0
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarReporteInventario, type ReporteInventarioData, type LineaInventario } from '@/lib/pdf/inventario-pdf'

export const dynamic = 'force-dynamic'

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
    const bodegaId = searchParams.get('bodegaId') || ''
    const soloConStock = searchParams.get('soloConStock') !== 'false'

    // Obtener info de bodega si se filtró
    let bodega: { codigo: string; nombre: string } | null = null
    if (bodegaId) {
      const { data } = await supabase
        .from('bodegas')
        .select('codigo, nombre')
        .eq('id', bodegaId)
        .single()
      bodega = data
    }

    // Obtener artículos activos (solo columnas necesarias)
    const { data: articulos, error } = await supabase
      .from('articulos')
      .select('id, sku, nombre, unidad_medida, stock_minimo')
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al obtener artículos:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener artículos' },
        { status: 500 }
      )
    }

    // Obtener TODOS los lotes activos con stock en una sola consulta (evita N+1)
    let lotesQuery = supabase
      .from('lotes')
      .select('articulo_id, cantidad_disponible, fecha_vencimiento')
      .eq('activo', true)
      .gt('cantidad_disponible', 0)

    if (bodegaId) {
      lotesQuery = lotesQuery.eq('bodega_id', bodegaId)
    }

    const { data: todosLotes } = await lotesQuery

    // Agrupar lotes por articulo_id en memoria
    const lotesPorArticulo = new Map<string, typeof todosLotes>()
    for (const lote of (todosLotes || [])) {
      const arr = lotesPorArticulo.get(lote.articulo_id) || []
      arr.push(lote)
      lotesPorArticulo.set(lote.articulo_id, arr)
    }

    // Fecha límite para alertas (30 días)
    const ahora = new Date()
    const fechaLimiteAlerta = new Date()
    fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + 30)

    // Procesar artículos con stock (sin queries adicionales)
    const lineas: LineaInventario[] = []

    for (const articulo of (articulos || [])) {
      const lotesArray = lotesPorArticulo.get(articulo.id) || []
      const stockTotal = lotesArray.reduce((sum, lote) => sum + Number(lote.cantidad_disponible), 0)

      if (soloConStock && stockTotal === 0) continue

      const lotesProximosAVencer = lotesArray.filter(
        (lote) => lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) <= fechaLimiteAlerta && new Date(lote.fecha_vencimiento) >= ahora
      ).length

      const lotesVencidos = lotesArray.filter(
        (lote) => lote.fecha_vencimiento && new Date(lote.fecha_vencimiento) < ahora
      ).length

      const alertaStockBajo = articulo.stock_minimo !== null && stockTotal <= articulo.stock_minimo
      const alertaVencimiento = lotesProximosAVencer > 0 || lotesVencidos > 0

      let estado: LineaInventario['estado'] = 'OK'
      if (stockTotal === 0) estado = 'Sin stock'
      else if (alertaStockBajo) estado = 'Stock bajo'
      else if (alertaVencimiento) estado = 'Alerta venc.'

      lineas.push({
        sku: articulo.sku,
        nombre: articulo.nombre,
        unidadMedida: articulo.unidad_medida,
        stockTotal,
        stockMinimo: articulo.stock_minimo,
        estado,
      })
    }

    // Obtener email del usuario
    const userName = user.user_metadata?.nombre || user.email || 'Sistema'

    // Generar PDF
    const reporteData: ReporteInventarioData = {
      fecha: new Date().toISOString(),
      generadoPor: userName,
      bodega,
      articulos: lineas,
    }

    const pdfBuffer = await generarReporteInventario(reporteData)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="inventario-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar inventario:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar inventario' },
      { status: 500 }
    )
  }
}
