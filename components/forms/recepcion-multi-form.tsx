'use client';

/**
 * Formulario de Recepción Multi-Producto
 * Permite crear documentos de recepción con múltiples líneas de productos
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BodegaSelector } from '@/components/ui/bodega-selector';
import { ArticuloSelector, Articulo } from '@/components/ui/articulo-selector';
import { ProveedorSelector } from '@/components/ui/proveedor-selector';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Package,
  Loader2,
} from 'lucide-react';

interface LineaFormData {
  id: string; // ID temporal para React keys
  articuloId: string;
  articulo: Articulo | null; // Artículo seleccionado completo
  cantidad: string;
  costoUnitario: string;
  ubicacion: string;
}

const emptyLinea = (): LineaFormData => ({
  id: crypto.randomUUID(),
  articuloId: '',
  articulo: null,
  cantidad: '',
  costoUnitario: '',
  ubicacion: '',
});

export function RecepcionMultiForm() {
  // Estado del formulario - Encabezado
  const [proveedorId, setProveedorId] = useState('');
  const [bodegaId, setBodegaId] = useState('');
  const [documentoExterno, setDocumentoExterno] = useState('');
  const [fechaDocumento, setFechaDocumento] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Estado del formulario - Líneas
  const [lineas, setLineas] = useState<LineaFormData[]>([emptyLinea()]);

  // Estado de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    numero: string;
    id: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Agregar línea
  const agregarLinea = useCallback(() => {
    setLineas((prev) => [...prev, emptyLinea()]);
  }, []);

  // Eliminar línea
  const eliminarLinea = useCallback((id: string) => {
    setLineas((prev) => {
      if (prev.length === 1) return prev; // Mantener al menos una línea
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  // Actualizar línea
  const actualizarLinea = useCallback(
    (id: string, campo: keyof LineaFormData, valor: string | Articulo | null) => {
      setLineas((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l))
      );
      // Limpiar errores del campo
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`linea_${id}_${campo}`];
        return newErrors;
      });
    },
    []
  );

  // Manejador específico para cambio de artículo en una línea
  const handleArticuloLineaChange = useCallback(
    (lineaId: string, articulo: Articulo | null) => {
      setLineas((prev) =>
        prev.map((l) =>
          l.id === lineaId
            ? { ...l, articuloId: articulo?.id || '', articulo }
            : l
        )
      );
      // Limpiar errores del campo
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`linea_${lineaId}_articuloId`];
        return newErrors;
      });
    },
    []
  );

  // Calcular totales
  const calcularTotales = useCallback(() => {
    let subtotalSinIva = 0;
    let montoIva = 0;

    for (const linea of lineas) {
      if (!linea.articulo) continue;

      const cantidad = parseFloat(linea.cantidad) || 0;
      const costoUnitario = parseFloat(linea.costoUnitario) || 0;
      const lineaSubtotal = cantidad * costoUnitario;
      const lineaIva = lineaSubtotal * (linea.articulo.ivaPercent || 0);

      subtotalSinIva += lineaSubtotal;
      montoIva += lineaIva;
    }

    return {
      subtotalSinIva,
      montoIva,
      totalConIva: subtotalSinIva + montoIva,
    };
  }, [lineas]);

  const totales = calcularTotales();

  // Validar formulario
  const validarFormulario = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar que hay líneas con datos
    let lineasValidas = 0;
    for (const linea of lineas) {
      if (!linea.articuloId) {
        errors[`linea_${linea.id}_articuloId`] = 'Seleccione un artículo';
        continue;
      }

      if (!linea.cantidad || parseFloat(linea.cantidad) <= 0) {
        errors[`linea_${linea.id}_cantidad`] = 'La cantidad debe ser mayor a 0';
      }

      lineasValidas++;
    }

    if (lineasValidas === 0) {
      errors['global'] = 'Debe agregar al menos una línea válida';
    }

    if (!bodegaId) {
      errors['bodegaId'] = 'Seleccione una bodega';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validarFormulario()) {
      return;
    }

    setLoading(true);

    try {
      // Preparar payload
      const payload = {
        proveedorId: proveedorId || null,
        bodegaId: bodegaId || null,
        documentoExterno: documentoExterno || null,
        fechaDocumento: fechaDocumento || null,
        observaciones: observaciones || null,
        detalles: lineas
          .filter((l) => l.articuloId) // Solo líneas con artículo
          .map((l) => ({
            articuloId: l.articuloId,
            cantidad: parseFloat(l.cantidad),
            costoUnitario: l.costoUnitario ? parseFloat(l.costoUnitario) : null,
            ubicacion: l.ubicacion || null,
          })),
      };

      const response = await fetch('/api/documentos-recepcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Error al crear documento');
      }

      setSuccess({
        numero: data.data.numero,
        id: data.data.id,
      });

      // Limpiar formulario
      setProveedorId('');
      setBodegaId('');
      setDocumentoExterno('');
      setFechaDocumento('');
      setObservaciones('');
      setLineas([emptyLinea()]);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear documento');
    } finally {
      setLoading(false);
    }
  };

  // Procesar documento directamente
  const handleProcesar = async () => {
    if (!success) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documentos-recepcion/${success.id}/procesar`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Error al procesar documento');
      }

      // Actualizar mensaje de éxito
      setSuccess((prev) => prev ? { ...prev, procesado: true } as typeof prev : null);
      alert(`Documento ${success.numero} procesado exitosamente. Se crearon ${data.data.lotesCreados} lotes.`);

      // Redirigir a lista de recepciones
      window.location.href = '/recepciones';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar documento');
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensaje de éxito */}
      {success && (
        <Card className="bg-green-50 border-green-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Documento {success.numero} creado exitosamente
              </p>
              <p className="text-sm text-green-700 mt-1">
                El documento está en estado BORRADOR. Puede procesarlo para crear los lotes en inventario.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleProcesar}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Procesar Ahora
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuccess(null)}
                >
                  Crear Otro Documento
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Mensaje de error */}
      {error && (
        <Card className="bg-red-50 border-red-200 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Error global de validación */}
      {fieldErrors['global'] && (
        <Card className="bg-yellow-50 border-yellow-200 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-sm text-yellow-700">{fieldErrors['global']}</p>
          </div>
        </Card>
      )}

      {/* Encabezado del documento */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Datos del Documento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Bodega */}
          <BodegaSelector
            value={bodegaId}
            onChange={(value) => setBodegaId(value)}
            disabled={loading}
            required
            error={fieldErrors['bodegaId']}
          />

          {/* Proveedor */}
          <ProveedorSelector
            value={proveedorId}
            onChange={(prov) => setProveedorId(prov?.id || '')}
            disabled={loading}
            label="Proveedor"
          />

          {/* Documento Externo */}
          <div>
            <Label htmlFor="documentoExterno">Documento Externo</Label>
            <Input
              id="documentoExterno"
              type="text"
              placeholder="Ej: Factura #12345"
              value={documentoExterno}
              onChange={(e) => setDocumentoExterno(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Fecha Documento */}
          <div>
            <Label htmlFor="fechaDocumento">Fecha Documento</Label>
            <Input
              id="fechaDocumento"
              type="date"
              value={fechaDocumento}
              onChange={(e) => setFechaDocumento(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Observaciones */}
          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input
              id="observaciones"
              type="text"
              placeholder="Notas adicionales"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </Card>

      {/* Líneas de recepción */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Líneas de Recepción
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={agregarLinea}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Línea
          </Button>
        </div>

        <div className="space-y-4">
          {lineas.map((linea, index) => {
            return (
              <div
                key={linea.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Linea #{index + 1}
                  </span>
                  {lineas.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarLinea(linea.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Artículo */}
                  <div className="lg:col-span-2">
                    <ArticuloSelector
                      value={linea.articuloId}
                      onChange={(articulo) => handleArticuloLineaChange(linea.id, articulo)}
                      disabled={loading}
                      required
                      error={fieldErrors[`linea_${linea.id}_articuloId`]}
                      label="Articulo"
                    />
                  </div>

                  {/* Cantidad */}
                  <div>
                    <Label htmlFor={`cantidad_${linea.id}`} required>
                      Cantidad
                    </Label>
                    <Input
                      id={`cantidad_${linea.id}`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0"
                      value={linea.cantidad}
                      onChange={(e) =>
                        actualizarLinea(linea.id, 'cantidad', e.target.value)
                      }
                      disabled={loading}
                      error={fieldErrors[`linea_${linea.id}_cantidad`]}
                    />
                    {linea.articulo && (
                      <p className="text-xs text-gray-500 mt-1">
                        {linea.articulo.unidadMedida}
                      </p>
                    )}
                  </div>

                  {/* Costo Unitario */}
                  <div>
                    <Label htmlFor={`costo_${linea.id}`}>Costo Unit.</Label>
                    <Input
                      id={`costo_${linea.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={linea.costoUnitario}
                      onChange={(e) =>
                        actualizarLinea(linea.id, 'costoUnitario', e.target.value)
                      }
                      disabled={loading}
                    />
                  </div>

                </div>

                {/* Subtotal de línea */}
                {linea.articuloId && linea.cantidad && linea.costoUnitario && (
                  <div className="mt-3 text-right">
                    <span className="text-sm text-gray-600">
                      Subtotal línea:{' '}
                      <strong>
                        {formatCurrency(
                          parseFloat(linea.cantidad) * parseFloat(linea.costoUnitario)
                        )}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Totales */}
      <Card className="p-4 sm:p-6 bg-blue-50 border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-blue-900">
              Resumen del Documento
            </span>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-gray-600">
              Subtotal sin IVA: {formatCurrency(totales.subtotalSinIva)}
            </div>
            <div className="text-sm text-gray-600">
              Monto IVA: {formatCurrency(totales.montoIva)}
            </div>
            <div className="text-lg font-bold text-blue-900">
              Total con IVA: {formatCurrency(totales.totalConIva)}
            </div>
          </div>
        </div>
      </Card>

      {/* Botones */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = '/recepciones')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Documento
        </Button>
      </div>
    </form>
  );
}
