'use client';

/**
 * Página: Detalle de Corte de Existencias
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CorteDetalle {
  id: string;
  tipo: string;
  timestamp: string;
  motivo: string | null;
  hashSnapshot: string;
  totalArticulos: number;
  totalLotes: number;
  periodoInicio: string | null;
  periodoFin: string | null;
  completado: boolean;
  solicitadoPor: {
    nombre: string;
    email: string;
    rol: string;
  } | null;
}

interface DetalleArticulo {
  articuloId: string;
  articuloSku: string;
  articuloNombre: string;
  articuloDescripcionSIGAF: string;
  unidadMedida: string;
  totalCantidad: number;
  lotes: Array<{
    loteId: string;
    cantidad: number;
    fechaVencimiento: string;
    ubicacion: string;
  }>;
}

interface Verificacion {
  integro: boolean;
  hashAlmacenado: string;
  hashCalculado: string;
  coincide: boolean;
  mensaje: string;
  verificadoEn: string;
}

export default function DetalleAortePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [corte, setCorte] = useState<CorteDetalle | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [resumen, setResumen] = useState<{ totalArticulos: number; totalLotes: number; totalUnidades: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<Verificacion | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    fetchCorte();
  }, [resolvedParams.id]);

  const fetchCorte = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cortes/${resolvedParams.id}`);
      const data = await response.json();

      if (data.success) {
        setCorte(data.corte);
        setDetalles(data.detallesPorArticulo);
        setResumen(data.resumen);
      } else {
        setError(data.error || 'Error al cargar corte');
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
      const response = await fetch(`/api/cortes/${resolvedParams.id}/verificar`);
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

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-center text-gray-500">Cargando corte...</p>
      </div>
    );
  }

  if (error || !corte) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || 'Corte no encontrado'}</p>
        </div>
        <Link href="/cortes" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Volver a cortes
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/cortes" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Volver a cortes
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Corte de Existencias</h1>
            <p className="text-gray-600">{formatDate(corte.timestamp)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={verificarIntegridad} isLoading={verificando}>
              Verificar Integridad
            </Button>
            <a href={`/api/cortes/${corte.id}/csv`} download>
              <Button variant="outline">Descargar CSV</Button>
            </a>
          </div>
        </div>
      </div>

      {/* Verificación */}
      {verificacion && (
        <div className={`border rounded-lg p-4 mb-6 ${verificacion.integro ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {verificacion.integro ? (
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
              <p className={`text-sm font-medium ${verificacion.integro ? 'text-green-800' : 'text-red-800'}`}>
                {verificacion.mensaje}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Verificado: {formatDate(verificacion.verificadoEn)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info del corte */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Tipo</p>
              <p className="text-sm">{getTipoLabel(corte.tipo)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Motivo</p>
              <p className="text-sm">{corte.motivo || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Solicitado por</p>
              <p className="text-sm">{corte.solicitadoPor?.nombre || 'Sistema'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hash de Verificación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-2">Este hash SHA-256 garantiza la integridad del corte:</p>
            <code className="block bg-gray-100 px-3 py-2 rounded font-mono text-xs break-all">
              {corte.hashSnapshot}
            </code>
          </CardContent>
        </Card>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{resumen.totalArticulos}</p>
              <p className="text-sm text-gray-500">Artículos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{resumen.totalLotes}</p>
              <p className="text-sm text-gray-500">Lotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{resumen.totalUnidades}</p>
              <p className="text-sm text-gray-500">Unidades</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detalle por artículo */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Existencias</CardTitle>
          <CardDescription>Snapshot del inventario al momento del corte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {detalles.map((articulo) => (
              <div key={articulo.articuloId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      <span className="font-mono text-sm text-gray-500">{articulo.articuloSku}</span> - {articulo.articuloNombre}
                    </p>
                    <p className="text-xs text-gray-500">{articulo.articuloDescripcionSIGAF}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{articulo.totalCantidad}</p>
                    <p className="text-xs text-gray-500">{articulo.unidadMedida}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 px-2">Lote</th>
                        <th className="text-right py-1 px-2">Cantidad</th>
                        <th className="text-left py-1 px-2">Vencimiento</th>
                        <th className="text-left py-1 px-2">Ubicación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articulo.lotes.map((lote, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-1 px-2 font-mono">{lote.loteId.substring(0, 8)}...</td>
                          <td className="py-1 px-2 text-right font-medium">{lote.cantidad}</td>
                          <td className="py-1 px-2">{new Date(lote.fechaVencimiento).toLocaleDateString('es-CR')}</td>
                          <td className="py-1 px-2">{lote.ubicacion || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
