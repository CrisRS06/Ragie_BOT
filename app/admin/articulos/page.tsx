'use client';

/**
 * Admin - Lista de Artículos
 * CRUD completo con búsqueda y filtros
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Package, AlertCircle, Upload } from 'lucide-react';
import { ImportArticulosModal } from '@/components/articulos/ImportArticulosModal';
import { useAdminAccess } from '@/hooks/useRoleAccess';
import { AccessDenied } from '@/components/ui/access-denied';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  descripcionSIGAF: string;
  unidadMedida: string;
  stockMinimo: number | null;
  stockMaximo: number | null;
  stockTotal: number;
  lotesActivos: number;
  activo: boolean;
}

export default function AdminArticulosPage() {
  const { hasAccess, loading: accessLoading, error: accessError } = useAdminAccess();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    if (hasAccess) {
      fetchArticulos();
    }
  }, [hasAccess]);

  // Mostrar loading mientras se verifica acceso
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Mostrar acceso denegado si no tiene permisos
  if (!hasAccess) {
    return <AccessDenied message={accessError || 'No tiene permisos para acceder a la administración de artículos.'} />;
  }

  const fetchArticulos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/articulos');
      const data = await response.json();

      if (data.success) {
        setArticulos(data.data);
      } else {
        setError('Error al cargar artículos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/articulos/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setArticulos(articulos.filter((a) => a.id !== id));
        setDeleteConfirm(null);
      } else {
        alert(data.error || 'Error al desactivar artículo');
      }
    } catch (err) {
      alert('Error de conexión');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtrar artículos por búsqueda
  const filteredArticulos = articulos.filter(
    (a) =>
      a.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.descripcionSIGAF.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando artículos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Administración de Artículos
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestione el catálogo de artículos del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Link href="/admin/articulos/nuevo">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Artículo
              </Button>
            </Link>
          </div>
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
                placeholder="Buscar por SKU, nombre o descripción SIGAF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-gray-500">
              {filteredArticulos.length} artículo(s)
            </span>
          </div>
        </Card>

        {/* Lista de artículos */}
        {filteredArticulos.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron artículos' : 'Sin artículos'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Intente con otros términos de búsqueda'
                : 'Comience creando su primer artículo'}
            </p>
            {!searchTerm && (
              <Link href="/admin/articulos/nuevo">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Artículo
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lotes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredArticulos.map((articulo) => {
                  const stockBajo =
                    articulo.stockMinimo !== null &&
                    articulo.stockTotal < articulo.stockMinimo;

                  return (
                    <tr key={articulo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {articulo.nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {articulo.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {articulo.unidadMedida}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            stockBajo ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {articulo.stockTotal}
                        </div>
                        {articulo.stockMinimo !== null && (
                          <div className="text-xs text-gray-500">
                            Mín: {articulo.stockMinimo}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {articulo.lotesActivos} activo(s)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stockBajo ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/articulos/${articulo.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          {deleteConfirm === articulo.id ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(articulo.id)}
                                disabled={deleting}
                              >
                                {deleting ? '...' : 'Sí'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(articulo.id)}
                              disabled={articulo.stockTotal > 0}
                              title={
                                articulo.stockTotal > 0
                                  ? 'No se puede desactivar con stock'
                                  : 'Desactivar artículo'
                              }
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de Importación */}
        <ImportArticulosModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => fetchArticulos()}
        />
      </div>
    </div>
  );
}
