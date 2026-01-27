'use client';

/**
 * Reporte Quincenal de Movimientos
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';

interface ResumenArticulo {
  sku: string;
  nombre: string;
  descripcionSIGAF: string;
  unidadMedida: string;
  entradas: number;
  salidas: number;
  ajustes: number;
  neto: number;
  cantidadMovimientos: number;
}

interface MovimientoDetalle {
  id: string;
  tipo: string;
  fecha: string;
  articulo: string;
  sku: string;
  cantidad: number;
  lote: string;
  receptor: string;
  motivo: string;
  usuario: string;
}

interface InformeData {
  periodo: {
    inicio: string;
    fin: string;
    dias: number;
  };
  resumen: {
    totalMovimientos: number;
    totalEntradas: number;
    totalSalidas: number;
    totalAjustes: number;
    articulosAfectados: number;
  };
  articulosResumen: ResumenArticulo[];
  movimientosDetalle: MovimientoDetalle[];
}

export default function ReporteQuincenalPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InformeData | null>(null);

  // Fechas por defecto: últimos 15 días
  const today = new Date();
  const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);

  const [fechaInicio, setFechaInicio] = useState(fifteenDaysAgo.toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(today.toISOString().split('T')[0]);

  const fetchInforme = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        fechaInicio,
        fechaFin,
      });

      const response = await fetch(`/api/informes/quincenal?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Error al generar informe');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInforme();
  }, []);

  const handleGenerarInforme = () => {
    fetchInforme();
  };

  const tipoLabels: Record<string, string> = {
    ENTRADA: 'Entrada',
    SALIDA: 'Salida',
    AJUSTE_INVENTARIO: 'Ajuste',
  };

  const tipoColors: Record<string, string> = {
    ENTRADA: 'bg-green-100 text-green-800',
    SALIDA: 'bg-red-100 text-red-800',
    AJUSTE_INVENTARIO: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Informe Quincenal de Movimientos
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Resumen de entradas, salidas y ajustes de inventario
          </p>
        </div>

        {/* Filtros de fecha */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-auto">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleGenerarInforme} disabled={loading}>
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Generando...' : 'Generar Informe'}
            </Button>
          </div>
        </Card>

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

        {/* Contenido del informe */}
        {data && (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <ArrowUpDown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Movimientos
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.resumen.totalMovimientos}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Entradas
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      +{data.resumen.totalEntradas}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Salidas
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      -{data.resumen.totalSalidas}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Artículos
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.resumen.articulosAfectados}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Resumen por artículo */}
            <Card className="mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Resumen por Artículo
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Artículo
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Entradas
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Salidas
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Ajustes
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Neto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.articulosResumen.map((art, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {art.nombre}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {art.sku} - {art.unidadMedida}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm text-green-600 dark:text-green-400">
                          +{art.entradas}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm text-red-600 dark:text-red-400">
                          -{art.salidas}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm text-yellow-600 dark:text-yellow-400">
                          {art.ajustes >= 0 ? '+' : ''}{art.ajustes}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm font-medium">
                          <span
                            className={
                              art.neto >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {art.neto >= 0 ? '+' : ''}{art.neto}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Últimos movimientos */}
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalle de Movimientos (últimos 100)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Fecha
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Tipo
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Artículo
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Cantidad
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Lote
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Usuario
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.movimientosDetalle.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white">
                          {new Date(mov.fecha).toLocaleDateString('es-CR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              tipoColors[mov.tipo] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {tipoLabels[mov.tipo] || mov.tipo}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-white">
                          {mov.articulo}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-sm font-medium">
                          <span
                            className={
                              mov.cantidad > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400">
                          {mov.lote}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400">
                          {mov.usuario}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Estado vacío */}
        {!loading && !data && !error && (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Sin datos
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Seleccione un rango de fechas y genere el informe
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
