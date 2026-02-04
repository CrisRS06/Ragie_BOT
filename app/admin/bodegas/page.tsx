'use client';

/**
 * Admin - Lista de Bodegas
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertDialog } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Warehouse, AlertCircle, Phone, User } from 'lucide-react';

interface Bodega {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  responsable: string | null;
  activo: boolean;
}

export default function AdminBodegasPage() {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Bodega | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBodegas();
  }, []);

  const fetchBodegas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bodegas?includeInactive=true');
      const data = await response.json();

      if (data.success) {
        setBodegas(data.bodegas || data.data);
      } else {
        setError('Error al cargar bodegas');
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
      const response = await fetch(`/api/bodegas/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setBodegas(bodegas.map((b) =>
          b.id === deleteConfirm.id ? { ...b, activo: false } : b
        ));
        setDeleteConfirm(null);
      } else {
        alert(data.error || 'Error al desactivar bodega');
      }
    } catch (err) {
      alert('Error de conexión');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtrar bodegas por búsqueda
  const filteredBodegas = bodegas.filter(
    (b) =>
      b.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando bodegas...</p>
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
              Bodegas
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Gestione las bodegas del sistema de inventario
            </p>
          </div>
          <Link href="/admin/bodegas/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Bodega
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
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredBodegas.length} bodega(s)
            </span>
          </div>
        </Card>

        {/* Lista de bodegas */}
        {filteredBodegas.length === 0 ? (
          <Card className="p-12 text-center">
            <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron bodegas' : 'Sin bodegas'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? 'Intente con otros términos de búsqueda'
                : 'Comience agregando la primera bodega'}
            </p>
            {!searchTerm && (
              <Link href="/admin/bodegas/nuevo">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Bodega
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBodegas.map((bodega) => (
              <Card key={bodega.id} className={`p-4 ${!bodega.activo ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Warehouse className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {bodega.nombre}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({bodega.codigo})
                        </span>
                        {!bodega.activo && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                            Inactiva
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {bodega.direccion && (
                          <span className="flex items-center gap-1">
                            <Warehouse className="h-3 w-3" />
                            {bodega.direccion}
                          </span>
                        )}
                        {bodega.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {bodega.telefono}
                          </span>
                        )}
                        {bodega.responsable && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {bodega.responsable}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/bodegas/${bodega.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    {bodega.activo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(bodega)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de confirmación */}
        <AlertDialog
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Desactivar Bodega"
          description={`¿Está seguro que desea desactivar "${deleteConfirm?.nombre}"? Esta acción no eliminará los datos históricos.`}
          confirmText="Desactivar"
          cancelText="Cancelar"
          variant="danger"
          loading={deleting}
        />
      </div>
    </div>
  );
}
