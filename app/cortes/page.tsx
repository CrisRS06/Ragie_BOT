'use client';

/**
 * Página: Listado de Cortes de Existencias
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/hooks/useRoleAccess';

interface Corte {
  id: string;
  tipo: string;
  timestamp: string;
  motivo: string | null;
  hashSnapshot: string;
  totalArticulos: number;
  totalLotes: number;
  completado: boolean;
  solicitadoPor: string | null;
}

export default function CortesPage() {
  const { user } = useAuth();
  const canCreate = user?.rol ? hasPermission(user.rol, 'cortes.crear') : false;

  const [cortes, setCortes] = useState<Corte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  useEffect(() => {
    fetchCortes();
  }, [filtroTipo]);

  const fetchCortes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);

      const response = await fetch(`/api/cortes?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCortes(data.cortes);
      } else {
        setError('Error al cargar cortes');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      MENSUAL_AUTOMATICO: 'Mensual Automático',
      BAJO_DEMANDA: 'Bajo Demanda',
      COMPRA_SEGUN_DEMANDA: 'Compra Según Demanda',
    };
    return labels[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      MENSUAL_AUTOMATICO: 'bg-blue-100 text-blue-800',
      BAJO_DEMANDA: 'bg-green-100 text-green-800',
      COMPRA_SEGUN_DEMANDA: 'bg-purple-100 text-purple-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cortes de Existencias</h1>
          <p className="text-gray-600 dark:text-gray-400">Historial de snapshots de inventario con hash inmutable</p>
        </div>
        {canCreate && (
          <Link href="/cortes/nuevo">
            <Button>Nuevo Corte</Button>
          </Link>
        )}
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">Filtrar por tipo:</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="rounded border-gray-300 text-sm"
            >
              <option value="">Todos</option>
              <option value="MENSUAL_AUTOMATICO">Mensual Automático</option>
              <option value="BAJO_DEMANDA">Bajo Demanda</option>
              <option value="COMPRA_SEGUN_DEMANDA">Compra Según Demanda</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Lista de cortes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cortes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando cortes...</p>
            </div>
          ) : cortes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay cortes registrados</p>
              {canCreate && (
                <Link href="/cortes/nuevo" className="text-blue-600 hover:underline mt-2 inline-block">
                  Crear primer corte
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Motivo</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Artículos</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lotes</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hash</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {cortes.map((corte) => (
                    <tr key={corte.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 dark:text-white">{formatDate(corte.timestamp)}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTipoColor(corte.tipo)}`}>
                          {getTipoLabel(corte.tipo)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {corte.motivo || '-'}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-center text-sm font-medium text-gray-900 dark:text-white">{corte.totalArticulos}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-center text-sm font-medium text-gray-900 dark:text-white">{corte.totalLotes}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-gray-800 dark:text-gray-200 truncate max-w-[100px] sm:max-w-[120px] inline-block">
                          {corte.hashSnapshot.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={`/cortes/${corte.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            Ver
                          </Link>
                          <a
                            href={`/api/cortes/${corte.id}/csv`}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm"
                            download
                          >
                            CSV
                          </a>
                        </div>
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
