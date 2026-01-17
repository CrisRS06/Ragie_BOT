'use client';

/**
 * Página: Reporte de Valor de Bodega
 * FASE 5: Valorización total del inventario para INS (seguros)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ArticuloValorizado {
  id: string;
  sku: string;
  nombre: string;
  marca: string | null;
  unidadMedida: string;
  ivaPercent: number;
  cantidadTotal: number;
  valorSinIva: number;
  valorIva: number;
  valorConIva: number;
  lotes: Array<{
    id: string;
    numeroLote: string | null;
    cantidadDisponible: number;
    costoUnitario: number | null;
    fechaVencimiento: string;
    valorSinIva: number;
    valorIva: number;
    valorConIva: number;
  }>;
}

interface ValorBodegaData {
  success: boolean;
  fechaReporte: string;
  resumen: {
    totalArticulos: number;
    totalArticulosConStock: number;
    totalLotes: number;
    valorTotalSinIva: number;
    valorTotalIva: number;
    valorTotalConIva: number;
    moneda: string;
  };
  articulos: ArticuloValorizado[];
}

export default function ValorBodegaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ValorBodegaData | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [expandedArticulo, setExpandedArticulo] = useState<string | null>(null);

  const fetchValorBodega = async (detalle: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (detalle) params.set('detalle', 'true');

      const response = await fetch(`/api/reportes/valor-bodega?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al obtener valor de bodega');
      }

      setData(result);
      setMostrarDetalle(detalle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValorBodega(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Valor de Bodega</h1>
          <p className="text-gray-600">Valorización total del inventario para reportar al INS</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchValorBodega(!mostrarDetalle)}
            variant="outline"
            disabled={loading}
          >
            {mostrarDetalle ? 'Ocultar Detalle Lotes' : 'Ver Detalle Lotes'}
          </Button>
          {/* FASE 7: Exportar a Excel */}
          <Button
            onClick={() => window.open('/api/exportar/valor-bodega', '_blank')}
            variant="outline"
            disabled={loading || !data}
          >
            Exportar Excel
          </Button>
          <Link href="/reportes">
            <Button variant="outline">Volver a Reportes</Button>
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Resultados */}
      {data && !loading && (
        <>
          {/* Resumen Principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800">Valor Total SIN IVA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(data.resumen.valorTotalSinIva)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-800">Monto IVA (13%)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(data.resumen.valorTotalIva)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800">Valor Total CON IVA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(data.resumen.valorTotalConIva)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info General */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Información del Reporte</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Fecha del Reporte</dt>
                  <dd className="font-medium">{formatDate(data.fechaReporte)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total Artículos</dt>
                  <dd className="font-medium">{data.resumen.totalArticulos}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Artículos con Stock</dt>
                  <dd className="font-medium">{data.resumen.totalArticulosConStock}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total Lotes</dt>
                  <dd className="font-medium">{data.resumen.totalLotes}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Tabla de Artículos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle por Artículo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-2">SKU</th>
                      <th className="text-left py-3 px-2">Artículo</th>
                      <th className="text-left py-3 px-2">Marca</th>
                      <th className="text-right py-3 px-2">Cantidad</th>
                      <th className="text-center py-3 px-2">IVA %</th>
                      <th className="text-right py-3 px-2">Valor Sin IVA</th>
                      <th className="text-right py-3 px-2">IVA</th>
                      <th className="text-right py-3 px-2">Valor Con IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.articulos.map((art) => (
                      <>
                        <tr
                          key={art.id}
                          className={`border-b hover:bg-gray-50 ${
                            art.cantidadTotal === 0 ? 'opacity-50' : ''
                          } ${mostrarDetalle && art.lotes.length > 0 ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (mostrarDetalle && art.lotes.length > 0) {
                              setExpandedArticulo(expandedArticulo === art.id ? null : art.id);
                            }
                          }}
                        >
                          <td className="py-2 px-2 font-mono">{art.sku}</td>
                          <td className="py-2 px-2">
                            {mostrarDetalle && art.lotes.length > 0 && (
                              <span className="mr-2 text-gray-400">
                                {expandedArticulo === art.id ? '▼' : '▶'}
                              </span>
                            )}
                            {art.nombre}
                          </td>
                          <td className="py-2 px-2 text-gray-600">{art.marca || '-'}</td>
                          <td className="py-2 px-2 text-right font-medium">
                            {art.cantidadTotal} {art.unidadMedida}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {(art.ivaPercent * 100).toFixed(0)}%
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(art.valorSinIva)}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {formatCurrency(art.valorIva)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold">
                            {formatCurrency(art.valorConIva)}
                          </td>
                        </tr>
                        {/* Detalle de lotes */}
                        {mostrarDetalle && expandedArticulo === art.id && art.lotes.map((lote) => (
                          <tr key={lote.id} className="bg-gray-50 text-xs">
                            <td className="py-1 px-2 pl-8" colSpan={2}>
                              <span className="text-gray-500">Lote:</span>{' '}
                              <span className="font-mono">{lote.numeroLote || 'Sin número'}</span>
                              <span className="ml-4 text-gray-500">Vence:</span>{' '}
                              {formatDate(lote.fechaVencimiento)}
                            </td>
                            <td className="py-1 px-2 text-gray-600">
                              {lote.costoUnitario ? `${formatCurrency(lote.costoUnitario)}/u` : '-'}
                            </td>
                            <td className="py-1 px-2 text-right">{lote.cantidadDisponible}</td>
                            <td className="py-1 px-2"></td>
                            <td className="py-1 px-2 text-right">{formatCurrency(lote.valorSinIva)}</td>
                            <td className="py-1 px-2 text-right text-gray-600">{formatCurrency(lote.valorIva)}</td>
                            <td className="py-1 px-2 text-right">{formatCurrency(lote.valorConIva)}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-gray-100">
                      <td colSpan={5} className="py-3 px-2 text-right">TOTAL:</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(data.resumen.valorTotalSinIva)}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(data.resumen.valorTotalIva)}</td>
                      <td className="py-3 px-2 text-right text-green-700">{formatCurrency(data.resumen.valorTotalConIva)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Nota INS */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Nota para Reportar al INS</h3>
            <p className="text-sm text-blue-700">
              El <strong>Valor Total CON IVA ({formatCurrency(data.resumen.valorTotalConIva)})</strong> representa
              el valor asegurable del inventario a la fecha del reporte. Este valor incluye el costo de adquisición
              de los productos (valorados según método PEPS) más el IVA correspondiente (13% para productos gravados,
              0% para exentos).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
