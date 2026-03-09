'use client';

/**
 * Formulario de Recepción - Journey 1
 * Maneja la creación de nuevas recepciones con validación
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BodegaSelector } from '@/components/ui/bodega-selector';
import { ArticuloSelector, Articulo } from '@/components/ui/articulo-selector';

export function RecepcionForm() {
  // Estado del formulario
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Campos del formulario
  const [formData, setFormData] = useState({
    articuloId: '',
    cantidad: '',
    proveedor: '',
    costoUnitario: '',
    ubicacion: '',
    documentoReferencia: '',
    bodegaId: '',
  });

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo al escribir
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
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validar
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        articuloId: formData.articuloId,
        cantidad: parseFloat(formData.cantidad),
        proveedor: formData.proveedor || undefined,
        costoUnitario: formData.costoUnitario
          ? parseFloat(formData.costoUnitario)
          : undefined,
        ubicacion: formData.ubicacion || undefined,
        documentoReferencia: formData.documentoReferencia || undefined,
        bodegaId: formData.bodegaId || undefined,
      };

      const response = await fetch('/api/recepciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al crear recepción');
      }

      // Éxito
      setSuccess(true);
      setFormData({
        articuloId: '',
        cantidad: '',
        proveedor: '',
        costoUnitario: '',
        ubicacion: '',
        documentoReferencia: '',
        bodegaId: '',
      });

      // Scroll to top para ver mensaje de éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Limpiar artículo seleccionado
      setArticuloSeleccionado(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al crear recepción'
      );
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensaje de éxito */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                ✅ Recepción creada exitosamente
              </p>
              <p className="mt-1 text-sm text-green-700">
                El lote ha sido registrado y está disponible para despacho PEPS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
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
        onChange={(value) => setFormData({ ...formData, bodegaId: value })}
        disabled={loading}
        required
        error={fieldErrors.bodegaId}
      />

      {/* Artículo */}
      <ArticuloSelector
        value={formData.articuloId}
        onChange={handleArticuloChange}
        disabled={loading}
        required
        error={fieldErrors.articuloId}
        placeholder="Buscar por SKU, nombre, codigo SIGAF, marca..."
      />

      {/* Cantidad */}
      <div>
        <Label htmlFor="cantidad" required>
          Cantidad
        </Label>
        <Input
          id="cantidad"
          name="cantidad"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Ej: 100"
          value={formData.cantidad}
          onChange={handleChange}
          disabled={loading}
          error={fieldErrors.cantidad}
        />
      </div>

      {/* Proveedor */}
      <div>
        <Label htmlFor="proveedor">Proveedor</Label>
        <Input
          id="proveedor"
          name="proveedor"
          type="text"
          placeholder="Ej: Distribuidora Nacional S.A."
          value={formData.proveedor}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      {/* Costo Unitario */}
      <div>
        <Label htmlFor="costoUnitario">Costo Unitario (₡)</Label>
        <Input
          id="costoUnitario"
          name="costoUnitario"
          type="number"
          step="0.01"
          min="0"
          placeholder="Ej: 1500.00"
          value={formData.costoUnitario}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      {/* Ubicación */}
      <div>
        <Label htmlFor="ubicacion">Ubicación en Bodega</Label>
        <Input
          id="ubicacion"
          name="ubicacion"
          type="text"
          placeholder="Ej: Estante A1"
          value={formData.ubicacion}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      {/* Documento de Referencia */}
      <div>
        <Label htmlFor="documentoReferencia">Documento de Referencia</Label>
        <Input
          id="documentoReferencia"
          name="documentoReferencia"
          type="text"
          placeholder="Ej: Factura #12345"
          value={formData.documentoReferencia}
          onChange={handleChange}
          disabled={loading}
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
        <Button type="submit" isLoading={loading} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Recepción'}
        </Button>
      </div>
    </form>
  );
}
