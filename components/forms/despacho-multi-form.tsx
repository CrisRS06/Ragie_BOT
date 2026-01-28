'use client';

/**
 * Formulario de Despacho Multi-Producto
 * Permite crear despachos con múltiples líneas de productos usando PEPS
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Package,
  Loader2,
} from 'lucide-react';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  stockTotal: number;
}

interface UnidadReceptora {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  responsable: string | null;
}

interface LineaDespacho {
  id: string;
  articuloId: string;
  cantidad: string;
}

interface ResultadoLinea {
  articuloNombre: string;
  cantidad: number;
  lotesConsumidos: number;
  exitoso: boolean;
  error?: string;
}

const emptyLinea = (): LineaDespacho => ({
  id: crypto.randomUUID(),
  articuloId: '',
  cantidad: '',
});

export function DespachoMultiForm() {
  // Estado de datos de referencia
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [unidadesReceptoras, setUnidadesReceptoras] = useState<UnidadReceptora[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado del formulario - Encabezado
  const [receptor, setReceptor] = useState('');
  const [cedulaReceptor, setCedulaReceptor] = useState('');
  const [unidadReceptoraId, setUnidadReceptoraId] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Estado del formulario - Líneas
  const [lineas, setLineas] = useState<LineaDespacho[]>([emptyLinea()]);

  // Estado de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    resultados: ResultadoLinea[];
    totalArticulos: number;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cargar datos al montar
  useEffect(() => {
    Promise.all([fetchArticulos(), fetchUnidadesReceptoras()]).finally(() => {
      setLoadingData(false);
    });
  }, []);

  const fetchArticulos = async () => {
    try {
      const response = await fetch('/api/articulos');
      const data = await response.json();
      if (data.success) {
        // Solo artículos con stock
        setArticulos(data.data.filter((a: Articulo) => a.stockTotal > 0));
      }
    } catch (err) {
      console.error('Error al cargar artículos:', err);
    }
  };

  const fetchUnidadesReceptoras = async () => {
    try {
      const response = await fetch('/api/unidades-receptoras');
      const data = await response.json();
      if (data.success) {
        setUnidadesReceptoras(data.data);
      }
    } catch (err) {
      console.error('Error al cargar unidades receptoras:', err);
    }
  };

  // Agregar línea
  const agregarLinea = useCallback(() => {
    setLineas((prev) => [...prev, emptyLinea()]);
  }, []);

  // Eliminar línea
  const eliminarLinea = useCallback((id: string) => {
    setLineas((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  // Actualizar línea
  const actualizarLinea = useCallback(
    (id: string, campo: keyof LineaDespacho, valor: string) => {
      setLineas((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l))
      );
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`linea_${id}_${campo}`];
        return newErrors;
      });
    },
    []
  );

  // Obtener stock disponible para un artículo
  const getStockDisponible = useCallback(
    (articuloId: string) => {
      const articulo = articulos.find((a) => a.id === articuloId);
      return articulo?.stockTotal || 0;
    },
    [articulos]
  );

  // Validar formulario
  const validarFormulario = (): boolean => {
    const errors: Record<string, string> = {};

    if (!receptor || receptor.length < 3) {
      errors.receptor = 'Nombre del receptor es obligatorio (mínimo 3 caracteres)';
    }

    if (!unidadReceptoraId) {
      errors.unidadReceptoraId = 'Seleccione el albergue/unidad receptora de destino';
    }

    let lineasValidas = 0;
    for (const linea of lineas) {
      if (!linea.articuloId) {
        errors[`linea_${linea.id}_articuloId`] = 'Seleccione un artículo';
        continue;
      }

      const cantidad = parseFloat(linea.cantidad);
      if (!linea.cantidad || cantidad <= 0) {
        errors[`linea_${linea.id}_cantidad`] = 'La cantidad debe ser mayor a 0';
      } else {
        const stockDisponible = getStockDisponible(linea.articuloId);
        if (cantidad > stockDisponible) {
          errors[`linea_${linea.id}_cantidad`] = `Stock insuficiente. Disponible: ${stockDisponible}`;
        }
      }

      lineasValidas++;
    }

    if (lineasValidas === 0) {
      errors['global'] = 'Debe agregar al menos una línea válida';
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
      const lineasValidas = lineas.filter((l) => l.articuloId && parseFloat(l.cantidad) > 0);
      const resultados: ResultadoLinea[] = [];

      // Procesar cada línea
      for (const linea of lineasValidas) {
        const articulo = articulos.find((a) => a.id === linea.articuloId);

        try {
          const response = await fetch('/api/despachos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articuloId: linea.articuloId,
              cantidad: parseFloat(linea.cantidad),
              receptor,
              cedulaReceptor: cedulaReceptor || undefined,
              unidadReceptoraId,
              observaciones: observaciones || undefined,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            resultados.push({
              articuloNombre: articulo?.nombre || linea.articuloId,
              cantidad: parseFloat(linea.cantidad),
              lotesConsumidos: 0,
              exitoso: false,
              error: data.error || 'Error al procesar',
            });
          } else {
            resultados.push({
              articuloNombre: articulo?.nombre || linea.articuloId,
              cantidad: parseFloat(linea.cantidad),
              lotesConsumidos: data.lotesConsumidos?.length || 0,
              exitoso: true,
            });
          }
        } catch (err) {
          resultados.push({
            articuloNombre: articulo?.nombre || linea.articuloId,
            cantidad: parseFloat(linea.cantidad),
            lotesConsumidos: 0,
            exitoso: false,
            error: 'Error de conexión',
          });
        }
      }

      const exitosos = resultados.filter((r) => r.exitoso).length;

      if (exitosos === 0) {
        setError('No se pudo procesar ningún despacho');
      } else {
        setSuccess({
          resultados,
          totalArticulos: exitosos,
        });

        // Limpiar formulario
        setReceptor('');
        setCedulaReceptor('');
        setUnidadReceptoraId('');
        setObservaciones('');
        setLineas([emptyLinea()]);

        // Recargar artículos para actualizar stock
        setTimeout(() => fetchArticulos(), 500);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar despachos');
    } finally {
      setLoading(false);
    }
  };

  // Contar total de unidades
  const totalUnidades = lineas.reduce((sum, l) => {
    return sum + (parseFloat(l.cantidad) || 0);
  }, 0);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando datos...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensaje de éxito */}
      {success && (
        <Card className="bg-green-50 border-green-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Despacho PEPS exitoso - {success.totalArticulos} artículo(s) procesado(s)
              </p>
              <ul className="mt-2 text-sm text-green-700 space-y-1">
                {success.resultados.map((r, idx) => (
                  <li key={idx} className={r.exitoso ? '' : 'text-red-600'}>
                    {r.exitoso ? '✓' : '✗'} {r.articuloNombre}: {r.cantidad} unidades
                    {r.exitoso ? ` (${r.lotesConsumidos} lotes)` : ` - ${r.error}`}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuccess(null)}
                >
                  Crear Otro Despacho
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

      {/* Datos del Receptor */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Datos del Receptor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Nombre del Receptor */}
          <div>
            <Label htmlFor="receptor" required>Nombre del Receptor</Label>
            <Input
              id="receptor"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={receptor}
              onChange={(e) => setReceptor(e.target.value)}
              disabled={loading}
              error={fieldErrors.receptor}
            />
          </div>

          {/* Cédula */}
          <div>
            <Label htmlFor="cedulaReceptor">Cédula</Label>
            <Input
              id="cedulaReceptor"
              type="text"
              placeholder="Ej: 1-0234-0567"
              value={cedulaReceptor}
              onChange={(e) => setCedulaReceptor(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Unidad Receptora */}
          <div>
            <Label htmlFor="unidadReceptoraId" required>Albergue / Unidad</Label>
            <Select
              id="unidadReceptoraId"
              value={unidadReceptoraId}
              onChange={(e) => setUnidadReceptoraId(e.target.value)}
              disabled={loading}
              error={fieldErrors.unidadReceptoraId}
            >
              <option value="">Seleccione destino</option>
              {unidadesReceptoras.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo} - {u.nombre}
                </option>
              ))}
            </Select>
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

        {/* Info del albergue seleccionado */}
        {unidadReceptoraId && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            {(() => {
              const unidad = unidadesReceptoras.find((u) => u.id === unidadReceptoraId);
              if (!unidad) return null;
              return (
                <div className="text-sm text-blue-800">
                  <span className="font-medium">{unidad.nombre}</span>
                  {unidad.direccion && <span> - {unidad.direccion}</span>}
                  {unidad.responsable && <span className="text-blue-600"> (Resp: {unidad.responsable})</span>}
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {/* Líneas de despacho */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos a Despachar
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
            const articuloSeleccionado = articulos.find((a) => a.id === linea.articuloId);
            const stockDisponible = articuloSeleccionado?.stockTotal || 0;

            return (
              <div
                key={linea.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Línea #{index + 1}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Artículo */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`articulo_${linea.id}`} required>Artículo</Label>
                    <Select
                      id={`articulo_${linea.id}`}
                      value={linea.articuloId}
                      onChange={(e) => actualizarLinea(linea.id, 'articuloId', e.target.value)}
                      disabled={loading}
                      error={fieldErrors[`linea_${linea.id}_articuloId`]}
                    >
                      <option value="">Seleccione un artículo</option>
                      {articulos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.sku} - {a.nombre} (Stock: {a.stockTotal} {a.unidadMedida})
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Cantidad */}
                  <div>
                    <Label htmlFor={`cantidad_${linea.id}`} required>Cantidad</Label>
                    <Input
                      id={`cantidad_${linea.id}`}
                      type="number"
                      step="1"
                      min="1"
                      max={stockDisponible}
                      placeholder={stockDisponible > 0 ? `Máx: ${stockDisponible}` : '0'}
                      value={linea.cantidad}
                      onChange={(e) => actualizarLinea(linea.id, 'cantidad', e.target.value)}
                      disabled={loading || !linea.articuloId}
                      error={fieldErrors[`linea_${linea.id}_cantidad`]}
                    />
                    {articuloSeleccionado && (
                      <p className="text-xs text-gray-500 mt-1">
                        {articuloSeleccionado.unidadMedida} - Disponible: {stockDisponible}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Resumen */}
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-900">Resumen del Despacho</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Líneas: {lineas.filter((l) => l.articuloId).length}
            </div>
            <div className="text-lg font-bold text-amber-900">
              Total: {totalUnidades} unidades
            </div>
          </div>
        </div>
      </Card>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = '/despachos')}
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
          Confirmar Despacho PEPS
        </Button>
      </div>
    </form>
  );
}
