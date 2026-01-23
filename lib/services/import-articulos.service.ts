/**
 * Servicio de Importación Masiva de Artículos
 * Permite cargar artículos desde archivos Excel/CSV
 */

import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { registrarBitacora } from './bitacora.service';
import { z } from 'zod';

// Schema de validación para cada fila de importación
export const importRowSchema = z.object({
  sku: z
    .string()
    .min(3, 'SKU debe tener al menos 3 caracteres')
    .max(50, 'SKU no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9\-]+$/i, 'SKU solo puede contener letras, números y guiones'),
  nombre: z
    .string()
    .min(5, 'Nombre debe tener al menos 5 caracteres')
    .max(200, 'Nombre no puede exceder 200 caracteres'),
  descripcionSIGAF: z
    .string()
    .min(10, 'Descripción SIGAF debe tener al menos 10 caracteres')
    .max(500, 'Descripción SIGAF no puede exceder 500 caracteres'),
  codigoSIGAF: z.string().max(100).optional().nullable(),
  unidadMedida: z.string().min(1, 'Unidad de medida es requerida'),
  stockMinimo: z.number().min(0).optional().nullable(),
  stockMaximo: z.number().min(0).optional().nullable(),
  codigoBarras: z.string().max(50).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  ivaPercent: z.number().min(0).max(1).optional().nullable(),
  // FASE 2: Campos adicionales Bodega en Custodia
  codigoPANI: z.string().max(50).optional().nullable(),
  codigoSICOP: z.string().max(50).optional().nullable(),
  codigoSICOPL: z.string().max(50).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  precio: z.number().min(0).optional().nullable(),
  costoReferencia: z.number().min(0).optional().nullable(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export interface ImportResult {
  success: boolean;
  totalProcesadas: number;
  creados: number;
  actualizados: number;
  errores: number;
  omitidos: number;
  detalles: {
    fila: number;
    sku: string;
    accion: 'creado' | 'actualizado' | 'error' | 'omitido';
    mensaje?: string;
  }[];
}

// Unidades de medida válidas
const UNIDADES_VALIDAS = [
  'UNIDAD', 'KILOGRAMO', 'GRAMO', 'LITRO', 'MILILITRO',
  'METRO', 'CENTIMETRO', 'PAQUETE', 'CAJA', 'BOLSA',
  'ROLLO', 'GALON', 'LIBRA', 'ONZA'
];

/**
 * Genera la plantilla Excel para importación
 */
export async function generarPlantillaImportacion(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema PEPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Artículos', {
    headerFooter: {
      firstHeader: 'Plantilla de Importación de Artículos',
    },
  });

  // Definir columnas
  sheet.columns = [
    { header: 'SKU *', key: 'sku', width: 15 },
    { header: 'Nombre *', key: 'nombre', width: 35 },
    { header: 'Descripción SIGAF *', key: 'descripcionSIGAF', width: 45 },
    { header: 'Código SIGAF', key: 'codigoSIGAF', width: 15 },
    { header: 'Unidad Medida *', key: 'unidadMedida', width: 15 },
    { header: 'Stock Mínimo', key: 'stockMinimo', width: 12 },
    { header: 'Stock Máximo', key: 'stockMaximo', width: 12 },
    { header: 'Código Barras', key: 'codigoBarras', width: 18 },
    { header: 'Marca', key: 'marca', width: 15 },
    { header: 'IVA %', key: 'ivaPercent', width: 10 },
    // Nuevos campos Bodega en Custodia
    { header: 'Código PANI', key: 'codigoPANI', width: 15 },
    { header: 'Código SICOP', key: 'codigoSICOP', width: 15 },
    { header: 'Código SICOPL', key: 'codigoSICOPL', width: 15 },
    { header: 'Categoría', key: 'categoria', width: 15 },
    { header: 'Precio', key: 'precio', width: 12 },
    { header: 'Costo Referencia', key: 'costoReferencia', width: 15 },
  ];

  // Estilo de encabezados
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Agregar fila de ejemplo
  sheet.addRow({
    sku: 'ART-001',
    nombre: 'Leche en polvo 400g',
    descripcionSIGAF: 'LECHE EN POLVO ENTERA 400 GRAMOS',
    codigoSIGAF: 'SIGAF-12345',
    unidadMedida: 'UNIDAD',
    stockMinimo: 10,
    stockMaximo: 100,
    codigoBarras: '7501234567890',
    marca: 'Dos Pinos',
    ivaPercent: 0.13,
    codigoPANI: 'PANI-001',
    codigoSICOP: 'SICOP-12345',
    codigoSICOPL: '',
    categoria: 'LACTEOS',
    precio: 2500,
    costoReferencia: 2000,
  });

  // Agregar segunda fila de ejemplo
  sheet.addRow({
    sku: 'ART-002',
    nombre: 'Arroz 1kg',
    descripcionSIGAF: 'ARROZ BLANCO GRANO LARGO 1 KILOGRAMO',
    codigoSIGAF: '',
    unidadMedida: 'KILOGRAMO',
    stockMinimo: 20,
    stockMaximo: 200,
    codigoBarras: '',
    marca: 'Tio Pelon',
    ivaPercent: 0,
    codigoPANI: 'PANI-002',
    codigoSICOP: 'SICOP-67890',
    codigoSICOPL: '',
    categoria: 'ARROZ',
    precio: 1500,
    costoReferencia: 1200,
  });

  // Agregar hoja de instrucciones
  const instruccionesSheet = workbook.addWorksheet('Instrucciones');
  instruccionesSheet.columns = [
    { header: 'Campo', key: 'campo', width: 20 },
    { header: 'Requerido', key: 'requerido', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 60 },
    { header: 'Ejemplo', key: 'ejemplo', width: 25 },
  ];

  const instruccionesHeaderRow = instruccionesSheet.getRow(1);
  instruccionesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instruccionesHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF217346' },
  };

  const instrucciones = [
    { campo: 'SKU', requerido: 'Sí', descripcion: 'Código único del artículo (mayúsculas, números, guiones)', ejemplo: 'ART-001' },
    { campo: 'Nombre', requerido: 'Sí', descripcion: 'Nombre descriptivo del artículo (5-200 caracteres)', ejemplo: 'Leche en polvo 400g' },
    { campo: 'Descripción SIGAF', requerido: 'Sí', descripcion: 'Descripción oficial según catálogo SIGAF (10-500 caracteres)', ejemplo: 'LECHE EN POLVO ENTERA 400G' },
    { campo: 'Código SIGAF', requerido: 'No', descripcion: 'Código interno del SIGAF si aplica', ejemplo: 'SIGAF-12345' },
    { campo: 'Unidad Medida', requerido: 'Sí', descripcion: `Valores válidos: ${UNIDADES_VALIDAS.join(', ')}`, ejemplo: 'UNIDAD' },
    { campo: 'Stock Mínimo', requerido: 'No', descripcion: 'Cantidad mínima de inventario antes de alerta', ejemplo: '10' },
    { campo: 'Stock Máximo', requerido: 'No', descripcion: 'Cantidad máxima de inventario', ejemplo: '100' },
    { campo: 'Código Barras', requerido: 'No', descripcion: 'Código de barras del producto', ejemplo: '7501234567890' },
    { campo: 'Marca', requerido: 'No', descripcion: 'Marca del producto', ejemplo: 'Dos Pinos' },
    { campo: 'IVA %', requerido: 'No', descripcion: 'Porcentaje de IVA (0 para exento, 0.13 para 13%)', ejemplo: '0.13' },
    { campo: 'Código PANI', requerido: 'No', descripcion: 'Código del Patronato Nacional de la Infancia', ejemplo: 'PANI-001' },
    { campo: 'Código SICOP', requerido: 'No', descripcion: 'Código del Sistema Integrado de Compras Públicas', ejemplo: 'SICOP-12345' },
    { campo: 'Código SICOPL', requerido: 'No', descripcion: 'Código SICOP alternativo (si aplica)', ejemplo: 'SICOPL-001' },
    { campo: 'Categoría', requerido: 'No', descripcion: 'Familia del producto: ARROZ, GRANOS, ENLATADOS, LACTEOS, CEREALES, HARINAS, ACEITES, CONDIMENTOS, BEBIDAS, CARNES, LIMPIEZA, HIGIENE, DESECHABLES, OTROS', ejemplo: 'LACTEOS' },
    { campo: 'Precio', requerido: 'No', descripcion: 'Precio de venta del producto en colones', ejemplo: '2500' },
    { campo: 'Costo Referencia', requerido: 'No', descripcion: 'Costo base del artículo en colones', ejemplo: '2000' },
  ];

  instrucciones.forEach(inst => instruccionesSheet.addRow(inst));

  // Agregar hoja de unidades válidas
  const unidadesSheet = workbook.addWorksheet('Unidades Válidas');
  unidadesSheet.columns = [
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
  ];

  const unidadesHeaderRow = unidadesSheet.getRow(1);
  unidadesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  unidadesHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7030A0' },
  };

  const unidadesDescripcion: Record<string, string> = {
    'UNIDAD': 'Unidades individuales',
    'KILOGRAMO': 'Peso en kilogramos',
    'GRAMO': 'Peso en gramos',
    'LITRO': 'Volumen en litros',
    'MILILITRO': 'Volumen en mililitros',
    'METRO': 'Longitud en metros',
    'CENTIMETRO': 'Longitud en centímetros',
    'PAQUETE': 'Paquetes',
    'CAJA': 'Cajas',
    'BOLSA': 'Bolsas',
    'ROLLO': 'Rollos',
    'GALON': 'Galones',
    'LIBRA': 'Peso en libras',
    'ONZA': 'Peso en onzas',
  };

  UNIDADES_VALIDAS.forEach(unidad => {
    unidadesSheet.addRow({ codigo: unidad, descripcion: unidadesDescripcion[unidad] || '' });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Parsea un archivo Excel de importación
 */
export async function parsearExcelImportacion(buffer: Buffer | ArrayBuffer): Promise<{
  filas: Array<ImportRow & { filaOriginal: number }>;
  erroresValidacion: Array<{ fila: number; errores: string[] }>;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ArrayBuffer);

  const sheet = workbook.getWorksheet(1);
  if (!sheet) {
    throw new Error('No se encontró la hoja de datos en el archivo');
  }

  const filas: Array<ImportRow & { filaOriginal: number }> = [];
  const erroresValidacion: Array<{ fila: number; errores: string[] }> = [];

  // Procesar filas (empezando desde la 2 para saltar encabezado)
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Saltar encabezado

    // Obtener valores de celdas
    const sku = String(row.getCell(1).value || '').trim().toUpperCase();
    const nombre = String(row.getCell(2).value || '').trim();
    const descripcionSIGAF = String(row.getCell(3).value || '').trim().toUpperCase();
    const codigoSIGAF = String(row.getCell(4).value || '').trim() || null;
    const unidadMedida = String(row.getCell(5).value || '').trim().toUpperCase();

    // Parsear números
    const stockMinimoRaw = row.getCell(6).value;
    const stockMaximoRaw = row.getCell(7).value;
    const codigoBarras = String(row.getCell(8).value || '').trim() || null;
    const marca = String(row.getCell(9).value || '').trim() || null;
    const ivaPercentRaw = row.getCell(10).value;

    // Nuevos campos Bodega en Custodia
    const codigoPANI = String(row.getCell(11).value || '').trim() || null;
    const codigoSICOP = String(row.getCell(12).value || '').trim() || null;
    const codigoSICOPL = String(row.getCell(13).value || '').trim() || null;
    const categoria = String(row.getCell(14).value || '').trim().toUpperCase() || null;
    const precioRaw = row.getCell(15).value;
    const costoReferenciaRaw = row.getCell(16).value;

    // Si la fila está vacía, saltar
    if (!sku && !nombre) return;

    const stockMinimo = stockMinimoRaw !== null && stockMinimoRaw !== ''
      ? Number(stockMinimoRaw) || null
      : null;
    const stockMaximo = stockMaximoRaw !== null && stockMaximoRaw !== ''
      ? Number(stockMaximoRaw) || null
      : null;
    const ivaPercent = ivaPercentRaw !== null && ivaPercentRaw !== ''
      ? Number(ivaPercentRaw) || null
      : null;
    const precio = precioRaw !== null && precioRaw !== ''
      ? Number(precioRaw) || null
      : null;
    const costoReferencia = costoReferenciaRaw !== null && costoReferenciaRaw !== ''
      ? Number(costoReferenciaRaw) || null
      : null;

    // Crear objeto para validación
    const rowData = {
      sku,
      nombre,
      descripcionSIGAF,
      codigoSIGAF,
      unidadMedida,
      stockMinimo,
      stockMaximo,
      codigoBarras,
      marca,
      ivaPercent,
      codigoPANI,
      codigoSICOP,
      codigoSICOPL,
      categoria,
      precio,
      costoReferencia,
    };

    // Validar con Zod
    const validacion = importRowSchema.safeParse(rowData);

    if (!validacion.success) {
      const errores = validacion.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      erroresValidacion.push({ fila: rowNumber, errores });
    } else {
      // Validar unidad de medida
      if (!UNIDADES_VALIDAS.includes(unidadMedida)) {
        erroresValidacion.push({
          fila: rowNumber,
          errores: [`Unidad de medida inválida: ${unidadMedida}. Valores válidos: ${UNIDADES_VALIDAS.join(', ')}`]
        });
      } else {
        filas.push({ ...validacion.data, filaOriginal: rowNumber });
      }
    }
  });

  return { filas, erroresValidacion };
}

