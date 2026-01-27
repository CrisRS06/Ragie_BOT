/**
 * API: /api/articulos/importar
 * POST - Importar articulos desde archivo Excel
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

interface ArticuloImport {
  sku: string
  nombre: string
  descripcionSigaf: string
  unidadMedida: string
  descripcion?: string
  ivaPercent?: number
  stockMinimo?: number
  marca?: string
}

/**
 * POST /api/articulos/importar
 * Importa articulos desde un archivo Excel
 *
 * Columnas esperadas:
 * A: SKU (requerido)
 * B: Nombre (requerido)
 * C: Descripcion SIGAF (requerido)
 * D: Unidad Medida (requerido)
 * E: Descripcion (opcional)
 * F: IVA % (opcional, default 13)
 * G: Stock Minimo (opcional)
 * H: Marca (opcional)
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

    // Obtener archivo del form data
    const formData = await request.formData()
    const file = formData.get('archivo') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: 'Formato de archivo no válido. Use .xlsx o .xls' },
        { status: 400 }
      )
    }

    // Leer archivo Excel
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: 'El archivo no contiene hojas de cálculo' },
        { status: 400 }
      )
    }

    // Procesar filas (asumiendo fila 1 es encabezado)
    const articulos: ArticuloImport[] = []
    const errores: { fila: number; error: string }[] = []

    worksheet.eachRow((row, rowNumber) => {
      // Saltar encabezado
      if (rowNumber === 1) return

      const sku = String(row.getCell(1).value || '').trim()
      const nombre = String(row.getCell(2).value || '').trim()
      const descripcionSigaf = String(row.getCell(3).value || '').trim()
      const unidadMedida = String(row.getCell(4).value || '').trim()
      const descripcion = String(row.getCell(5).value || '').trim() || undefined
      const ivaPercent = parseFloat(String(row.getCell(6).value || '13')) || 13
      const stockMinimo = parseInt(String(row.getCell(7).value || '0')) || undefined
      const marca = String(row.getCell(8).value || '').trim() || undefined

      // Validar campos requeridos
      if (!sku) {
        errores.push({ fila: rowNumber, error: 'SKU es requerido' })
        return
      }
      if (!nombre) {
        errores.push({ fila: rowNumber, error: 'Nombre es requerido' })
        return
      }
      if (!descripcionSigaf) {
        errores.push({ fila: rowNumber, error: 'Descripcion SIGAF es requerida' })
        return
      }
      if (!unidadMedida) {
        errores.push({ fila: rowNumber, error: 'Unidad de medida es requerida' })
        return
      }

      articulos.push({
        sku,
        nombre,
        descripcionSigaf,
        unidadMedida,
        descripcion,
        ivaPercent,
        stockMinimo,
        marca,
      })
    })

    if (articulos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se encontraron articulos válidos para importar',
          errores,
        },
        { status: 400 }
      )
    }

    // Verificar SKUs duplicados en el archivo
    const skusEnArchivo = articulos.map(a => a.sku)
    const skusDuplicados = skusEnArchivo.filter((sku, index) => skusEnArchivo.indexOf(sku) !== index)
    if (skusDuplicados.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `SKUs duplicados en el archivo: ${[...new Set(skusDuplicados)].join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Verificar SKUs existentes en la base de datos
    const { data: existentes } = await supabase
      .from('articulos')
      .select('sku')
      .in('sku', skusEnArchivo)

    const skusExistentes = (existentes || []).map(a => a.sku)
    const articulosNuevos = articulos.filter(a => !skusExistentes.includes(a.sku))
    const articulosOmitidos = articulos.filter(a => skusExistentes.includes(a.sku))

    if (articulosNuevos.length === 0) {
      return NextResponse.json({
        success: true,
        mensaje: 'Todos los articulos ya existen en la base de datos',
        importados: 0,
        omitidos: articulosOmitidos.length,
        errores,
      })
    }

    // Insertar articulos nuevos
    const inserts = articulosNuevos.map(a => ({
      sku: a.sku,
      nombre: a.nombre,
      descripcion_sigaf: a.descripcionSigaf,
      unidad_medida: a.unidadMedida,
      descripcion: a.descripcion || null,
      iva_percent: a.ivaPercent || 13,
      stock_minimo: a.stockMinimo || null,
      marca: a.marca || null,
      activo: true,
    }))

    const { data: insertados, error: insertError } = await supabase
      .from('articulos')
      .insert(inserts)
      .select('id, sku')

    if (insertError) {
      throw insertError
    }

    // Registrar en audit_log
    await supabase.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'IMPORTAR_ARTICULOS',
      entidad: 'articulos',
      entidad_id: null,
      datos_nuevos: {
        archivo: file.name,
        importados: insertados?.length || 0,
        omitidos: articulosOmitidos.length,
      },
    })

    return NextResponse.json({
      success: true,
      mensaje: `Importacion completada: ${insertados?.length || 0} articulos nuevos`,
      importados: insertados?.length || 0,
      omitidos: articulosOmitidos.length,
      skusOmitidos: articulosOmitidos.map(a => a.sku),
      errores,
    })
  } catch (error) {
    console.error('Error al importar articulos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar importacion',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
