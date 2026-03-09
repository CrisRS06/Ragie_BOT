'use client';

/**
 * Formulario de Despacho PEPS - Journey 2
 * Maneja la creación de despachos usando el algoritmo PEPS
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BodegaSelector } from '@/components/ui/bodega-selector';
import { ArticuloSelector, Articulo } from '@/components/ui/articulo-selector';

interface LotePEPS {
  id: string;
  cantidadDisponible: number;
  fechaIngresoTs: string;
  fechaVencimiento: string;
  numeroLote: string | null;
  ubicacion: string | null;
  diasHastaVencimiento: number;
  vencido: boolean;
  alertaVencimiento: string | null;
}

interface SugerenciaConsumo {
  cantidadSolicitada: number;
  consumos: Array<{ loteId: string; cantidad: number }>;
  stockSuficiente: boolean;
  mensaje?: string;
}

interface LoteConsumido {
  loteId: string;
  numeroLote: string;
  cantidadConsumida: number;
  cantidadRestante: number;
  fechaVencimiento: string;
}

// FASE 2: Interface para Unidades Receptoras (Albergues)
interface UnidadReceptora {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  responsable: string | null;
}

export function DespachoForm() {
  // Estado del formulario
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [despachoResult, setDespachoResult] = useState<{
    despachoId: string;
    lotesConsumidos: LoteConsumido[];
    cantidadTotal: number;
  } | null>(null);

  // FASE 2: Estado para Unidades Receptoras (Albergues)
  const [unidadesReceptoras, setUnidadesReceptoras] = useState<UnidadReceptora[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);

  // Lotes PEPS del artículo seleccionado
  const [lotesPEPS, setLotesPEPS] = useState<LotePEPS[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [sugerenciaConsumo, setSugerenciaConsumo] = useState<SugerenciaConsumo | null>(null);

  // Campos del formulario
  const [formData, setFormData] = useState({
    articuloId: '',
    cantidad: '',
    receptor: '',
    cedulaReceptor: '',
    unidadReceptoraId: '',
    observaciones: '',
    bodegaId: '',
  });

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cargar unidades receptoras al montar
  useEffect(() => {
    fetchUnidadesReceptoras();
  }, []);

  // Cargar lotes cuando cambia el artículo o la bodega
  useEffect(() => {
    if (formData.articuloId) {
      fetchLotesPEPS(formData.articuloId, formData.bodegaId);
    } else {
      setLotesPEPS([]);
      setStockTotal(0);
      setSugerenciaConsumo(null);
    }
  }, [formData.articuloId, formData.bodegaId]);

  // Calcular sugerencia de consumo cuando cambia la cantidad
  useEffect(() => {
    if (formData.articuloId && formData.cantidad) {
      const cantidad = parseFloat(formData.cantidad);
      if (!isNaN(cantidad) && cantidad > 0) {
        fetchSugerenciaConsumo(formData.articuloId, cantidad);
      }
    } else {
      setSugerenciaConsumo(null);
    }
  }, [formData.articuloId, formData.cantidad]);

  // FASE 2: Fetch Unidades Receptoras (Albergues)
  const fetchUnidadesReceptoras = async () => {
    try {
      setLoadingUnidades(true);
      const response = await fetch('/api/unidades-receptoras');
      const data = await response.json();

      if (data.success) {
        setUnidadesReceptoras(data.data);
      } else {
        console.error('Error al cargar unidades receptoras:', data.error);
      }
    } catch (err) {
      console.error('Error de conexión al cargar unidades receptoras:', err);
    } finally {
      setLoadingUnidades(false);
    }
  };

  const fetchLotesPEPS = async (articuloId: string, bodegaId?: string) => {
    try {
      setLoadingLotes(true);
      const params = new URLSearchParams();
      if (bodegaId) {
        params.append('bodegaId', bodegaId);
      }
      const url = `/api/articulos/${articuloId}/lotes-peps${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      setLotesPEPS(data.lotes || []);
      setStockTotal(data.stockTotal || 0);
    } catch (err) {
      console.error('Error al cargar lotes PEPS:', err);
    } finally {
      setLoadingLotes(false);
    }
  };

  const fetchSugerenciaConsumo = async (articuloId: string, cantidad: number) => {
    try {
      const response = await fetch(`/api/articulos/${articuloId}/lotes-peps?cantidad=${cantidad}`);
      const data = await response.json();
      setSugerenciaConsumo(data.sugerenciaConsumo);
    } catch (err) {
      console.error('Error al obtener sugerencia de consumo:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.articuloId) {
      errors.articuloId = 'Seleccione un artículo';
    }

    if (!formData.bodegaId) {
      errors.bodegaId = 'Seleccione una bodega';
    }

    if (!formData.cantidad || parseFloat(formData.cantidad) <= 0) {
      errors.cantidad = 'La cantidad debe ser mayor a 0';
    } else if (parseFloat(formData.cantidad) > stockTotal) {
      errors.cantidad = `Stock insuficiente. Disponible: ${stockTotal}`;
    }

    // FASE 2: Validar unidad receptora obligatoria
    if (!formData.unidadReceptoraId) {
      errors.unidadReceptoraId = 'Seleccione el albergue/unidad receptora de destino';
    }

    if (!formData.receptor || formData.receptor.length < 3) {
      errors.receptor = 'El nombre del receptor es obligatorio (mínimo 3 caracteres)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setDespachoResult(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        articuloId: formData.articuloId,
        cantidad: parseFloat(formData.cantidad),
        receptor: formData.receptor,
        cedulaReceptor: formData.cedulaReceptor || undefined,
        unidadReceptoraId: formData.unidadReceptoraId || undefined,
        observaciones: formData.observaciones || undefined,
        bodegaId: formData.bodegaId || undefined,
      };

      const response = await fetch('/api/despachos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear despacho');
      }

      // Éxito
      setSuccess(true);
      setDespachoResult({
        despachoId: data.despachoId,
        lotesConsumidos: data.lotesConsumidos,
        cantidadTotal: data.cantidadTotal,
      });

      // Limpiar formulario
      setFormData({
        articuloId: '',
        cantidad: '',
        receptor: '',
        cedulaReceptor: '',
        unidadReceptoraId: '',
        observaciones: '',
        bodegaId: '',
      });
      setLotesPEPS([]);
      setStockTotal(0);
      setSugerenciaConsumo(null);

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Limpiar artículo seleccionado
      setArticuloSeleccionado(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear despacho');
    } finally {
      setLoading(false);
    }
  };

  // Manejador de cambio de artículo
  const handleArticuloChange = (articulo: Articulo | null) => {
    setArticuloSeleccionado(articulo);
    setFormData((prev) => ({
      ...prev,
      articuloId: articulo?.id || '',
    }));
    // Limpiar error del campo
    if (fieldErrors.articuloId) {
      setFieldErrors((prev) => ({ ...prev, articuloId: '' }));
    }
    // Cargar lotes si hay artículo y bodega
    if (articulo && formData.bodegaId) {
      fetchLotesPEPS(articulo.id, formData.bodegaId);
    } else {
      setLotesPEPS([]);
      setStockTotal(0);
      setSugerenciaConsumo(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensaje de éxito con detalles */}
      {success && despachoResult && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-green-800">Despacho PEPS exitoso</p>
              <div className="mt-2 text-sm text-green-700">
                <p>ID Despacho: <span className="font-mono">{despachoResult.despachoId}</span></p>
                <p>Cantidad total: {despachoResult.cantidadTotal}</p>
                <p className="mt-2 font-medium">Lotes consumidos (orden PEPS):</p>
                <ul className="mt-1 list-disc list-inside">
                  {despachoResult.lotesConsumidos.map((lote, idx) => (
                    <li key={idx}>
                      {lote.numeroLote}: {lote.cantidadConsumida} unidades
                      {lote.cantidadRestante === 0 && ' (agotado)'}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstMovId = despachoResult.lotesConsumidos[0]?.loteId;
                    if (firstMovId) {
                      window.open(`/api/despachos/${despachoResult.despachoId}/documento`, '_blank');
                    }
                  }}
                >
                  Descargar Documento PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bodega */}
      <BodegaSelector
        value={formData.bodegaId}
        onChange={(value) => {
          setFormData({ ...formData, bodegaId: value, articuloId: '' });
          setArticuloSeleccionado(null);
          setLotesPEPS([]);
          setStockTotal(0);
          setSugerenciaConsumo(null);
        }}
        disabled={loading}
        required
        error={fieldErrors.bodegaId}
      />

      {/* Artículo */}
      <ArticuloSelector
        value={formData.articuloId}
        onChange={handleArticuloChange}
        bodegaId={formData.bodegaId}
        soloConStock={true}
        disabled={loading || !formData.bodegaId}
        required
        error={fieldErrors.articuloId}
        placeholder={!formData.bodegaId ? 'Primero seleccione una bodega' : 'Buscar articulo con stock...'}
        label="Articulo a Despachar"
      />

      {/* Lotes PEPS disponibles */}
      {lotesPEPS.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Lotes Disponibles (Orden PEPS)</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Lote</th>
                    <th className="text-right py-2 px-2">Disponible</th>
                    <th className="text-left py-2 px-2">Ingreso</th>
                    <th className="text-left py-2 px-2">Vence</th>
                    <th className="text-left py-2 px-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lotesPEPS.map((lote, idx) => (
                    <tr
                      key={lote.id}
                      className={`border-b ${
                        sugerenciaConsumo?.consumos.some((c) => c.loteId === lote.id)
                          ? 'bg-yellow-50'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono">{lote.numeroLote || `LOTE-${lote.id.substring(0, 6)}`}</td>
                      <td className="py-2 px-2 text-right font-medium">{lote.cantidadDisponible}</td>
                      <td className="py-2 px-2">{formatDate(lote.fechaIngresoTs)}</td>
                      <td className="py-2 px-2">{formatDate(lote.fechaVencimiento)}</td>
                      <td className="py-2 px-2">
                        {lote.vencido ? (
                          <span className="text-red-600 font-bold">VENCIDO</span>
                        ) : lote.alertaVencimiento === 'CRITICO' ? (
                          <span className="text-orange-600">Vence en {lote.diasHastaVencimiento}d</span>
                        ) : lote.alertaVencimiento === 'PROXIMO' ? (
                          <span className="text-yellow-600">Vence en {lote.diasHastaVencimiento}d</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loadingLotes && <p className="text-center text-gray-500 py-2">Cargando lotes...</p>}
          </CardContent>
        </Card>
      )}

      {/* Cantidad */}
      <div>
        <Label htmlFor="cantidad" required>
          Cantidad a Despachar
        </Label>
        <Input
          id="cantidad"
          name="cantidad"
          type="number"
          step="1"
          min="1"
          max={stockTotal}
          placeholder={`Máximo: ${stockTotal}`}
          value={formData.cantidad}
          onChange={handleChange}
          disabled={loading || !formData.articuloId}
          error={fieldErrors.cantidad}
        />
        {sugerenciaConsumo && (
          <p className={`mt-1 text-xs ${sugerenciaConsumo.stockSuficiente ? 'text-green-600' : 'text-red-600'}`}>
            {sugerenciaConsumo.stockSuficiente
              ? `Se consumirán ${sugerenciaConsumo.consumos.length} lote(s) en orden PEPS`
              : sugerenciaConsumo.mensaje}
          </p>
        )}
      </div>

      {/* Sugerencia de consumo PEPS */}
      {sugerenciaConsumo?.stockSuficiente && sugerenciaConsumo.consumos.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm font-medium text-yellow-900">Consumo PEPS sugerido:</p>
          <ul className="mt-1 text-sm text-yellow-800 list-disc list-inside">
            {sugerenciaConsumo.consumos.map((consumo, idx) => {
              const lote = lotesPEPS.find((l) => l.id === consumo.loteId);
              return (
                <li key={idx}>
                  {lote?.numeroLote || `LOTE-${consumo.loteId.substring(0, 6)}`}: {consumo.cantidad} unidades
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Receptor */}
      <div>
        <Label htmlFor="receptor" required>
          Nombre del Receptor
        </Label>
        <Input
          id="receptor"
          name="receptor"
          type="text"
          placeholder="Ej: Juan Pérez González"
          value={formData.receptor}
          onChange={handleChange}
          disabled={loading}
          error={fieldErrors.receptor}
        />
      </div>

      {/* Cédula del Receptor */}
      <div>
        <Label htmlFor="cedulaReceptor">Cédula del Receptor</Label>
        <Input
          id="cedulaReceptor"
          name="cedulaReceptor"
          type="text"
          placeholder="Ej: 1-0234-0567"
          value={formData.cedulaReceptor}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      {/* FASE 2: Selector de Unidad Receptora (Albergue) */}
      <div>
        <Label htmlFor="unidadReceptoraId" required>
          Albergue / Unidad Receptora
        </Label>
        <Select
          id="unidadReceptoraId"
          name="unidadReceptoraId"
          value={formData.unidadReceptoraId}
          onChange={handleChange}
          disabled={loadingUnidades || loading}
          error={fieldErrors.unidadReceptoraId}
        >
          <option value="">
            {loadingUnidades ? 'Cargando albergues...' : 'Seleccione el albergue de destino'}
          </option>
          {unidadesReceptoras.map((unidad) => (
            <option key={unidad.id} value={unidad.id}>
              {unidad.codigo} - {unidad.nombre}
            </option>
          ))}
        </Select>
      </div>

      {/* Info del albergue seleccionado */}
      {formData.unidadReceptoraId && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          {(() => {
            const unidad = unidadesReceptoras.find((u) => u.id === formData.unidadReceptoraId);
            if (!unidad) return null;
            return (
              <>
                <p className="text-sm font-medium text-blue-900">{unidad.nombre}</p>
                {unidad.direccion && (
                  <p className="text-sm text-blue-800">Dirección: {unidad.direccion}</p>
                )}
                {unidad.responsable && (
                  <p className="text-sm text-blue-700">Responsable: {unidad.responsable}</p>
                )}
                {unidad.telefono && (
                  <p className="text-xs text-blue-600">Tel: {unidad.telefono}</p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Observaciones */}
      <div>
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={3}
          placeholder="Observaciones adicionales del despacho..."
          value={formData.observaciones}
          onChange={handleChange}
          disabled={loading}
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Botones */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = '/dashboard')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={loading}
          disabled={loading || !formData.articuloId || !sugerenciaConsumo?.stockSuficiente}
        >
          {loading ? 'Procesando...' : 'Confirmar Despacho PEPS'}
        </Button>
      </div>
    </form>
  );
}
