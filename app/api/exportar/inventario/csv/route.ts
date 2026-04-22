/**
 * API: GET /api/exportar/inventario/csv
 * Exporta el inventario actual a CSV (UTF-8 con BOM para compatibilidad con Excel).
 *
 * Query params:
 * - bodegaId: string - Filtrar por bodega
 * - soloConStock: boolean - Solo artículos con stock > 0 (default true)
 */

import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, mapUserToAuth } from '@/lib/supabase/auth'
import { obtenerInventarioActual, InventarioReportError } from '@/lib/reports/inventario-actual'

export const dynamic = 'force-dynamic'

const BOM = '﻿'

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

    const usuarioAuth = mapUserToAuth(user)
    if (!hasPermission(usuarioAuth, 'inventario.ver')) {
      return NextResponse.json(
        { success: false, error: 'Permiso denegado' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const bodegaId = searchParams.get('bodegaId') || ''
    const soloConStock = searchParams.get('soloConStock') !== 'false'

    const { lineas, bodega } = await obtenerInventarioActual(supabase, {
      bodegaId: bodegaId || undefined,
      soloConStock,
    })

    const filas = lineas.map((linea) => ({
      'SKU': linea.sku,
      'Nombre': linea.nombre,
      'Unidad': linea.unidadMedida,
      'Stock Total': linea.stockTotal,
      'Stock Mínimo': linea.stockMinimo ?? '',
      'Estado': linea.estado,
    }))

    const csv = Papa.unparse(filas, {
      header: true,
      quotes: true,
      newline: '\r\n',
    })

    const fecha = new Date().toISOString().split('T')[0]
    const codigoSeguro = bodega ? bodega.codigo.replace(/[^\w\-]/g, '_').slice(0, 32) : ''
    const sufijoBodega = codigoSeguro ? `-${codigoSeguro}` : ''
    const filename = `inventario${sufijoBodega}-${fecha}.csv`

    return new NextResponse(BOM + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar inventario CSV:', error)
    if (error instanceof InventarioReportError) {
      const status = error.code === 'BODEGA_NOT_FOUND' ? 404 : 500
      return NextResponse.json({ success: false, error: error.message }, { status })
    }
    return NextResponse.json(
      { success: false, error: 'Error al generar CSV' },
      { status: 500 }
    )
  }
}
