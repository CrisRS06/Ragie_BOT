'use client';

/**
 * Admin - Importar Catálogo SIGAF desde Excel
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ParsedRow {
  codigo: string;
  descripcion: string;
  partida?: string;
  precio_unitario?: number;
  iva_percent?: number;
  clasificacion?: string;
  contratacion?: string;
  contratista?: string;
  plazo_entrega?: string;
  analista?: string;
  observaciones?: string;
}

interface ImportResult {
  total_procesados: number;
  insertados: number;
  actualizados: number;
  errores_validacion: { fila: number; error: string }[];
  errores_db: { codigo: string; error: string }[];
}

export default function ImportarCatalogoSigafPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setParsedData([]);
    setImportResult(null);
    setImportError(null);

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setParseError('Tipo de archivo no válido. Use CSV o Excel (.xlsx)');
      return;
    }

    setParsing(true);

    try {
      // Para CSV, parseamos en el cliente
      if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
        const text = await selectedFile.text();
        const rows = parseCSV(text);
        setParsedData(rows);
      } else {
        // Para Excel, necesitamos una librería o enviarlo al servidor
        // Por ahora, indicamos que debe usar CSV
        setParseError('Por favor, exporte el archivo Excel a CSV y vuelva a cargarlo. Puede hacerlo desde Excel: Archivo > Guardar como > CSV UTF-8');
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error al procesar archivo');
    } finally {
      setParsing(false);
    }
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('El archivo debe tener al menos una fila de encabezados y una de datos');
    }

    // Detectar separador (coma o punto y coma)
    const separator = lines[0].includes(';') ? ';' : ',';

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));

    // Mapeo de nombres de columnas posibles
    const columnMap: Record<string, string> = {
      'codigo sigaf': 'codigo',
      'código sigaf': 'codigo',
      'codigo': 'codigo',
      'descripcion': 'descripcion',
      'descripción': 'descripcion',
      'partida': 'partida',
      'precio unitario': 'precio_unitario',
      'precio': 'precio_unitario',
      '% de iva': 'iva_percent',
      'iva': 'iva_percent',
      'nombre de la clasificación': 'clasificacion',
      'clasificacion': 'clasificacion',
      'clasificación': 'clasificacion',
      'n° contratación': 'contratacion',
      'contratacion': 'contratacion',
      'contratación': 'contratacion',
      'nombre del contratista': 'contratista',
      'contratista': 'contratista',
      'plazo de entrega': 'plazo_entrega',
      'plazo entrega': 'plazo_entrega',
      'analista encargado': 'analista',
      'analista': 'analista',
      'observaciones': 'observaciones',
    };

    // Encontrar índices de columnas
    const columnIndices: Record<string, number> = {};
    headers.forEach((header, idx) => {
      const mappedName = columnMap[header];
      if (mappedName) {
        columnIndices[mappedName] = idx;
      }
    });

    // Validar columnas requeridas
    if (!('codigo' in columnIndices) || !('descripcion' in columnIndices)) {
      throw new Error('El archivo debe tener columnas "Codigo SIGAF" y "Descripcion"');
    }

    // Parsear filas de datos
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], separator);

      const codigo = values[columnIndices.codigo]?.trim();
      const descripcion = values[columnIndices.descripcion]?.trim();

      if (!codigo || !descripcion) continue;

      const row: ParsedRow = {
        codigo,
        descripcion,
      };

      if ('partida' in columnIndices && values[columnIndices.partida]) {
        row.partida = values[columnIndices.partida].trim();
      }

      if ('precio_unitario' in columnIndices && values[columnIndices.precio_unitario]) {
        const precio = parseFloat(values[columnIndices.precio_unitario].replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(precio)) {
          row.precio_unitario = precio;
        }
      }

      if ('iva_percent' in columnIndices && values[columnIndices.iva_percent]) {
        const iva = parseFloat(values[columnIndices.iva_percent].replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(iva)) {
          // Si viene como porcentaje (13), convertir a decimal (0.13)
          row.iva_percent = iva > 1 ? iva / 100 : iva;
        }
      }

      if ('clasificacion' in columnIndices && values[columnIndices.clasificacion]) {
        row.clasificacion = values[columnIndices.clasificacion].trim();
      }

      if ('contratacion' in columnIndices && values[columnIndices.contratacion]) {
        row.contratacion = values[columnIndices.contratacion].trim();
      }

      if ('contratista' in columnIndices && values[columnIndices.contratista]) {
        row.contratista = values[columnIndices.contratista].trim();
      }

      if ('plazo_entrega' in columnIndices && values[columnIndices.plazo_entrega]) {
        row.plazo_entrega = values[columnIndices.plazo_entrega].trim();
      }

      if ('analista' in columnIndices && values[columnIndices.analista]) {
        row.analista = values[columnIndices.analista].trim();
      }

      if ('observaciones' in columnIndices && values[columnIndices.observaciones]) {
        row.observaciones = values[columnIndices.observaciones].trim();
      }

      rows.push(row);
    }

    if (rows.length === 0) {
      throw new Error('No se encontraron filas válidas en el archivo');
    }

    return rows;
  };

  // Parsear línea CSV manejando comillas
  const parseCSVLine = (line: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const response = await fetch('/api/catalogo-sigaf/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: parsedData }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al importar datos');
      }

      setImportResult(data.resumen);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar datos');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setParseError(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/catalogo-sigaf"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver al Catálogo
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Catálogo SIGAF</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cargue códigos SIGAF desde un archivo CSV
          </p>
        </div>

        {/* Resultado de importación */}
        {importResult && (
          <Card className="mb-6 p-6 border-green-200 bg-green-50">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-900">Importación completada</h3>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Procesados:</span>
                    <span className="ml-2 font-medium">{importResult.total_procesados}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Insertados:</span>
                    <span className="ml-2 font-medium">{importResult.insertados}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Actualizados:</span>
                    <span className="ml-2 font-medium">{importResult.actualizados}</span>
                  </div>
                </div>

                {importResult.errores_validacion.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-yellow-700 font-medium">
                      Errores de validación: {importResult.errores_validacion.length}
                    </p>
                    <ul className="mt-1 text-xs text-yellow-600 max-h-20 overflow-auto">
                      {importResult.errores_validacion.slice(0, 5).map((err, idx) => (
                        <li key={idx}>Fila {err.fila}: {err.error}</li>
                      ))}
                      {importResult.errores_validacion.length > 5 && (
                        <li>... y {importResult.errores_validacion.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button onClick={() => router.push('/admin/catalogo-sigaf')}>
                    Ver Catálogo
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Importar otro archivo
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error de importación */}
        {importError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{importError}</p>
              </div>
            </div>
          </div>
        )}

        {!importResult && (
          <>
            {/* Instrucciones */}
            <Card className="mb-6 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Instrucciones
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Exporte su archivo Excel a formato CSV (UTF-8)</li>
                <li>Asegúrese de que el archivo tenga las columnas: <strong>Código SIGAF</strong> y <strong>Descripción</strong></li>
                <li>Columnas opcionales: Partida, Precio Unitario, % de IVA, Clasificación, Contratación, Contratista, Plazo de entrega, Analista, Observaciones</li>
                <li>Si un código ya existe, se actualizará con los nuevos datos</li>
              </ol>
            </Card>

            {/* Área de carga */}
            <Card className="mb-6">
              <div className="p-6">
                {!file ? (
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Haga clic para seleccionar archivo
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      o arrastre y suelte aquí
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      CSV (UTF-8) - Máximo 10MB
                    </p>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Error de parseo */}
              {parseError && (
                <div className="px-6 pb-6">
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{parseError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progreso de parseo */}
              {parsing && (
                <div className="px-6 pb-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Procesando archivo...</p>
                </div>
              )}
            </Card>

            {/* Vista previa de datos */}
            {parsedData.length > 0 && (
              <Card className="mb-6">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Vista previa ({parsedData.length} registros)
                    </h3>
                    <Button onClick={handleImport} isLoading={importing} disabled={importing}>
                      {importing ? 'Importando...' : 'Confirmar Importación'}
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Partida</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {parsedData.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm font-mono text-blue-600">{row.codigo}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white max-w-md truncate">
                            {row.descripcion}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{row.partida || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {row.precio_unitario ? `₡${row.precio_unitario.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 50 && (
                    <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                      Mostrando 50 de {parsedData.length} registros
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
