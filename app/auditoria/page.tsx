'use client';

/**
 * Página: Auditoría / Bitácora
 * Vista de eventos con verificación de integridad
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RegistroBitacora {
  id: string;
  timestamp: string;
  accion: string;
  entidad: string;
  entidadId: string;
  estadoAnterior: any;
  estadoNuevo: any;
  hashActual: string;
  hashAnterior: string | null;
  usuario: { nombre: string; email: string } | null;
  ip: string | null;
}

interface Verificacion {
  integra: boolean;
  mensaje: string;
  totalRegistros: number;
  verificadoEn: string;
}

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<Verificacion | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
    accion: '',
    entidad: '',
  });

  const [filtrosDisponibles, setFiltrosDisponibles] = useState<{
    acciones: Array<{ accion: string; count: number }>;
    entidades: Array<{ entidad: string; count: number }>;
  }>({ acciones: [], entidades: [] });

  useEffect(() => {
    fetchBitacora();
  }, []);

  const fetchBitacora = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.desde) params.set('desde', filtros.desde);
      if (filtros.hasta) params.set('hasta', filtros.hasta);
      if (filtros.accion) params.set('accion', filtros.accion);
      if (filtros.entidad) params.set('entidad', filtros.entidad);

      const response = await fetch(`/api/bitacora?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRegistros(data.registros);
        setFiltrosDisponibles(data.filtrosDisponibles);
      } else {
        setError('Error al cargar bitácora');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verificarIntegridad = async () => {
    try {
      setVerificando(true);
      const response = await fetch('/api/bitacora/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (data.success) {
        setVerificacion(data.verificacion);
      } else {
        setError('Error al verificar integridad');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setVerificando(false);
    }
  };

  const exportarCSV = async () => {
    try {
      setExportando(true);
      const params = new URLSearchParams();
      if (filtros.desde) params.set('desde', filtros.desde);
      if (filtros.hasta) params.set('hasta', filtros.hasta);

      const response = await fetch(`/api/bitacora/exportar?${params.toString()}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitacora-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Error al exportar');
      console.error(err);
    } finally {
      setExportando(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleFiltrar = () => {
    fetchBitacora();
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auditoría</h1>
          <p className="text-gray-600 dark:text-gray-400">Bitácora inmutable con hash encadenado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={verificarIntegridad} isLoading={verificando}>
            Verificar Integridad
          </Button>
          <Button variant="outline" onClick={exportarCSV} isLoading={exportando}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Verificación */}
      {verificacion && (
        <div className={`border rounded-lg p-4 mb-6 ${verificacion.integra ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {verificacion.integra ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${verificacion.integra ? 'text-green-800' : 'text-red-800'}`}>
                {verificacion.mensaje}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {verificacion.totalRegistros} registros verificados - {formatDate(verificacion.verificadoEn)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Desde</label>
              <Input
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Hasta</label>
              <Input
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Acción</label>
              <select
                value={filtros.accion}
                onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
                className="w-full rounded border-gray-300 text-sm"
              >
                <option value="">Todas</option>
                {filtrosDisponibles.acciones.map((a) => (
                  <option key={a.accion} value={a.accion}>
                    {a.accion} ({a.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Entidad</label>
              <select
                value={filtros.entidad}
                onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })}
                className="w-full rounded border-gray-300 text-sm"
              >
                <option value="">Todas</option>
                {filtrosDisponibles.entidades.map((e) => (
                  <option key={e.entidad} value={e.entidad}>
                    {e.entidad} ({e.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleFiltrar} className="w-full">Filtrar</Button>
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

      {/* Tabla de registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando bitácora...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay registros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acción</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entidad</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {registros.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 sm:px-3 py-2 text-xs text-gray-900 dark:text-white">{formatDate(registro.timestamp)}</td>
                      <td className="px-2 sm:px-3 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {registro.accion}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-2">
                        <span className="text-gray-900 dark:text-white">{registro.entidad}</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs block font-mono truncate max-w-[80px] sm:max-w-none">{registro.entidadId.substring(0, 8)}...</span>
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-gray-600 dark:text-gray-400">
                        {registro.usuario?.nombre || 'Sistema'}
                      </td>
                      <td className="px-2 sm:px-3 py-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono text-gray-800 dark:text-gray-200 truncate max-w-[80px] sm:max-w-[120px] inline-block">
                          {registro.hashActual.substring(0, 12)}...
                        </code>
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
