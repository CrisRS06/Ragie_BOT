'use client';

/**
 * Página: Inventario
 * Vista general del inventario con stock por artículo
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
}

interface Estadisticas {
  totalArticulos: number;
  articulosConStock: number;
  articulosSinStock: number;
  articulosStockBajo: number;
  articulosConAlertaVencimiento: number;
}

export default function InventarioPage() {
  const [inventario, setInventario] = useState<ArticuloInventario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloConStock, setSoloConStock] = useState(false);

  useEffect(() => {
    fetchInventario();
  }, [busqueda, soloConStock]);

  const fetchInventario = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (busqueda) params.set('busqueda', busqueda);
      if (soloConStock) params.set('soloConStock', 'true');

      const response = await fetch(`/api/inventario?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInventario(data.inventario);
        setEstadisticas(data.estadisticas);
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

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600">Vista general del stock por artículo</p>
        </div>
        <div className="flex gap-2">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por SKU, nombre o descripción SIGAF..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Lotes</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventario.map((articulo) => (
                    <tr key={articulo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{articulo.sku}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{articulo.nombre}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{articulo.descripcionSIGAF}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-bold ${
                            articulo.stockTotal === 0
                              ? 'text-gray-400'
                              : articulo.alertaStockBajo
                              ? 'text-orange-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {articulo.stockTotal}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">{articulo.unidadMedida}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">{articulo.totalLotes}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {articulo.lotesVencidos > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              {articulo.lotesVencidos} vencidos
                            </span>
                          )}
                          {articulo.lotesProximosAVencer > 0 && articulo.lotesVencidos === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              {articulo.lotesProximosAVencer} por vencer
                            </span>
                          )}
                          {articulo.alertaStockBajo && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Stock bajo
                            </span>
                          )}
                          {!articulo.alertaVencimiento && !articulo.alertaStockBajo && articulo.stockTotal > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              OK
                            </span>
                          )}
                          {articulo.stockTotal === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Sin stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/inventario/${articulo.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
