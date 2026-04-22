/**
 * Fuente de verdad para el reporte de existencias actuales.
 * Consumido por los exports PDF y CSV.
 *
 * Estrategia de consulta (misma que app/api/inventario/route.ts, ver commit e175e00):
 * - Supabase PostgREST trunca a 1000 filas y `.in(...)` con >100 UUIDs falla por URL length.
 * - Por eso: (1) query de lotes primero para saber qué artículos tienen stock,
 *   (2) fetch de artículos y lotes en batches de 100.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type EstadoInventario = 'OK' | 'Stock bajo' | 'Sin stock' | 'Alerta venc.'

export interface LineaInventario {
  sku: string
  nombre: string
  unidadMedida: string
  stockTotal: number
  stockMinimo: number | null
  estado: EstadoInventario
}

export interface InventarioActualResultado {
  lineas: LineaInventario[]
  bodega: { codigo: string; nombre: string } | null
}

interface Filtros {
  bodegaId?: string
  soloConStock?: boolean
}

type SupabaseServer = SupabaseClient<Database>

type LoteRow = {
  articulo_id: string
  cantidad_disponible: number
  fecha_vencimiento: string | null
}

const DIAS_ALERTA_VENCIMIENTO = 30
const BATCH_SIZE = 100

export type InventarioErrorCode = 'BODEGA_NOT_FOUND' | 'QUERY_FAILED'

export class InventarioReportError extends Error {
  constructor(
    message: string,
    readonly code: InventarioErrorCode,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'InventarioReportError'
  }
}

function parseValidDate(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

async function resolverBodega(
  supabase: SupabaseServer,
  bodegaId: string
): Promise<{ codigo: string; nombre: string }> {
  const { data, error } = await supabase
    .from('bodegas')
    .select('codigo, nombre')
    .eq('id', bodegaId)
    .maybeSingle()

  if (error) {
    throw new InventarioReportError(
      `Error al consultar bodega: ${error.message}`,
      'QUERY_FAILED',
      error
    )
  }
  if (!data) {
    console.warn(`[inventario-actual] Bodega no encontrada: ${bodegaId}`)
    throw new InventarioReportError('Bodega no encontrada', 'BODEGA_NOT_FOUND')
  }
  return data
}

async function fetchArticulosConStock(
  supabase: SupabaseServer,
  articuloIds: string[]
) {
  const todos: Array<{
    id: string
    sku: string
    nombre: string
    unidad_medida: string
    stock_minimo: number | null
  }> = []

  for (let i = 0; i < articuloIds.length; i += BATCH_SIZE) {
    const batch = articuloIds.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('articulos')
      .select('id, sku, nombre, unidad_medida, stock_minimo')
      .eq('activo', true)
      .in('id', batch)

    if (error) {
      throw new InventarioReportError(
        `Error al obtener artículos: ${error.message}`,
        'QUERY_FAILED',
        error
      )
    }
    if (data) todos.push(...data)
  }
  return todos
}

async function fetchLotesEnBatches(
  supabase: SupabaseServer,
  articuloIds: string[],
  bodegaId?: string
): Promise<LoteRow[]> {
  const todos: LoteRow[] = []

  for (let i = 0; i < articuloIds.length; i += BATCH_SIZE) {
    const batch = articuloIds.slice(i, i + BATCH_SIZE)
    let query = supabase
      .from('lotes')
      .select('articulo_id, cantidad_disponible, fecha_vencimiento')
      .eq('activo', true)
      .gt('cantidad_disponible', 0)
      .in('articulo_id', batch)

    if (bodegaId) query = query.eq('bodega_id', bodegaId)

    const { data, error } = await query
    if (error) {
      throw new InventarioReportError(
        `Error al obtener lotes: ${error.message}`,
        'QUERY_FAILED',
        error
      )
    }
    if (data) todos.push(...data)
  }
  return todos
}

async function fetchIdsArticulosConStock(
  supabase: SupabaseServer,
  bodegaId?: string
): Promise<string[]> {
  const ids = new Set<string>()
  const PAGE = 1000
  let offset = 0

  while (true) {
    let query = supabase
      .from('lotes')
      .select('articulo_id')
      .eq('activo', true)
      .gt('cantidad_disponible', 0)
      .range(offset, offset + PAGE - 1)

    if (bodegaId) query = query.eq('bodega_id', bodegaId)

    const { data, error } = await query
    if (error) {
      throw new InventarioReportError(
        `Error al listar artículos con stock: ${error.message}`,
        'QUERY_FAILED',
        error
      )
    }
    if (!data || data.length === 0) break
    for (const lote of data) ids.add(lote.articulo_id)
    if (data.length < PAGE) break
    offset += PAGE
  }

  return [...ids]
}

async function fetchTodosLosArticulosActivos(supabase: SupabaseServer) {
  const todos: Array<{
    id: string
    sku: string
    nombre: string
    unidad_medida: string
    stock_minimo: number | null
  }> = []

  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('articulos')
      .select('id, sku, nombre, unidad_medida, stock_minimo')
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .range(offset, offset + PAGE - 1)

    if (error) {
      throw new InventarioReportError(
        `Error al obtener artículos: ${error.message}`,
        'QUERY_FAILED',
        error
      )
    }
    if (!data || data.length === 0) break
    todos.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return todos
}

export async function obtenerInventarioActual(
  supabase: SupabaseServer,
  filtros: Filtros = {}
): Promise<InventarioActualResultado> {
  const { bodegaId, soloConStock = true } = filtros

  const bodega = bodegaId ? await resolverBodega(supabase, bodegaId) : null

  let articulos: Awaited<ReturnType<typeof fetchTodosLosArticulosActivos>>

  if (soloConStock) {
    const idsConStock = await fetchIdsArticulosConStock(supabase, bodegaId)
    if (idsConStock.length === 0) {
      return { lineas: [], bodega }
    }
    articulos = await fetchArticulosConStock(supabase, idsConStock)
    articulos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  } else {
    articulos = await fetchTodosLosArticulosActivos(supabase)
  }

  const articuloIds = articulos.map((a) => a.id)
  const todosLotes = await fetchLotesEnBatches(supabase, articuloIds, bodegaId)

  const lotesPorArticulo = new Map<string, LoteRow[]>()
  for (const lote of todosLotes) {
    const arr = lotesPorArticulo.get(lote.articulo_id) || []
    arr.push(lote)
    lotesPorArticulo.set(lote.articulo_id, arr)
  }

  const ahora = new Date()
  const fechaLimiteAlerta = new Date()
  fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + DIAS_ALERTA_VENCIMIENTO)

  const lineas: LineaInventario[] = []

  for (const articulo of articulos) {
    const lotesArray = lotesPorArticulo.get(articulo.id) || []
    const stockTotal = lotesArray.reduce(
      (sum, lote) => sum + Number(lote.cantidad_disponible ?? 0),
      0
    )

    if (soloConStock && stockTotal === 0) continue

    const lotesProximosAVencer = lotesArray.filter((lote) => {
      const venc = parseValidDate(lote.fecha_vencimiento)
      return venc !== null && venc <= fechaLimiteAlerta && venc >= ahora
    }).length

    const lotesVencidos = lotesArray.filter((lote) => {
      const venc = parseValidDate(lote.fecha_vencimiento)
      return venc !== null && venc < ahora
    }).length

    const alertaStockBajo =
      articulo.stock_minimo !== null && stockTotal <= articulo.stock_minimo
    const alertaVencimiento = lotesProximosAVencer > 0 || lotesVencidos > 0

    let estado: EstadoInventario = 'OK'
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

  return { lineas, bodega }
}
