'use client';

/**
 * Formulario de Recepción - Journey 1
 * Maneja la creación de nuevas recepciones con validación
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  descripcionSIGAF: string;
  unidadMedida: string;
  stockTotal: number;
}

export function RecepcionForm() {
  // Estado del formulario
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Campos del formulario
  const [formData, setFormData] = useState({
    articuloId: '',
    cantidad: '',
    fechaVencimiento: '',
    numeroLote: '',
    proveedor: '',
    costoUnitario: '',
    ubicacion: '',
    documentoReferencia: '',
  });

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cargar artículos al montar
  useEffect(() => {
    fetchArticulos();
  }, []);

  const fetchArticulos = async () => {
    try {
      setLoadingArticulos(true);
      const response = await fetch('/api/articulos');
      const data = await response.json();

      if (data.success) {
        setArticulos(data.data);
      } else {
        setError('Error al cargar artículos');
      }
    } catch (err) {
      setError('Error de conexión al cargar artículos');
      console.error(err);
    } finally {
      setLoadingArticulos(false);
    }
  };

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

    if (!formData.cantidad || parseFloat(formData.cantidad) <= 0) {
      errors.cantidad = 'La cantidad debe ser mayor a 0';
    }

    if (!formData.fechaVencimiento) {
      errors.fechaVencimiento = 'La fecha de vencimiento es obligatoria';
    } else {
      const fechaVenc = new Date(formData.fechaVencimiento);
      if (fechaVenc <= new Date()) {
        errors.fechaVencimiento = 'La fecha debe ser futura';
      }
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
        fechaVencimiento: new Date(formData.fechaVencimiento).toISOString(),
        numeroLote: formData.numeroLote || undefined,
        proveedor: formData.proveedor || undefined,
        costoUnitario: formData.costoUnitario
          ? parseFloat(formData.costoUnitario)
          : undefined,
        ubicacion: formData.ubicacion || undefined,
        documentoReferencia: formData.documentoReferencia || undefined,
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
        fechaVencimiento: '',
        numeroLote: '',
        proveedor: '',
        costoUnitario: '',
        ubicacion: '',
        documentoReferencia: '',
      });

      // Scroll to top para ver mensaje de éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Recargar artículos para actualizar stock
      setTimeout(() => {
        fetchArticulos();
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al crear recepción'
      );
    } finally {
      setLoading(false);
    }
  };

  // Artículo seleccionado
  const articuloSeleccionado = articulos.find(
    (a) => a.id === formData.articuloId
  );

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
          disabled={loadingArticulos || loading}
          error={fieldErrors.articuloId}
        >
          <option value="">
            {loadingArticulos ? 'Cargando...' : 'Seleccione un artículo'}
          </option>
          {articulos.map((articulo) => (
            <option key={articulo.id} value={articulo.id}>
              {articulo.sku} - {articulo.nombre} (Stock: {articulo.stockTotal}{' '}
              {articulo.unidadMedida})
            </option>
          ))}
        </Select>
      </div>

      {/* Info del artículo seleccionado */}
      {articuloSeleccionado && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm font-medium text-blue-900">
            Descripción SIGAF:
          </p>
          <p className="text-sm text-blue-800">
            {articuloSeleccionado.descripcionSIGAF}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Unidad de medida: {articuloSeleccionado.unidadMedida}
          </p>
        </div>
      )}

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

      {/* Fecha de Vencimiento */}
      <div>
        <Label htmlFor="fechaVencimiento" required>
          Fecha de Vencimiento
        </Label>
        <Input
          id="fechaVencimiento"
          name="fechaVencimiento"
          type="date"
          value={formData.fechaVencimiento}
          onChange={handleChange}
          disabled={loading}
          error={fieldErrors.fechaVencimiento}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Número de Lote */}
      <div>
        <Label htmlFor="numeroLote">Número de Lote</Label>
        <Input
          id="numeroLote"
          name="numeroLote"
          type="text"
          placeholder="Ej: LOT-2025-001"
          value={formData.numeroLote}
          onChange={handleChange}
          disabled={loading}
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
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
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
