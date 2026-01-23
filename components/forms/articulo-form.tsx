'use client';

/**
 * Formulario de Artículo - Reutilizable para crear y editar
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
  descripcion?: string | null;
  descripcionSIGAF: string;
  codigoSIGAF?: string | null;
  // FASE 1: Campos adicionales PANI
  codigoBarras?: string | null;
  marca?: string | null;
  ivaPercent?: number;
  observaciones?: string | null;
  unidadMedida: string;
  stockMinimo?: number | null;
  stockMaximo?: number | null;
  requiereVencimiento: boolean;
  // FASE 2: Campos adicionales Bodega en Custodia
  codigoPANI?: string | null;
  codigoSICOP?: string | null;
  codigoSICOPL?: string | null;
  categoria?: string | null;
  precio?: number | null;
  costoReferencia?: number | null;
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

const CATEGORIAS = [
  { value: '', label: 'Seleccione una categoría' },
  { value: 'ARROZ', label: 'Arroz' },
  { value: 'GRANOS', label: 'Granos y Legumbres' },
  { value: 'ENLATADOS', label: 'Enlatados' },
  { value: 'LACTEOS', label: 'Lácteos' },
  { value: 'CEREALES', label: 'Cereales' },
  { value: 'HARINAS', label: 'Harinas' },
  { value: 'ACEITES', label: 'Aceites y Grasas' },
  { value: 'CONDIMENTOS', label: 'Condimentos y Especias' },
  { value: 'BEBIDAS', label: 'Bebidas' },
  { value: 'CARNES', label: 'Carnes y Embutidos' },
  { value: 'LIMPIEZA', label: 'Productos de Limpieza' },
  { value: 'HIGIENE', label: 'Higiene Personal' },
  { value: 'DESECHABLES', label: 'Desechables' },
  { value: 'OTROS', label: 'Otros' },
];

export function ArticuloForm({ articulo, mode }: ArticuloFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Campos del formulario
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    descripcionSIGAF: '',
    codigoSIGAF: '',
    // FASE 1: Campos adicionales PANI
    codigoBarras: '',
    marca: '',
    ivaPercent: '0.13',
    observaciones: '',
    unidadMedida: 'UNIDAD',
    stockMinimo: '',
    stockMaximo: '',
    requiereVencimiento: true,
    // FASE 2: Campos adicionales Bodega en Custodia
    codigoPANI: '',
    codigoSICOP: '',
    codigoSICOPL: '',
    categoria: '',
    precio: '',
    costoReferencia: '',
  });

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cargar datos del artículo si es modo edición
  useEffect(() => {
    if (mode === 'edit' && articulo) {
      setFormData({
        sku: articulo.sku || '',
        nombre: articulo.nombre || '',
        descripcion: articulo.descripcion || '',
        descripcionSIGAF: articulo.descripcionSIGAF || '',
        codigoSIGAF: articulo.codigoSIGAF || '',
        // FASE 1: Campos adicionales PANI
        codigoBarras: articulo.codigoBarras || '',
        marca: articulo.marca || '',
        ivaPercent: articulo.ivaPercent?.toString() || '0.13',
        observaciones: articulo.observaciones || '',
        unidadMedida: articulo.unidadMedida || 'UNIDAD',
        stockMinimo: articulo.stockMinimo?.toString() || '',
        stockMaximo: articulo.stockMaximo?.toString() || '',
        requiereVencimiento: articulo.requiereVencimiento ?? true,
        // FASE 2: Campos adicionales Bodega en Custodia
        codigoPANI: articulo.codigoPANI || '',
        codigoSICOP: articulo.codigoSICOP || '',
        codigoSICOPL: articulo.codigoSICOPL || '',
        categoria: articulo.categoria || '',
        precio: articulo.precio?.toString() || '',
        costoReferencia: articulo.costoReferencia?.toString() || '',
      });
    }
  }, [mode, articulo]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Limpiar error del campo al escribir
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.sku || formData.sku.length < 3) {
      errors.sku = 'SKU debe tener al menos 3 caracteres';
    }

    if (!formData.nombre || formData.nombre.length < 3) {
      errors.nombre = 'Nombre debe tener al menos 3 caracteres';
    }

    if (!formData.descripcionSIGAF || formData.descripcionSIGAF.length < 10) {
      errors.descripcionSIGAF = 'Descripción SIGAF debe tener al menos 10 caracteres';
    }

    if (!formData.unidadMedida) {
      errors.unidadMedida = 'Seleccione una unidad de medida';
    }

    // Validar stockMinimo y stockMaximo
    const stockMin = formData.stockMinimo ? parseFloat(formData.stockMinimo) : null;
    const stockMax = formData.stockMaximo ? parseFloat(formData.stockMaximo) : null;

    if (stockMin !== null && stockMin < 0) {
      errors.stockMinimo = 'Stock mínimo no puede ser negativo';
    }

    if (stockMax !== null && stockMax < 0) {
      errors.stockMaximo = 'Stock máximo no puede ser negativo';
    }

    if (stockMin !== null && stockMax !== null && stockMax < stockMin) {
      errors.stockMaximo = 'Stock máximo debe ser mayor o igual al mínimo';
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
        descripcion: formData.descripcion?.trim() || null,
        descripcionSIGAF: formData.descripcionSIGAF.trim(),
        codigoSIGAF: formData.codigoSIGAF?.trim() || null,
        // FASE 1: Campos adicionales PANI
        codigoBarras: formData.codigoBarras?.trim() || null,
        marca: formData.marca?.trim() || null,
        ivaPercent: formData.ivaPercent ? parseFloat(formData.ivaPercent) : 0.13,
        observaciones: formData.observaciones?.trim() || null,
        unidadMedida: formData.unidadMedida,
        stockMinimo: formData.stockMinimo ? parseFloat(formData.stockMinimo) : null,
        stockMaximo: formData.stockMaximo ? parseFloat(formData.stockMaximo) : null,
        requiereVencimiento: formData.requiereVencimiento,
        // FASE 2: Campos adicionales Bodega en Custodia
        codigoPANI: formData.codigoPANI?.trim() || null,
        codigoSICOP: formData.codigoSICOP?.trim() || null,
        codigoSICOPL: formData.codigoSICOPL?.trim() || null,
        categoria: formData.categoria?.trim() || null,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        costoReferencia: formData.costoReferencia ? parseFloat(formData.costoReferencia) : null,
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
          {/* SKU */}
          <div>
            <Label htmlFor="sku" required>
              SKU (Código Interno)
            </Label>
            <Input
              id="sku"
              name="sku"
              type="text"
              placeholder="Ej: ART-001"
              value={formData.sku}
              onChange={handleChange}
              disabled={loading || mode === 'edit'}
              error={fieldErrors.sku}
            />
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-gray-500">El SKU no se puede modificar</p>
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
        </div>

        {/* Descripción opcional */}
        <div className="mt-4">
          <Label htmlFor="descripcion">
            Descripción (Opcional)
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="Descripción adicional del artículo..."
            value={formData.descripcion}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>

      {/* Sección: Información SIGAF */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información SIGAF</h3>

        <div className="space-y-4">
          {/* Descripción SIGAF */}
          <div>
            <Label htmlFor="descripcionSIGAF" required>
              Descripción SIGAF
            </Label>
            <textarea
              id="descripcionSIGAF"
              name="descripcionSIGAF"
              rows={3}
              className={`mt-1 block w-full rounded-md shadow-sm text-sm ${
                fieldErrors.descripcionSIGAF
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Texto exacto según catálogo SIGAF..."
              value={formData.descripcionSIGAF}
              onChange={handleChange}
              disabled={loading}
            />
            {fieldErrors.descripcionSIGAF && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.descripcionSIGAF}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Esta descripción debe coincidir exactamente con el catálogo SIGAF
            </p>
          </div>

          {/* Código SIGAF */}
          <div className="max-w-xs">
            <Label htmlFor="codigoSIGAF">
              Código SIGAF (Opcional)
            </Label>
            <Input
              id="codigoSIGAF"
              name="codigoSIGAF"
              type="text"
              placeholder="Ej: SIGAF-12345"
              value={formData.codigoSIGAF}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Sección: Información Adicional PANI */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="mt-1 text-xs text-gray-500">Para escaneo de productos</p>
          </div>

          {/* Marca */}
          <div>
            <Label htmlFor="marca">
              Marca
            </Label>
            <Input
              id="marca"
              name="marca"
              type="text"
              placeholder="Ej: Dos Pinos"
              value={formData.marca}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* IVA */}
          <div>
            <Label htmlFor="ivaPercent">
              Porcentaje IVA
            </Label>
            <Select
              id="ivaPercent"
              name="ivaPercent"
              value={formData.ivaPercent}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="0.13">13% (Gravado)</option>
              <option value="0">0% (Exento)</option>
            </Select>
            <p className="mt-1 text-xs text-gray-500">Para valorización de inventario</p>
          </div>
        </div>

        {/* Observaciones del artículo */}
        <div className="mt-4">
          <Label htmlFor="observaciones">
            Observaciones
          </Label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="Notas adicionales sobre el artículo..."
            value={formData.observaciones}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>

      {/* Sección: Códigos Gubernamentales */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Códigos Gubernamentales</h3>
        <p className="text-sm text-gray-500 mb-4">
          Códigos de identificación para sistemas gubernamentales de Costa Rica
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Código PANI */}
          <div>
            <Label htmlFor="codigoPANI">
              Código PANI
            </Label>
            <Input
              id="codigoPANI"
              name="codigoPANI"
              type="text"
              placeholder="Ej: PANI-001"
              value={formData.codigoPANI}
              onChange={handleChange}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">Patronato Nacional de la Infancia</p>
          </div>

          {/* Código SICOP */}
          <div>
            <Label htmlFor="codigoSICOP">
              Código SICOP
            </Label>
            <Input
              id="codigoSICOP"
              name="codigoSICOP"
              type="text"
              placeholder="Ej: SICOP-12345"
              value={formData.codigoSICOP}
              onChange={handleChange}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">Sistema Integrado de Compras Públicas</p>
          </div>

          {/* Código SICOPL */}
          <div>
            <Label htmlFor="codigoSICOPL">
              Código SICOPL
            </Label>
            <Input
              id="codigoSICOPL"
              name="codigoSICOPL"
              type="text"
              placeholder="Ej: SICOPL-001"
              value={formData.codigoSICOPL}
              onChange={handleChange}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">Código SICOP alternativo (si aplica)</p>
          </div>
        </div>
      </div>

      {/* Sección: Información Comercial */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Comercial</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Categoría / Familia */}
          <div>
            <Label htmlFor="categoria">
              Categoría / Familia
            </Label>
            <Select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              disabled={loading}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-gray-500">Familia del producto para clasificación</p>
          </div>

          {/* Precio */}
          <div>
            <Label htmlFor="precio">
              Precio de Venta
            </Label>
            <Input
              id="precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 1500.00"
              value={formData.precio}
              onChange={handleChange}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">Precio de venta en colones</p>
          </div>

          {/* Costo de Referencia */}
          <div>
            <Label htmlFor="costoReferencia">
              Costo de Referencia
            </Label>
            <Input
              id="costoReferencia"
              name="costoReferencia"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 1200.00"
              value={formData.costoReferencia}
              onChange={handleChange}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">Costo base del artículo en colones</p>
          </div>
        </div>
      </div>

      {/* Sección: Control de Inventario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Control de Inventario</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Stock Máximo */}
          <div>
            <Label htmlFor="stockMaximo">
              Stock Máximo
            </Label>
            <Input
              id="stockMaximo"
              name="stockMaximo"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 100"
              value={formData.stockMaximo}
              onChange={handleChange}
              disabled={loading}
              error={fieldErrors.stockMaximo}
            />
            <p className="mt-1 text-xs text-gray-500">Nivel máximo recomendado de inventario</p>
          </div>
        </div>

        {/* Requiere Vencimiento */}
        <div className="mt-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="requiereVencimiento"
              checked={formData.requiereVencimiento}
              onChange={handleChange}
              disabled={loading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Este artículo requiere control de fecha de vencimiento
            </span>
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
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
