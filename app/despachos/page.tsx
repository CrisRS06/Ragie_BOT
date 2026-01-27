'use client';

/**
 * Historial de Despachos (Salidas)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Truck, Calendar, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertDialog } from '@/components/ui/dialog';

interface Despacho {
  id: string;
  cantidad: number;
  timestamp: string;
  anulado: boolean;
  motivoAnulacion?: string;
  receptorNombre: string | null;
  receptorCedula: string | null;
  articulo: {
    sku: string;
    nombre: string;
    unidadMedida: string;
  };
  lote: {
    numeroLote: string | null;
    fechaVencimiento: string;
  } | null;
  unidadReceptora: {
    codigo: string;
    nombre: string;
  } | null;
}

export default function DespachosPage() {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limite = 15;

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Anulación
  const [anulando, setAnulando] = useState(false);
  const [despachoAnular, setDespachoAnular] = useState<Despacho | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const fetchDespachos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limite: limite.toString(),
        offset: (page * limite).toString(),
      });

      // Agregar filtros de fecha si están definidos
      if (fechaDesde) {
        params.set('fechaDesde', fechaDesde);
      }
      if (fechaHasta) {
        params.set('fechaHasta', fechaHasta);
      }

      const response = await fetch(`/api/despachos?${params}`);
      const data = await response.json();

      if (data.despachos) {
        setDespachos(data.despachos);
        setTotal(data.total);
      } else {
        setError(data.error || 'Error al cargar despachos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDespachos();
  }, [page, fechaDesde, fechaHasta]);

  const handleBuscar = () => {
    setPage(0);
    // No need to call fetchDespachos() - useEffect will trigger it
  };

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    // Setting dates will trigger useEffect and refetch
    setFechaDesde('');
    setFechaHasta('');
    setPage(0);
  };

  const handleAnular = async () => {
    if (!despachoAnular || !motivoAnulacion.trim()) return;

    try {
      setAnulando(true);
      const response = await fetch(`/api/despachos/${despachoAnular.id}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnulacion }),
      });

      const data = await response.json();

      if (data.success) {
        fetchDespachos();
        setDespachoAnular(null);
        setMotivoAnulacion('');
      } else {
        setError(data.error || 'Error al anular despacho');
      }
    } catch (err) {
      setError('Error al anular despacho');
      console.error(err);
    } finally {
      setAnulando(false);
    }
  };

  const totalPages = Math.ceil(total / limite);

  // Filtrar por búsqueda local
  const despachosFiltrados = busqueda
    ? despachos.filter(
        (d) =>
          d.articulo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          d.articulo.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
          d.receptorNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
          d.unidadReceptora?.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : despachos;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Historial de Despachos
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Registro de salidas de mercancía del inventario
            </p>
          </div>
          <Link href="/despachos/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Despacho
            </Button>
          </Link>
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
                  placeholder="Artículo, receptor, unidad..."
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

        {/* Tabla de despachos */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Artículo
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Receptor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Unidad Receptora
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Lote
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando...</p>
                    </td>
                  </tr>
                ) : despachosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No se encontraron despachos</p>
                    </td>
                  </tr>
                ) : (
                  despachosFiltrados.map((despacho) => (
                    <tr
                      key={despacho.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        despacho.anulado ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(despacho.timestamp).toLocaleDateString('es-CR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {despacho.articulo.nombre}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {despacho.articulo.sku}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-medium ${
                          despacho.anulado
                            ? 'text-gray-400 line-through'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          -{Math.abs(despacho.cantidad)} {despacho.articulo.unidadMedida}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {despacho.receptorNombre || '-'}
                        </div>
                        {despacho.receptorCedula && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {despacho.receptorCedula}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {despacho.unidadReceptora?.nombre || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {despacho.lote?.numeroLote || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {despacho.anulado ? (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                            Anulado
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDespachoAnular(despacho)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
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

        {/* Modal de anulación */}
        <AlertDialog
          open={!!despachoAnular}
          onClose={() => {
            setDespachoAnular(null);
            setMotivoAnulacion('');
          }}
          onConfirm={handleAnular}
          title="Anular Despacho"
          description={
            <div className="space-y-4">
              <p>
                ¿Está seguro de anular el despacho de{' '}
                <strong>{Math.abs(despachoAnular?.cantidad || 0)} {despachoAnular?.articulo.unidadMedida}</strong> de{' '}
                <strong>{despachoAnular?.articulo.nombre}</strong>?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Esta acción revertirá el stock al lote correspondiente.
              </p>
              <div>
                <Label htmlFor="motivoAnulacion" required>Motivo de anulación</Label>
                <textarea
                  id="motivoAnulacion"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Describa el motivo de la anulación..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                />
              </div>
            </div>
          }
          confirmText={anulando ? 'Anulando...' : 'Anular Despacho'}
          variant="destructive"
          loading={anulando}
        />
      </div>
    </div>
  );
}
