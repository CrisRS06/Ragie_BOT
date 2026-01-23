'use client';

/**
 * Modal de Importación Masiva de Artículos
 * Permite cargar artículos desde archivos Excel
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

type ImportStep = 'upload' | 'preview' | 'processing' | 'result';

interface ImportResult {
  totalProcesadas: number;
  creados: number;
  actualizados: number;
  errores: number;
  omitidos: number;
  detalles: Array<{
    fila: number;
    sku: string;
    accion: 'creado' | 'actualizado' | 'error' | 'omitido';
    mensaje?: string;
  }>;
}

interface ImportArticulosModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportArticulosModal({
  open,
  onClose,
  onSuccess,
}: ImportArticulosModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [actualizarExistentes, setActualizarExistentes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset al cerrar
  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setActualizarExistentes(false);
    setLoading(false);
    setError(null);
    setResult(null);
    onClose();
  }, [onClose]);

  // Descargar plantilla
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await fetch('/api/articulos/importar/plantilla');
      if (!response.ok) {
        throw new Error('Error al descargar plantilla');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_importacion_articulos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar plantilla');
    }
  }, []);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);

    // Validar extensión
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Solo se permiten archivos Excel (.xlsx, .xls)');
      return;
    }

    // Validar tamaño (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo (10MB)');
      return;
    }

    setFile(selectedFile);
    setStep('preview');
  }, []);

  // Drop handler
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  // Prevenir default en drag
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Input file change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  // Ejecutar importación
  const handleImport = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('actualizarExistentes', String(actualizarExistentes));

      const response = await fetch('/api/articulos/importar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Error al importar');
      }

      setResult(data.data);
      setStep('result');

      // Si hubo creaciones o actualizaciones, notificar éxito
      if (data.data.creados > 0 || data.data.actualizados > 0) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }, [file, actualizarExistentes, onSuccess]);

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importar Artículos'}
            {step === 'preview' && 'Confirmar Importación'}
            {step === 'processing' && 'Procesando...'}
            {step === 'result' && 'Resultado de Importación'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Cargue un archivo Excel con los artículos a importar'}
            {step === 'preview' && 'Revise la configuración antes de importar'}
            {step === 'processing' && 'Espere mientras se procesan los artículos'}
            {step === 'result' && 'Resumen de la importación completada'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* PASO 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Descargar plantilla */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Descargue la plantilla
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Use nuestra plantilla Excel para asegurar el formato correcto
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Plantilla
                    </Button>
                  </div>
                </div>
              </div>

              {/* Zona de drop */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-900">
                  Arrastre un archivo aquí
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  o haga clic para seleccionar
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Archivos Excel (.xlsx) hasta 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: Preview */}
          {step === 'preview' && file && (
            <div className="space-y-4">
              {/* Archivo seleccionado */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setStep('upload');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Opción: Actualizar existentes */}
              <div className="border border-gray-200 rounded-md p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actualizarExistentes}
                    onChange={(e) => setActualizarExistentes(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Actualizar artículos existentes
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Si un SKU ya existe, actualizar sus datos con los del archivo.
                      Si está desactivado, se omitirán.
                    </p>
                  </div>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Processing */}
          {step === 'processing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
              <p className="text-sm font-medium text-gray-900 mt-4">
                Procesando importación...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Esto puede tardar unos momentos
              </p>
            </div>
          )}

          {/* PASO 4: Result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                  <p className="text-2xl font-bold text-green-700 mt-1">{result.creados}</p>
                  <p className="text-xs text-green-600">Creados</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-center">
                  <CheckCircle className="h-6 w-6 text-blue-600 mx-auto" />
                  <p className="text-2xl font-bold text-blue-700 mt-1">{result.actualizados}</p>
                  <p className="text-xs text-blue-600">Actualizados</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto" />
                  <p className="text-2xl font-bold text-yellow-700 mt-1">{result.omitidos}</p>
                  <p className="text-xs text-yellow-600">Omitidos</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
                  <XCircle className="h-6 w-6 text-red-600 mx-auto" />
                  <p className="text-2xl font-bold text-red-700 mt-1">{result.errores}</p>
                  <p className="text-xs text-red-600">Errores</p>
                </div>
              </div>

              {/* Detalles de errores */}
              {result.errores > 0 && (
                <div className="border border-red-200 rounded-md overflow-hidden">
                  <div className="bg-red-50 px-3 py-2 border-b border-red-200">
                    <p className="text-sm font-medium text-red-800">
                      Errores encontrados
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Fila
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.detalles
                          .filter((d) => d.accion === 'error')
                          .map((detalle, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {detalle.fila}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {detalle.sku}
                              </td>
                              <td className="px-3 py-2 text-sm text-red-600">
                                {detalle.mensaje}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                <p className="text-sm text-gray-600">
                  Total de filas procesadas: <strong>{result.totalProcesadas}</strong>
                </p>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setStep('upload');
                }}
              >
                Atrás
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
