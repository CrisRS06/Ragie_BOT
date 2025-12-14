'use client';

/**
 * Página: Nuevo Corte de Existencias
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function NuevoCortePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    corteId: string;
    hashSnapshot: string;
    totalArticulos: number;
    totalLotes: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    tipo: 'BAJO_DEMANDA',
    motivo: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.motivo || formData.motivo.trim().length < 10) {
      errors.motivo = 'El motivo debe tener al menos 10 caracteres';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cortes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear corte');
      }

      setSuccess({
        corteId: data.corte.id,
        hashSnapshot: data.corte.hashSnapshot,
        totalArticulos: data.totalArticulos,
        totalLotes: data.totalLotes,
      });

      setFormData({
        tipo: 'BAJO_DEMANDA',
        motivo: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear corte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/cortes" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Volver a cortes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Corte de Existencias</h1>
        <p className="text-gray-600 mt-1">
          Genera un snapshot inmutable del inventario actual con hash de verificación
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">¿Qué es un corte de existencias?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Captura el estado exacto del inventario en un momento dado</li>
                <li>Genera un hash SHA-256 único para verificar integridad</li>
                <li>No se puede modificar una vez creado (inmutable)</li>
                <li>Se puede exportar a CSV para auditoría externa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
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
              <p className="text-sm font-medium text-green-800">Corte creado exitosamente</p>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>Artículos:</strong> {success.totalArticulos}</p>
                <p><strong>Lotes:</strong> {success.totalLotes}</p>
                <p className="mt-2"><strong>Hash de verificación:</strong></p>
                <code className="block mt-1 bg-green-100 px-2 py-1 rounded font-mono text-xs break-all">
                  {success.hashSnapshot}
                </code>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/cortes/${success.corteId}`}>
                  <Button size="sm" variant="outline">Ver Detalle</Button>
                </Link>
                <a href={`/api/cortes/${success.corteId}/csv`} download>
                  <Button size="sm" variant="outline">Descargar CSV</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Corte</CardTitle>
          <CardDescription>
            Complete los datos para generar el corte de existencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo */}
            <div>
              <Label htmlFor="tipo">Tipo de Corte</Label>
              <Select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="BAJO_DEMANDA">Bajo Demanda</option>
                <option value="COMPRA_SEGUN_DEMANDA">Compra Según Demanda</option>
              </Select>
              <p className="mt-1 text-xs text-gray-500">
                Los cortes mensuales automáticos se generan el día 1 de cada mes
              </p>
            </div>

            {/* Motivo */}
            <div>
              <Label htmlFor="motivo" required>Motivo del Corte</Label>
              <textarea
                id="motivo"
                name="motivo"
                rows={4}
                placeholder="Describa el motivo por el cual se solicita este corte de existencias (mínimo 10 caracteres)..."
                value={formData.motivo}
                onChange={handleChange}
                disabled={loading}
                className={`flex w-full rounded-md border ${
                  fieldErrors.motivo ? 'border-red-500' : 'border-gray-300'
                } bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {fieldErrors.motivo && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.motivo}</p>
              )}
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Link href="/cortes">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" isLoading={loading} disabled={loading}>
                {loading ? 'Generando...' : 'Generar Corte'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
