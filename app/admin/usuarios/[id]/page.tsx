'use client';

/**
 * Admin - Editar Usuario
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const ROLES = [
  { value: 'ADMINISTRADOR_CONTRATISTA', label: 'Administrador Contratista' },
  { value: 'OPERADOR_BODEGA', label: 'Operador de Bodega' },
  { value: 'FISCALIZADOR_EXTERNO', label: 'Fiscalizador Externo' },
  { value: 'AUDITOR', label: 'Auditor' },
];

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditarUsuarioPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    rol: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsuario();
  }, [resolvedParams.id]);

  const fetchUsuario = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/usuarios/${resolvedParams.id}`);
      const data = await response.json();

      if (data.success) {
        setUsuario(data.data);
        setFormData({
          nombre: data.data.nombre || '',
          rol: data.data.rol || '',
          password: '',
          confirmPassword: '',
        });
      } else {
        setError(data.error || 'Usuario no encontrado');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (formData.password && formData.password.length < 8) {
      errors.password = 'Contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
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
      const payload: Record<string, string> = {
        nombre: formData.nombre,
        rol: formData.rol,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(`/api/usuarios/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar usuario');
      }

      router.push('/admin/usuarios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (error && !usuario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/admin/usuarios"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Usuarios
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
            href="/admin/usuarios"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Usuarios
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Usuario</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Modificar información de <span className="font-medium">{usuario?.email}</span>
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
            {/* Email (no editable) */}
            <div>
              <Label>Email</Label>
              <Input
                value={usuario?.email || ''}
                disabled
                className="bg-gray-100 dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500">El email no se puede modificar</p>
            </div>

            {/* Nombre */}
            <div>
              <Label htmlFor="nombre" required>Nombre Completo</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Nombre del usuario"
                value={formData.nombre}
                onChange={handleChange}
                disabled={saving}
                error={fieldErrors.nombre}
              />
            </div>

            {/* Rol */}
            <div>
              <Label htmlFor="rol" required>Rol</Label>
              <Select
                id="rol"
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                disabled={saving}
              >
                {ROLES.map((rol) => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Cambiar Contraseña (opcional) */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Cambiar Contraseña (opcional)
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Dejar vacío para no cambiar"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={saving}
                      error={fieldErrors.password}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {formData.password && (
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita la nueva contraseña"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={saving}
                      error={fieldErrors.confirmPassword}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/usuarios')}
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
