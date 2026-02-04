'use client';

/**
 * Admin - Catálogo de Códigos SIGAF
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Upload, AlertCircle, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';

interface CodigoSigaf {
  id: string;
  codigo: string;
  descripcion: string;
  partida: string | null;
  precio_unitario: number | null;
  iva_percent: number | null;
  clasificacion: string | null;
  contratacion: string | null;
  contratista: string | null;
  activo: boolean;
}

export default function AdminCatalogoSigafPage() {
  const [codigos, setCodigos] = useState<CodigoSigaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limite = 20;

  useEffect(() => {
    fetchCodigos();
  }, [offset]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      fetchCodigos();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCodigos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limite: String(limite),
        offset: String(offset),
      });
      if (searchTerm.length >= 2) {
        params.set('q', searchTerm);
      }

      const response = await fetch(`/api/catalogo-sigaf?${params}`);
      const data = await response.json();

      if (data.success) {
        setCodigos(data.items || []);
        setTotal(data.total || 0);
      } else {
        setError('Error al cargar catálogo');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limite);
  const currentPage = Math.floor(offset / limite) + 1;

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(offset - limite);
    }
  };

  const handleNextPage = () => {
    if (offset + limite < total) {
      setOffset(offset + limite);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(value);
  };

  if (loading && codigos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando catálogo SIGAF...</p>
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
              Catálogo SIGAF
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Sistema Integrado de Gestión de la Administración Financiera
            </p>
          </div>
          <Link href="/admin/catalogo-sigaf/importar">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Importar Excel
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
                placeholder="Buscar por código o descripción (mínimo 2 caracteres)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {total} código(s)
            </span>
          </div>
        </Card>

        {/* Lista de códigos */}
        {codigos.length === 0 ? (
          <Card className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron códigos' : 'Catálogo vacío'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? 'Intente con otros términos de búsqueda'
                : 'Importe códigos SIGAF desde un archivo Excel'}
            </p>
            {!searchTerm && (
              <Link href="/admin/catalogo-sigaf/importar">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Excel
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <>
            {/* Tabla de códigos */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Código
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Partida
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Precio Unit.
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contratista
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {codigos.map((codigo) => (
                      <tr key={codigo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                            {codigo.codigo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                            {codigo.descripcion}
                          </p>
                          {codigo.clasificacion && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {codigo.clasificacion}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {codigo.partida || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatCurrency(codigo.precio_unitario)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-xs">
                            {codigo.contratista || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {offset + 1} - {Math.min(offset + limite, total)} de {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={offset === 0 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={offset + limite >= total || loading}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
