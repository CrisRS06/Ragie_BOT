'use client';

/**
 * Formulario de Artículo - Reutilizable para crear y editar
 * Simplificado: solo campos esenciales
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  codigoBarras?: string | null;
  unidadMedida: string;
  stockMinimo?: number | null;
  proveedorId?: string | null;
}

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
}

interface ArticuloFormProps {
  articulo?: Articulo | null;
  mode: 'create' | 'edit';
}

const UNIDADES_MEDIDA = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'KG', label: 'Kilogramo (kg)' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'METRO', label: 'Metro' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'BOLSA', label: 'Bolsa' },
  { value: 'ROLLO', label: 'Rollo' },
  { value: 'GALON', label: 'Galón' },
  { value: 'LIBRA', label: 'Libra' },
];

export function ArticuloForm({ articulo, mode }: ArticuloFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Proveedores para el dropdown
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(true);

  // Campos del formulario
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    codigoBarras: '',
    unidadMedida: 'UNIDAD',
    stockMinimo: '',
    proveedorId: '',
  });

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cargar proveedores al montar
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const response = await fetch('/api/proveedores');
        const data = await response.json();
        if (data.success) {
          setProveedores(data.data);
        }
      } catch (err) {
        console.error('Error al cargar proveedores:', err);
      } finally {
        setLoadingProveedores(false);
      }
    };
    fetchProveedores();
  }, []);

  // Cargar datos del artículo si es modo edición
  useEffect(() => {
    if (mode === 'edit' && articulo) {
      setFormData({
        sku: articulo.sku || '',
        nombre: articulo.nombre || '',
        codigoBarras: articulo.codigoBarras || '',
        unidadMedida: articulo.unidadMedida || 'UNIDAD',
        stockMinimo: articulo.stockMinimo?.toString() || '',
        proveedorId: articulo.proveedorId || '',
      });
    }
  }, [mode, articulo]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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

    if (!formData.sku || formData.sku.trim().length < 1) {
      errors.sku = 'El código interno es requerido';
    }

    if (!formData.nombre || formData.nombre.length < 3) {
      errors.nombre = 'Nombre debe tener al menos 3 caracteres';
    }

    if (!formData.unidadMedida) {
      errors.unidadMedida = 'Seleccione una unidad de medida';
    }

    const stockMin = formData.stockMinimo ? parseFloat(formData.stockMinimo) : null;
    if (stockMin !== null && stockMin < 0) {
      errors.stockMinimo = 'Stock mínimo no puede ser negativo';
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
      const payload = {
        sku: formData.sku.trim(),
        nombre: formData.nombre.trim(),
        codigoBarras: formData.codigoBarras?.trim() || null,
        unidadMedida: formData.unidadMedida,
        stockMinimo: formData.stockMinimo ? parseFloat(formData.stockMinimo) : null,
        proveedorId: formData.proveedorId || null,
      };

      const url = mode === 'create'
        ? '/api/articulos'
        : `/api/articulos/${articulo?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Error al ${mode === 'create' ? 'crear' : 'actualizar'} artículo`);
      }

      setSuccess(true);

      // Redirigir después de éxito
      setTimeout(() => {
        router.push('/admin/articulos');
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Error al ${mode === 'create' ? 'crear' : 'actualizar'} artículo`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensaje de éxito */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Artículo {mode === 'create' ? 'creado' : 'actualizado'} exitosamente
              </p>
              <p className="mt-1 text-sm text-green-700">
                Redirigiendo a la lista de artículos...
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
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sección: Información Básica */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código Interno */}
          <div>
            <Label htmlFor="sku" required>
              Código Interno
            </Label>
            <Input
              id="sku"
              name="sku"
              type="text"
              placeholder="Ej: 001, ABC-123"
              value={formData.sku}
              onChange={handleChange}
              disabled={loading || mode === 'edit'}
              error={fieldErrors.sku}
            />
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-gray-500">El código interno no se puede modificar</p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <Label htmlFor="nombre" required>
              Nombre del Artículo
            </Label>
            <Input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Ej: Leche en polvo"
              value={formData.nombre}
              onChange={handleChange}
              disabled={loading}
              error={fieldErrors.nombre}
            />
          </div>

          {/* Unidad de Medida */}
          <div>
            <Label htmlFor="unidadMedida" required>
              Unidad de Medida
            </Label>
            <Select
              id="unidadMedida"
              name="unidadMedida"
              value={formData.unidadMedida}
              onChange={handleChange}
              disabled={loading}
              error={fieldErrors.unidadMedida}
            >
              {UNIDADES_MEDIDA.map((um) => (
                <option key={um.value} value={um.value}>
                  {um.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Código de Barras */}
          <div>
            <Label htmlFor="codigoBarras">
              Código de Barras
            </Label>
            <Input
              id="codigoBarras"
              name="codigoBarras"
              type="text"
              placeholder="Ej: 7501234567890"
              value={formData.codigoBarras}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Sección: Proveedor y Stock */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Proveedor y Stock</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Proveedor */}
          <div>
            <Label htmlFor="proveedorId">Proveedor Asociado</Label>
            <Select
              id="proveedorId"
              name="proveedorId"
              value={formData.proveedorId}
              onChange={handleChange}
              disabled={loading || loadingProveedores}
            >
              <option value="">
                {loadingProveedores ? 'Cargando proveedores...' : 'Sin proveedor asignado'}
              </option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.nombre}
                </option>
              ))}
            </Select>
          </div>

          {/* Stock Mínimo */}
          <div>
            <Label htmlFor="stockMinimo">
              Stock Mínimo
            </Label>
            <Input
              id="stockMinimo"
              name="stockMinimo"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 10"
              value={formData.stockMinimo}
              onChange={handleChange}
              disabled={loading}
              error={fieldErrors.stockMinimo}
            />
            <p className="mt-1 text-xs text-gray-500">Genera alerta cuando el stock baja de este nivel</p>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/articulos')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" isLoading={loading} disabled={loading}>
          {loading
            ? 'Guardando...'
            : mode === 'create'
            ? 'Crear Artículo'
            : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
