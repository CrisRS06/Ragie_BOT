'use client';

/**
 * Crear Ajuste de Inventario
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Package, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { AccessDenied } from '@/components/ui/access-denied';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  stockTotal: number;
}

interface Lote {
  id: string;
  codigoLote: string;
  cantidadDisponible: number;
  fechaVencimiento: string;
  ubicacion: string | null;
}

export default function NuevoAjustePage() {
  const { hasAccess, loading: accessLoading, error: accessError } = useRoleAccess({
    requiredPermission: 'ajustes.crear',
    redirectTo: '/inventario',
  });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);

  const [formData, setFormData] = useState({
    articuloId: '',
    loteId: '',
    tipoAjuste: 'DECREMENTO',
    cantidad: '',
    motivo: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchArticulos();
  }, []);

  useEffect(() => {
    if (formData.articuloId) {
      fetchLotes(formData.articuloId);
    } else {
      setLotes([]);
      setFormData((prev) => ({ ...prev, loteId: '' }));
    }
  }, [formData.articuloId]);

  const fetchArticulos = async () => {
    try {
      setLoadingArticulos(true);
      const response = await fetch('/api/articulos');
      const data = await response.json();

      if (data.success) {
        setArticulos(data.data);
      }
    } catch (err) {
      console.error('Error al cargar artículos:', err);
    } finally {
      setLoadingArticulos(false);
    }
  };

  const fetchLotes = async (articuloId: string) => {
    try {
      setLoadingLotes(true);
      const response = await fetch(`/api/inventario/${articuloId}/lotes`);
      const data = await response.json();

      if (data.success) {
        setLotes(data.data.filter((l: Lote) => l.cantidadDisponible > 0));
      }
    } catch (err) {
      console.error('Error al cargar lotes:', err);
    } finally {
      setLoadingLotes(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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

    if (!formData.loteId) {
      errors.loteId = 'Seleccione un lote';
    }

    if (!formData.cantidad || parseFloat(formData.cantidad) <= 0) {
      errors.cantidad = 'La cantidad debe ser mayor a 0';
    }

    if (!formData.motivo || formData.motivo.length < 10) {
      errors.motivo = 'El motivo debe tener al menos 10 caracteres';
    }

    // Validar que no exceda la cantidad disponible en decrementos
    if (formData.tipoAjuste === 'DECREMENTO' && formData.loteId) {
      const lote = lotes.find((l) => l.id === formData.loteId);
      if (lote && parseFloat(formData.cantidad) > lote.cantidadDisponible) {
        errors.cantidad = `No puede exceder ${lote.cantidadDisponible} disponibles`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articuloId: formData.articuloId,
          loteId: formData.loteId,
          tipoAjuste: formData.tipoAjuste,
          cantidad: parseFloat(formData.cantidad),
          motivo: formData.motivo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear ajuste');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/inventario');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear ajuste');
    } finally {
      setLoading(false);
    }
  };

  const loteSeleccionado = lotes.find((l) => l.id === formData.loteId);
  const articuloSeleccionado = articulos.find((a) => a.id === formData.articuloId);

  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied message={accessError || undefined} backHref="/inventario" backLabel="Volver a Inventario" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/inventario"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Inventario
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajuste de Inventario</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Registre incrementos o decrementos de inventario
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Success */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                Ajuste registrado exitosamente. Redirigiendo...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <Card className="p-6 space-y-6">
            {/* Artículo */}
            <div>
              <Label htmlFor="articuloId" required>
                Artículo
              </Label>
              <Select
                id="articuloId"
                name="articuloId"
                value={formData.articuloId}
                onChange={handleChange}
                disabled={loading || loadingArticulos}
                error={fieldErrors.articuloId}
              >
                <option value="">
                  {loadingArticulos ? 'Cargando...' : 'Seleccione un artículo'}
                </option>
                {articulos.map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.sku} - {art.nombre} (Stock: {art.stockTotal})
                  </option>
                ))}
              </Select>
            </div>

            {/* Info del artículo */}
            {articuloSeleccionado && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">{articuloSeleccionado.nombre}</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Unidad: {articuloSeleccionado.unidadMedida} | Stock total:{' '}
                  {articuloSeleccionado.stockTotal}
                </p>
              </div>
            )}

            {/* Lote */}
            <div>
              <Label htmlFor="loteId" required>
                Lote
              </Label>
              <Select
                id="loteId"
                name="loteId"
                value={formData.loteId}
                onChange={handleChange}
                disabled={loading || loadingLotes || !formData.articuloId}
                error={fieldErrors.loteId}
              >
                <option value="">
                  {loadingLotes
                    ? 'Cargando lotes...'
                    : !formData.articuloId
                    ? 'Primero seleccione un artículo'
                    : 'Seleccione un lote'}
                </option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.codigoLote || 'Sin código'} - Disponible: {lote.cantidadDisponible} |
                    Vence: {new Date(lote.fechaVencimiento).toLocaleDateString('es-CR')}
                  </option>
                ))}
              </Select>
            </div>

            {/* Info del lote */}
            {loteSeleccionado && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <Layers className="h-4 w-4" />
                  <span className="font-medium">
                    Disponible: {loteSeleccionado.cantidadDisponible}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Vencimiento:{' '}
                  {new Date(loteSeleccionado.fechaVencimiento).toLocaleDateString('es-CR')}
                  {loteSeleccionado.ubicacion && ` | Ubicación: ${loteSeleccionado.ubicacion}`}
                </p>
              </div>
            )}

            {/* Tipo de ajuste */}
            <div>
              <Label htmlFor="tipoAjuste" required>
                Tipo de Ajuste
              </Label>
              <Select
                id="tipoAjuste"
                name="tipoAjuste"
                value={formData.tipoAjuste}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="DECREMENTO">Decremento (Merma, pérdida, etc.)</option>
                <option value="INCREMENTO">Incremento (Corrección positiva)</option>
              </Select>
            </div>

            {/* Cantidad */}
            <div>
              <Label htmlFor="cantidad" required>
                Cantidad a ajustar
              </Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ej: 10"
                value={formData.cantidad}
                onChange={handleChange}
                disabled={loading}
                error={fieldErrors.cantidad}
              />
              {formData.tipoAjuste === 'DECREMENTO' && loteSeleccionado && (
                <p className="mt-1 text-xs text-gray-500">
                  Máximo: {loteSeleccionado.cantidadDisponible}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div>
              <Label htmlFor="motivo" required>
                Motivo del Ajuste
              </Label>
              <textarea
                id="motivo"
                name="motivo"
                rows={3}
                className={`mt-1 block w-full rounded-md shadow-sm text-sm ${
                  fieldErrors.motivo
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } dark:bg-gray-800 dark:border-gray-600 dark:text-white`}
                placeholder="Describa detalladamente el motivo del ajuste (mínimo 10 caracteres)..."
                value={formData.motivo}
                onChange={handleChange}
                disabled={loading}
              />
              {fieldErrors.motivo && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.motivo}</p>
              )}
            </div>
          </Card>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/inventario')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading} disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Ajuste'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
