'use client';

/**
 * Admin - Lista de Usuarios
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertDialog } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Users, AlertCircle, Mail, Shield } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useRoleAccess';
import { AccessDenied } from '@/components/ui/access-denied';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
}

const rolLabels: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  OPERADOR: 'Operador Bodega',
  AUDITOR: 'Auditor',
  // Legacy fallbacks
  ADMINISTRADOR_CONTRATISTA: 'Administrador',
  OPERADOR_BODEGA: 'Operador Bodega',
  FISCALIZADOR_EXTERNO: 'Fiscalizador Externo',
};

const rolColors: Record<string, string> = {
  ADMINISTRADOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OPERADOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  AUDITOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  // Legacy fallbacks
  ADMINISTRADOR_CONTRATISTA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OPERADOR_BODEGA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  FISCALIZADOR_EXTERNO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function AdminUsuariosPage() {
  const { hasAccess, loading: accessLoading, error: accessError } = useAdminAccess();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (hasAccess) {
      fetchUsuarios();
    }
  }, [hasAccess]);

  // Mostrar loading mientras se verifica acceso
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Mostrar acceso denegado si no tiene permisos
  if (!hasAccess) {
    return <AccessDenied message={accessError || 'No tiene permisos para acceder a la administración de usuarios.'} />;
  }

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usuarios');
      const data = await response.json();

      if (data.success) {
        setUsuarios(data.data);
      } else {
        setError('Error al cargar usuarios');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/usuarios/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setUsuarios(usuarios.filter((u) => u.id !== deleteConfirm.id));
        setDeleteConfirm(null);
      } else {
        alert(data.error || 'Error al desactivar usuario');
      }
    } catch (err) {
      alert('Error de conexión');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtrar usuarios por búsqueda
  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Administración de Usuarios
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Gestione los usuarios del sistema
            </p>
          </div>
          <Link href="/admin/usuarios/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Barra de búsqueda */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredUsuarios.length} usuario(s)
            </span>
          </div>
        </Card>

        {/* Lista de usuarios */}
        {filteredUsuarios.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron usuarios' : 'Sin usuarios'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? 'Intente con otros términos de búsqueda'
                : 'Comience agregando el primer usuario'}
            </p>
          </Card>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                            {usuario.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {usuario.nombre}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {usuario.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rolColors[usuario.rol] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {rolLabels[usuario.rol] || usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {usuario.ultimoAcceso
                        ? new Date(usuario.ultimoAcceso).toLocaleDateString('es-CR')
                        : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/usuarios/${usuario.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(usuario)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dialog de confirmación */}
        <AlertDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Desactivar Usuario"
          description={`¿Está seguro que desea desactivar al usuario "${deleteConfirm?.nombre}"?`}
          confirmText="Desactivar"
          cancelText="Cancelar"
          variant="danger"
          loading={deleting}
        />
      </div>
    </div>
  );
}
