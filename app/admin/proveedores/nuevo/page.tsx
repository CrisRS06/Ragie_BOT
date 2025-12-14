'use client';

/**
 * Admin - Crear Nuevo Proveedor
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function NuevoProveedorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.codigo || formData.codigo.length < 2) {
      errors.codigo = 'Código debe tener al menos 2 caracteres';
    }

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

    setLoading(true);

    try {
      const response = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear proveedor');
      }

      router.push('/admin/proveedores');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proveedor');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Proveedor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Complete la información del nuevo proveedor
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
            {/* Código y Nombre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo" required>Código</Label>
                <Input
                  id="codigo"
                  name="codigo"
                  placeholder="Ej: PROV-001"
                  value={formData.codigo}
                  onChange={handleChange}
                  disabled={loading}
                  error={fieldErrors.codigo}
                />
              </div>
              <div>
                <Label htmlFor="nombre" required>Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="Nombre del proveedor"
                  value={formData.nombre}
                  onChange={handleChange}
                  disabled={loading}
                  error={fieldErrors.nombre}
                />
              </div>
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
                disabled={loading}
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
                disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                disabled={loading}
              />
            </div>
          </Card>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/proveedores')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading} disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Proveedor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
