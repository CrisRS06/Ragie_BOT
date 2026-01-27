'use client';

/**
 * Historial de Recepciones (Entradas)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, Calendar, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface Recepcion {
  id: string;
  cantidad: number;
  timestamp: string;
  anulado: boolean;
  articulo: {
    sku: string;
    nombre: string;
    unidadMedida: string;
  };
  lote: {
    id: string;
    codigoLote: string | null;
    numeroLote: string | null;
    cantidadInicial: number;
    cantidadDisponible: number;
    fechaVencimiento: string;
    proveedor: string | null;
  } | null;
  usuario: {
    nombre: string;
  } | null;
}

export default function RecepcionesPage() {
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limite = 15;

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const fetchRecepciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limite: limite.toString(),
        offset: (page * limite).toString(),
      });

      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);

      const response = await fetch(`/api/recepciones?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecepciones(data.data);
        setTotal(data.total);
      } else {
        setError(data.error || 'Error al cargar recepciones');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecepciones();
  }, [page, fechaDesde, fechaHasta]);

  const handleBuscar = () => {
    setPage(0);
    fetchRecepciones();
  };

  const handleLimpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setBusqueda('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / limite);

  // Filtrar por búsqueda local
  const recepcionesFiltradas = busqueda
    ? recepciones.filter(
        (r) =>
          r.articulo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          r.articulo.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
          r.lote?.proveedor?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : recepciones;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Historial de Recepciones
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Registro de entradas de mercancía al inventario
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/recepciones/nueva-multi">
              <Button variant="outline" className="w-full sm:w-auto">
                <Layers className="w-4 h-4 mr-2" />
                Multi-Producto
              </Button>
            </Link>
            <Link href="/recepciones/nueva">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Recepción
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-auto flex-1">
              <Label htmlFor="busqueda">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  type="text"
                  placeholder="Artículo, SKU o proveedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="fechaDesde">Desde</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaDesde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="fechaHasta">Hasta</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaHasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBuscar} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
              <Button variant="outline" onClick={handleLimpiarFiltros}>
                Limpiar
              </Button>
            </div>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de recepciones */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Artículo
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Lote
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando...</p>
                    </td>
                  </tr>
                ) : recepcionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No se encontraron recepciones</p>
                    </td>
                  </tr>
                ) : (
                  recepcionesFiltradas.map((recepcion) => (
                    <tr key={recepcion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(recepcion.timestamp).toLocaleDateString('es-CR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {recepcion.articulo.nombre}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {recepcion.articulo.sku}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          +{recepcion.cantidad} {recepcion.articulo.unidadMedida}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {recepcion.lote?.codigoLote || recepcion.lote?.numeroLote || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {recepcion.lote?.proveedor || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                        {recepcion.lote?.fechaVencimiento ? (
                          <span className={
                            new Date(recepcion.lote.fechaVencimiento) < new Date()
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }>
                            {new Date(recepcion.lote.fechaVencimiento).toLocaleDateString('es-CR')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {recepcion.usuario?.nombre || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {page * limite + 1} a {Math.min((page + 1) * limite, total)} de {total} resultados
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1 || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
