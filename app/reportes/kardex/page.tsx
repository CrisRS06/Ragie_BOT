'use client';

/**
 * Página: Reporte Kardex por Producto
 * FASE 6: Historial de movimientos con saldos acumulativos PEPS
 * Soporta selección múltiple de artículos
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArticuloMultiSelector } from '@/components/ui/articulo-multi-selector';
import Link from 'next/link';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
}

interface MovimientoKardex {
  id: string;
  fecha: string;
  tipo: string;
  numeroLote: string | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number | null;
  valorMovimiento: number | null;
  saldoCantidad: number;
  saldoValor: number;
  receptor: string | null;
  unidadReceptora: string | null;
  documentoReferencia: string | null;
  observaciones: string | null;
}

interface KardexData {
  success: boolean;
  fechaReporte: string;
  periodo: {
    desde: string;
    hasta: string;
  };
  articulo: {
    id: string;
    sku: string;
    nombre: string;
    descripcionSIGAF: string;
    marca: string | null;
    unidadMedida: string;
    ivaPercent: number;
  };
  resumen: {
    totalMovimientos: number;
    totalEntradas: number;
    totalSalidas: number;
    valorTotalEntradas: number;
    valorTotalSalidas: number;
    saldoFinalCantidad: number;
    saldoFinalValor: number;
  };
  movimientos: MovimientoKardex[];
}

export default function KardexPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kardexResults, setKardexResults] = useState<KardexData[]>([]);

  // Filtros
  const [selectedArticulos, setSelectedArticulos] = useState<Articulo[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const generarKardex = async () => {
    if (selectedArticulos.length === 0) {
      setError('Seleccione al menos un artículo');
      return;
    }

    setLoading(true);
    setError(null);
    setKardexResults([]);

    try {
      const results: KardexData[] = [];

      for (const art of selectedArticulos) {
        const params = new URLSearchParams();
        params.set('articuloId', art.id);
        if (fechaDesde) params.set('fechaDesde', fechaDesde);
        if (fechaHasta) params.set('fechaHasta', fechaHasta);

        const response = await fetch(`/api/reportes/kardex?${params.toString()}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || `Error al generar Kardex para ${art.nombre}`);
        }

        results.push(data);
      }

      setKardexResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar Kardex');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
    }).format(amount);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return 'text-green-600 bg-green-50';
      case 'SALIDA':
        return 'text-red-600 bg-red-50';
      case 'AJUSTE_INVENTARIO':
        return 'text-yellow-600 bg-yellow-50';
      case 'SALDO_INICIAL':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const articuloIds = selectedArticulos.map(a => a.id);

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kardex por Producto</h1>
          <p className="text-gray-600">Historial de movimientos con saldos acumulativos PEPS</p>
        </div>
        <Link href="/reportes">
          <Button variant="outline">Volver a Reportes</Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros del Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Multi-selector de Artículos */}
            <div className="md:col-span-2">
              <ArticuloMultiSelector
                values={articuloIds}
                onChange={(arts) => setSelectedArticulos(arts)}
                label="Artículos"
              />
            </div>

            {/* Fecha Desde */}
            <div>
              <Label htmlFor="fechaDesde">Fecha Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <Label htmlFor="fechaHasta">Fecha Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          {/* Botón Generar */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={generarKardex}
              isLoading={loading}
              disabled={loading || selectedArticulos.length === 0}
            >
              Generar Kardex ({selectedArticulos.length} artículo{selectedArticulos.length !== 1 ? 's' : ''})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Resultados - Stacked per article */}
      {kardexResults.map((kardexData, idx) => (
        <div key={kardexData.articulo.id} className={idx > 0 ? 'mt-8 pt-8 border-t-2 border-gray-300' : ''}>
          {/* Export button per article */}
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              {kardexData.articulo.sku} - {kardexData.articulo.nombre}
            </h2>
            <Button
              onClick={() => {
                const params = new URLSearchParams();
                params.set('articuloId', kardexData.articulo.id);
                if (fechaDesde) params.set('fechaDesde', fechaDesde);
                if (fechaHasta) params.set('fechaHasta', fechaHasta);
                window.open(`/api/exportar/kardex?${params.toString()}`, '_blank');
              }}
              variant="outline"
              size="sm"
            >
              Exportar a Excel
            </Button>
          </div>

          {/* Info del Artículo y Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Artículo</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">SKU:</dt>
                    <dd className="font-mono">{kardexData.articulo.sku}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nombre:</dt>
                    <dd>{kardexData.articulo.nombre}</dd>
                  </div>
                  {kardexData.articulo.marca && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Marca:</dt>
                      <dd>{kardexData.articulo.marca}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Unidad:</dt>
                    <dd>{kardexData.articulo.unidadMedida}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen del Período</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total Movimientos:</dt>
                    <dd className="font-medium">{kardexData.resumen.totalMovimientos}</dd>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <dt>Total Entradas:</dt>
                    <dd className="font-medium">+{kardexData.resumen.totalEntradas}</dd>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <dt>Total Salidas:</dt>
                    <dd className="font-medium">-{kardexData.resumen.totalSalidas}</dd>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <dt>Saldo Final Cantidad:</dt>
                      <dd>{kardexData.resumen.saldoFinalCantidad}</dd>
                    </div>
                    <div className="flex justify-between font-bold">
                      <dt>Saldo Final Valor:</dt>
                      <dd>{formatCurrency(kardexData.resumen.saldoFinalValor)}</dd>
                    </div>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Movimientos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-2">Fecha</th>
                      <th className="text-left py-3 px-2">Tipo</th>
                      <th className="text-left py-3 px-2">Descripción</th>
                      <th className="text-left py-3 px-2">Lote</th>
                      <th className="text-right py-3 px-2">Cantidad</th>
                      <th className="text-right py-3 px-2">Costo Unit.</th>
                      <th className="text-right py-3 px-2">Valor</th>
                      <th className="text-right py-3 px-2 bg-blue-50">Saldo Cant.</th>
                      <th className="text-right py-3 px-2 bg-blue-50">Saldo Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexData.movimientos.map((mov) => (
                      <tr key={mov.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 whitespace-nowrap">
                          {formatDate(mov.fecha)}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(mov.tipo)}`}>
                            {mov.tipo === 'SALDO_INICIAL' ? 'SALDO INICIAL' : mov.tipo}
                          </span>
                        </td>
                        <td className="py-2 px-2 max-w-xs truncate" title={mov.descripcion}>
                          {mov.descripcion}
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">
                          {mov.numeroLote || '-'}
                        </td>
                        <td className={`py-2 px-2 text-right font-medium ${
                          mov.cantidad > 0 ? 'text-green-600' : mov.cantidad < 0 ? 'text-red-600' : ''
                        }`}>
                          {mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {mov.costoUnitario ? formatCurrency(mov.costoUnitario) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {mov.valorMovimiento ? formatCurrency(mov.valorMovimiento) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold bg-blue-50">
                          {mov.saldoCantidad}
                        </td>
                        <td className="py-2 px-2 text-right font-bold bg-blue-50">
                          {formatCurrency(mov.saldoValor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {kardexData.movimientos.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No hay movimientos en el período seleccionado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Nota PEPS */}
      {kardexResults.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Nota:</strong> Los valores de salida se calculan usando el método PEPS (Primeras Entradas, Primeras Salidas),
            tomando el costo unitario del lote más antiguo disponible al momento de cada despacho.
          </p>
        </div>
      )}
    </div>
  );
}
