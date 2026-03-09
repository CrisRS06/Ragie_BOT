'use client';

/**
 * Página: Inventario
 * Vista general del inventario con stock por artículo
 * Soporta filtrado por bodega y ordenamiento
 */

import { useState, useEffect, useDeferredValue } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FileText } from 'lucide-react';

interface BodegaStock {
  bodegaId: string;
  bodegaCodigo: string;
  bodegaNombre: string;
  stockEnBodega: number;
}

interface ArticuloInventario {
  id: string;
  sku: string;
  nombre: string;
  descripcionSIGAF: string;
  unidadMedida: string;
  stockMinimo: number;
  stockTotal: number;
  totalLotes: number;
  lotesProximosAVencer: number;
  lotesVencidos: number;
  alertaStockBajo: boolean;
  alertaVencimiento: boolean;
  bodegas?: BodegaStock[];
}

interface Estadisticas {
  totalArticulos: number;
  articulosConStock: number;
  articulosSinStock: number;
  articulosStockBajo: number;
  articulosConAlertaVencimiento: number;
}

interface Bodega {
  id: string;
  codigo: string;
  nombre: string;
}

type OrdenarPorType = 'nombre' | 'sku' | 'stockTotal' | 'estado';
type OrdenType = 'asc' | 'desc';

export default function InventarioPage() {
  const [inventario, setInventario] = useState<ArticuloInventario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloConStock, setSoloConStock] = useState(true);
  const [bodegaId, setBodegaId] = useState<string>('');
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPorType>('nombre');
  const [orden, setOrden] = useState<OrdenType>('asc');
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<{ codigo: string; nombre: string } | null>(null);

  // Debounce de búsqueda para evitar llamadas excesivas a la API
  const deferredBusqueda = useDeferredValue(busqueda);

  // Cargar bodegas al montar
  useEffect(() => {
    fetchBodegas();
  }, []);

  useEffect(() => {
    fetchInventario();
  }, [deferredBusqueda, soloConStock, bodegaId, ordenarPor, orden]);

  const fetchBodegas = async () => {
    try {
      const response = await fetch('/api/bodegas');
      const data = await response.json();
      if (data.success) {
        setBodegas(data.bodegas || []);
      }
    } catch (err) {
      console.error('Error al cargar bodegas:', err);
    }
  };

  const fetchInventario = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (deferredBusqueda) params.set('busqueda', deferredBusqueda);
      if (soloConStock) params.set('soloConStock', 'true');
      if (bodegaId) params.set('bodegaId', bodegaId);
      params.set('ordenarPor', ordenarPor);
      params.set('orden', orden);

      const response = await fetch(`/api/inventario?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInventario(data.inventario);
        setEstadisticas(data.estadisticas);
        setBodegaSeleccionada(data.bodegaSeleccionada || null);
      } else {
        setError('Error al cargar inventario');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (campo: OrdenarPorType) => {
    if (ordenarPor === campo) {
      setOrden(orden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setOrden('asc');
    }
  };

  const getSortIcon = (campo: OrdenarPorType) => {
    if (ordenarPor !== campo) return null;
    return orden === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Consulta de existencias actuales. El inventario se actualiza con cada recepción (entrada) y despacho (salida).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams();
              params.set('soloConStock', String(soloConStock));
              if (bodegaId) params.set('bodegaId', bodegaId);
              window.open(`/api/exportar/inventario?${params.toString()}`, '_blank');
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Link href="/recepciones/nueva">
            <Button variant="outline">Nueva Recepción</Button>
          </Link>
          <Link href="/despachos/nuevo">
            <Button>Nuevo Despacho</Button>
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="mb-6">
          {bodegaSeleccionada && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Mostrando inventario de: <span className="font-semibold">{bodegaSeleccionada.nombre}</span> ({bodegaSeleccionada.codigo})
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{estadisticas.totalArticulos}</p>
                <p className="text-xs text-gray-500">Total Artículos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-green-600">{estadisticas.articulosConStock}</p>
                <p className="text-xs text-gray-500">Con Stock</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-gray-400">{estadisticas.articulosSinStock}</p>
                <p className="text-xs text-gray-500">Sin Stock</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-orange-600">{estadisticas.articulosStockBajo}</p>
                <p className="text-xs text-gray-500">Stock Bajo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-600">{estadisticas.articulosConAlertaVencimiento}</p>
                <p className="text-xs text-gray-500">Con Alertas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          {/* Fila 1: Selector de Bodega */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bodega
            </label>
            <Select
              value={bodegaId}
              onChange={(e) => setBodegaId(e.target.value)}
              className="max-w-xs"
            >
              <option value="">Todas las bodegas</option>
              {bodegas.map((bodega) => (
                <option key={bodega.id} value={bodega.id}>
                  {bodega.codigo} - {bodega.nombre}
                </option>
              ))}
            </Select>
          </div>

          {/* Fila 2: Búsqueda, Ordenamiento y Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por SKU, nombre o descripción SIGAF..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Ordenar:</label>
                <Select
                  value={ordenarPor}
                  onChange={(e) => setOrdenarPor(e.target.value as OrdenarPorType)}
                  className="w-32"
                >
                  <option value="nombre">Nombre</option>
                  <option value="sku">SKU</option>
                  <option value="stockTotal">Stock</option>
                  <option value="estado">Estado</option>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrden(orden === 'asc' ? 'desc' : 'asc')}
                  className="px-2"
                  title={orden === 'asc' ? 'Ascendente' : 'Descendente'}
                >
                  {orden === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={soloConStock}
                  onChange={(e) => setSoloConStock(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Solo con stock
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabla de inventario */}
      <Card>
        <CardHeader>
          <CardTitle>Artículos en Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando inventario...</p>
            </div>
          ) : inventario.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron artículos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th
                      className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleSort('sku')}
                    >
                      SKU{getSortIcon('sku')}
                    </th>
                    <th
                      className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleSort('nombre')}
                    >
                      Artículo{getSortIcon('nombre')}
                    </th>
                    {!bodegaId && (
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Bodegas
                      </th>
                    )}
                    <th
                      className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleSort('stockTotal')}
                    >
                      Stock{getSortIcon('stockTotal')}
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lotes</th>
                    <th
                      className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleSort('estado')}
                    >
                      Estado{getSortIcon('estado')}
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {inventario.map((articulo) => (
                    <tr key={articulo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-sm font-mono text-gray-900 dark:text-white">{articulo.sku}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{articulo.nombre}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{articulo.descripcionSIGAF}</p>
                        </div>
                      </td>
                      {!bodegaId && (
                        <td className="px-3 sm:px-4 py-2 sm:py-3">
                          <div className="flex flex-wrap gap-1">
                            {articulo.bodegas && articulo.bodegas.length > 0 ? (
                              articulo.bodegas.map((bodega) => (
                                <span
                                  key={bodega.bodegaId}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  title={bodega.bodegaNombre}
                                >
                                  {bodega.bodegaCodigo}: {bodega.stockEnBodega}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                        <span
                          className={`text-sm font-bold ${
                            articulo.stockTotal === 0
                              ? 'text-gray-400 dark:text-gray-500'
                              : articulo.alertaStockBajo
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {articulo.stockTotal}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{articulo.unidadMedida}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-center text-sm text-gray-900 dark:text-white">{articulo.totalLotes}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {articulo.lotesVencidos > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {articulo.lotesVencidos} vencidos
                            </span>
                          )}
                          {articulo.lotesProximosAVencer > 0 && articulo.lotesVencidos === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {articulo.lotesProximosAVencer} por vencer
                            </span>
                          )}
                          {articulo.alertaStockBajo && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              Stock bajo
                            </span>
                          )}
                          {!articulo.alertaVencimiento && !articulo.alertaStockBajo && articulo.stockTotal > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              OK
                            </span>
                          )}
                          {articulo.stockTotal === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              Sin stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                        <Link
                          href={`/inventario/${articulo.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          Ver Lotes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
