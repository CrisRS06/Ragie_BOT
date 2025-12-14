'use client';

/**
 * Admin - Editar Proveedor
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditarProveedorPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProveedor();
  }, [resolvedParams.id]);

  const fetchProveedor = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proveedores/${resolvedParams.id}`);
      const data = await response.json();

      if (data.success) {
        setProveedor(data.data);
        setFormData({
          nombre: data.data.nombre || '',
          ruc: data.data.ruc || '',
          direccion: data.data.direccion || '',
          telefono: data.data.telefono || '',
          email: data.data.email || '',
          contacto: data.data.contacto || '',
        });
      } else {
        setError(data.error || 'Proveedor no encontrado');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre || formData.nombre.length < 3) {
      errors.nombre = 'Nombre debe tener al menos 3 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/proveedores/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar proveedor');
      }

      router.push('/admin/proveedores');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar proveedor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando proveedor...</p>
        </div>
      </div>
    );
  }

  if (error && !proveedor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/admin/proveedores"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Proveedores
          </Link>

          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/proveedores"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Proveedores
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Proveedor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Modificar información de{' '}
            <span className="font-medium">{proveedor?.codigo}</span>
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Card className="p-6 space-y-6">
            {/* Código (no editable) */}
            <div className="max-w-xs">
              <Label>Código</Label>
              <Input
                value={proveedor?.codigo || ''}
                disabled
                className="bg-gray-100 dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500">El código no se puede modificar</p>
            </div>

            {/* Nombre */}
            <div>
              <Label htmlFor="nombre" required>Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Nombre del proveedor"
                value={formData.nombre}
                onChange={handleChange}
                disabled={saving}
                error={fieldErrors.nombre}
              />
            </div>

            {/* RUC */}
            <div className="max-w-xs">
              <Label htmlFor="ruc">RUC / Cédula Jurídica</Label>
              <Input
                id="ruc"
                name="ruc"
                placeholder="Ej: 3-101-123456"
                value={formData.ruc}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            {/* Dirección */}
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <textarea
                id="direccion"
                name="direccion"
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Dirección física del proveedor"
                value={formData.direccion}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  placeholder="Ej: 2222-2222"
                  value={formData.telefono}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@proveedor.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={saving}
                  error={fieldErrors.email}
                />
              </div>
            </div>

            {/* Persona de contacto */}
            <div>
              <Label htmlFor="contacto">Persona de Contacto</Label>
              <Input
                id="contacto"
                name="contacto"
                placeholder="Nombre de la persona de contacto"
                value={formData.contacto}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
          </Card>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/proveedores')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