/**
 * Procesa la importación de artículos
 */
export async function procesarImportacion(params: {
  buffer: Buffer;
  actualizarExistentes: boolean;
  usuarioId: string;
  ip?: string;
  userAgent?: string;
}): Promise<ImportResult> {
  const { buffer, actualizarExistentes, usuarioId, ip, userAgent } = params;

  // Parsear archivo
  const { filas, erroresValidacion } = await parsearExcelImportacion(buffer);

  // Resultados
  const resultado: ImportResult = {
    success: true,
    totalProcesadas: filas.length + erroresValidacion.length,
    creados: 0,
    actualizados: 0,
    errores: erroresValidacion.length,
    omitidos: 0,
    detalles: [],
  };

  // Agregar errores de validación a detalles
  for (const error of erroresValidacion) {
    resultado.detalles.push({
      fila: error.fila,
      sku: 'N/A',
      accion: 'error',
      mensaje: error.errores.join('; '),
    });
  }

  if (filas.length === 0) {
    return resultado;
  }

  // Pre-cargar SKUs existentes para evitar N+1
  const skusImportar = filas.map(f => f.sku);
  const articulosExistentes = await prisma.articulo.findMany({
    where: { sku: { in: skusImportar } },
    select: { id: true, sku: true },
  });
  const skusExistentesMap = new Map(articulosExistentes.map(a => [a.sku, a.id]));

  // Procesar en lotes de 50 para evitar problemas de memoria
  const BATCH_SIZE = 50;
  const batches = [];
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    batches.push(filas.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    await prisma.$transaction(async (tx) => {
      for (const fila of batch) {
        const existeId = skusExistentesMap.get(fila.sku);

        try {
          if (existeId) {
            // Artículo ya existe
            if (actualizarExistentes) {
              // Actualizar
              await tx.articulo.update({
                where: { id: existeId },
                data: {
                  nombre: fila.nombre,
                  descripcionSIGAF: fila.descripcionSIGAF,
                  codigoSIGAF: fila.codigoSIGAF,
                  unidadMedida: fila.unidadMedida,
                  stockMinimo: fila.stockMinimo,
                  stockMaximo: fila.stockMaximo,
                  codigoBarras: fila.codigoBarras,
                  marca: fila.marca,
                  ivaPercent: fila.ivaPercent ?? 0.13,
                  codigoPANI: fila.codigoPANI,
                  codigoSICOP: fila.codigoSICOP,
                  codigoSICOPL: fila.codigoSICOPL,
                  categoria: fila.categoria,
                  precio: fila.precio,
                  costoReferencia: fila.costoReferencia,
                },
              });
              resultado.actualizados++;
              resultado.detalles.push({
                fila: fila.filaOriginal,
                sku: fila.sku,
                accion: 'actualizado',
              });
            } else {
              // Omitir
              resultado.omitidos++;
              resultado.detalles.push({
                fila: fila.filaOriginal,
                sku: fila.sku,
                accion: 'omitido',
                mensaje: 'SKU ya existe y no se habilitó actualización',
              });
            }
          } else {
            // Crear nuevo artículo
            const nuevoArticulo = await tx.articulo.create({
              data: {
                sku: fila.sku,
                nombre: fila.nombre,
                descripcionSIGAF: fila.descripcionSIGAF,
                codigoSIGAF: fila.codigoSIGAF,
                unidadMedida: fila.unidadMedida,
                stockMinimo: fila.stockMinimo,
                stockMaximo: fila.stockMaximo,
                codigoBarras: fila.codigoBarras,
                marca: fila.marca,
                ivaPercent: fila.ivaPercent ?? 0.13,
                codigoPANI: fila.codigoPANI,
                codigoSICOP: fila.codigoSICOP,
                codigoSICOPL: fila.codigoSICOPL,
                categoria: fila.categoria,
                precio: fila.precio,
                costoReferencia: fila.costoReferencia,
                activo: true,
              },
            });

            // Actualizar mapa para siguientes filas del mismo lote
            skusExistentesMap.set(fila.sku, nuevoArticulo.id);

            resultado.creados++;
            resultado.detalles.push({
              fila: fila.filaOriginal,
              sku: fila.sku,
              accion: 'creado',
            });
          }
        } catch (error) {
          resultado.errores++;
          resultado.detalles.push({
            fila: fila.filaOriginal,
            sku: fila.sku,
            accion: 'error',
            mensaje: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }
    });
  }

  // Registrar en bitácora
  await registrarBitacora({
    usuarioId,
    accion: 'IMPORTACION_MASIVA_ARTICULOS',
    entidad: 'Articulo',
    entidadId: 'bulk-import',
    estadoNuevo: {
      totalProcesadas: resultado.totalProcesadas,
      creados: resultado.creados,
      actualizados: resultado.actualizados,
      errores: resultado.errores,
      omitidos: resultado.omitidos,
      actualizarExistentes,
    },
    ip,
    userAgent,
  });

  return resultado;
}
