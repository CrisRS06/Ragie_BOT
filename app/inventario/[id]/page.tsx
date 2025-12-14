'use client';

/**
 * Página: Detalle de Inventario por Artículo
 * Muestra lotes en orden PEPS con información detallada
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  descripcionSIGAF: string;
  unidadMedida: string;
  stockMinimo: number;
}

interface Lote {
  id: string;
  numeroLote: string;
  ordenPEPS: number;
  cantidadInicial: number;
  cantidadDisponible: number;
  cantidadConsumida: number;
  porcentajeConsumido: number;
  fechaIngresoTs: string;
  fechaVencimiento: string;
  diasHastaVencimiento: number;
  vencido: boolean;
  severidadVencimiento: string;
  proveedor: string | null;
  costoUnitario: number | null;
  ubicacion: string | null;
  agotado: boolean;
  ultimosMovimientos: Array<{
    id: string;
    tipo: string;
    cantidad: number;
    timestamp: string;
  }>;
}

interface Estadisticas {
  stockTotal: number;
  totalLotes: number;
  lotesActivos: number;
  lotesAgotados: number;
  lotesVencidos: number;
  lotesProximosAVencer: number;
  alertaStockBajo: boolean;
}

export default function DetalleInventarioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordenarPor, setOrdenarPor] = useState<'peps' | 'vencimiento'>('peps');
  const [incluirAgotados, setIncluirAgotados] = useState(false);

  useEffect(() => {
    fetchLotes();
  }, [resolvedParams.id, ordenarPor, incluirAgotados]);

  const fetchLotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (incluirAgotados) params.set('incluirAgotados', 'true');
      params.set('ordenarPor', ordenarPor === 'peps' ? 'fechaIngresoTs' : 'fechaVencimiento');

      const response = await fetch(`/api/inventario/${resolvedParams.id}/lotes?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setArticulo(data.articulo);
        setLotes(data.lotes);
        setEstadisticas(data.estadisticas);
      } else {
        setError(data.error || 'Error al cargar datos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getSeveridadColor = (severidad: string) => {
    switch (severidad) {
      case 'CRITICA':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ALTA':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'BAJA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-center text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (error || !articulo) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || 'Artículo no encontrado'}</p>
        </div>
        <Link href="/inventario" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Volver al inventario
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/inventario" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Volver al inventario
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{articulo.nombre}</h1>
        <p className="text-gray-600">
          <span className="font-mono">{articulo.sku}</span> · {articulo.unidadMedida}
        </p>
      </div>

      {/* Info del artículo */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Descripción SIGAF</p>
              <p className="text-sm">{articulo.descripcionSIGAF}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Stock Mínimo</p>
              <p className="text-sm">
                {articulo.stockMinimo} {articulo.unidadMedida}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${estadisticas.alertaStockBajo ? 'text-orange-600' : 'text-gray-900'}`}>
                {estadisticas.stockTotal}
              </p>
              <p className="text-xs text-gray-500">Stock Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{estadisticas.totalLotes}</p>
              <p className="text-xs text-gray-500">Total Lotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{estadisticas.lotesActivos}</p>
              <p className="text-xs text-gray-500">Activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-400">{estadisticas.lotesAgotados}</p>
              <p className="text-xs text-gray-500">Agotados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600">{estadisticas.lotesVencidos}</p>
              <p className="text-xs text-gray-500">Vencidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-yellow-600">{estadisticas.lotesProximosAVencer}</p>
              <p className="text-xs text-gray-500">Por Vencer</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as 'peps' | 'vencimiento')}
                className="rounded border-gray-300 text-sm"
              >
                <option value="peps">Orden PEPS (fecha ingreso)</option>
                <option value="vencimiento">Fecha de vencimiento</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={incluirAgotados}
                onChange={(e) => setIncluirAgotados(e.target.checked)}
                className="rounded border-gray-300"
              />
              Incluir lotes agotados
            </label>
            <div className="flex-1" />
            <Link href={`/despachos/nuevo?articuloId=${articulo.id}`}>
              <Button size="sm">Despachar</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes {ordenarPor === 'peps' ? '(Orden PEPS)' : '(Por Vencimiento)'}</CardTitle>
          <CardDescription>
            {ordenarPor === 'peps'
              ? 'Los lotes se muestran en el orden en que serán consumidos (más antiguo primero)'
              : 'Los lotes se muestran ordenados por fecha de vencimiento (próximos primero)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay lotes disponibles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disponible</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Consumido</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lotes.map((lote) => (
                    <tr
                      key={lote.id}
                      className={`${lote.agotado ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-3 text-sm">
                        {ordenarPor === 'peps' && !lote.agotado && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                            {lote.ordenPEPS}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm font-mono">{lote.numeroLote}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-bold ${lote.agotado ? 'text-gray-400' : 'text-gray-900'}`}>
                          {lote.cantidadDisponible}
                        </span>
                        <span className="text-xs text-gray-500">/{lote.cantidadInicial}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${lote.agotado ? 'bg-gray-400' : 'bg-blue-600'}`}
                            style={{ width: `${lote.porcentajeConsumido}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-1">{lote.porcentajeConsumido}%</p>
                      </td>
                      <td className="px-3 py-3 text-sm">{formatDate(lote.fechaIngresoTs)}</td>
                      <td className="px-3 py-3 text-sm">{formatDate(lote.fechaVencimiento)}</td>
                      <td className="px-3 py-3">
                        {lote.agotado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Agotado
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeveridadColor(
                              lote.severidadVencimiento
                            )}`}
                          >
                            {lote.vencido
                              ? 'VENCIDO'
                              : lote.diasHastaVencimiento === 0
                              ? 'Vence hoy'
                              : `${lote.diasHastaVencimiento}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{lote.ubicacion || '-'}</td>
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
