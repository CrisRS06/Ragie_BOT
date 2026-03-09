'use client';

/**
 * Página: Reportes e Informes
 * Dashboard de generación de reportes regulatorios
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportesPage() {
  const { user } = useAuth();
  const esAuditor = user?.rol === 'AUDITOR';
  const [generando, setGenerando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    tipo: string;
    mensaje: string;
    success: boolean;
  } | null>(null);

  const generarInformeMensual = async () => {
    setGenerando('mensual');
    setResultado(null);
    try {
      const response = await fetch('/api/informes/mensual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      setResultado({
        tipo: 'Informe Mensual',
        mensaje: data.success ? data.mensaje : data.error,
        success: data.success,
      });
    } catch (err) {
      setResultado({
        tipo: 'Informe Mensual',
        mensaje: 'Error al generar informe',
        success: false,
      });
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes e Informes</h1>
        <p className="text-gray-600">Generación de reportes regulatorios con firma digital</p>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`border rounded-lg p-4 mb-6 ${resultado.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-medium ${resultado.success ? 'text-green-800' : 'text-red-800'}`}>
            {resultado.tipo}
          </p>
          <p className={`text-sm ${resultado.success ? 'text-green-700' : 'text-red-700'}`}>
            {resultado.mensaje}
          </p>
        </div>
      )}

      {/* Reportes disponibles */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Informe Mensual - oculto para auditores */}
        {!esAuditor && <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informe Mensual de Inventario</CardTitle>
            <CardDescription>
              Reporte automático de entradas, salidas y saldos por artículo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Se genera automáticamente los días 1-3 de cada mes. Incluye firma digital SHA-256.
              </p>
              <Button
                onClick={generarInformeMensual}
                isLoading={generando === 'mensual'}
                disabled={generando !== null}
                className="w-full"
              >
                Generar Informe
              </Button>
            </div>
          </CardContent>
        </Card>}

        {/* Kardex por Producto - FASE 6 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kardex por Producto</CardTitle>
            <CardDescription>
              Historial de movimientos con saldos acumulativos PEPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Detalle de entradas, salidas y saldos por artículo con valorización.
              </p>
              <Link href="/reportes/kardex">
                <Button variant="outline" className="w-full">
                  Generar Kardex
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Valor de Bodega - oculto para auditores */}
        {!esAuditor && <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valor de Bodega (INS)</CardTitle>
            <CardDescription>
              Valorización total del inventario para seguros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Reporte de valor total con y sin IVA. Desglose por artículo y lote.
              </p>
              <Link href="/reportes/valor-bodega">
                <Button variant="outline" className="w-full">
                  Ver Valor de Bodega
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>}

        {/* Acceso Rápido a Cortes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cortes de Existencias</CardTitle>
            <CardDescription>
              Snapshots inmutables del inventario con hash de verificación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Cortes mensuales automáticos y bajo demanda. Exportable a CSV.
              </p>
              <Link href="/cortes">
                <Button variant="outline" className="w-full">
                  Ver Cortes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Bitácora */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bitácora de Auditoría</CardTitle>
            <CardDescription>
              Registro inmutable de todas las operaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Hash encadenado para verificación de integridad. Exportable a CSV.
              </p>
              <Link href="/auditoria">
                <Button variant="outline" className="w-full">
                  Ver Bitácora
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Info regulatorio */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Requisitos Regulatorios</h3>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Informe mensual obligatorio: Días 1-3 de cada mes</li>
          <li>Reporte quincenal de movimientos: Días 1-15 y 16-último</li>
          <li>Cortes de existencias: Automáticos y bajo demanda</li>
          <li>Firma digital SHA-256 en todos los documentos</li>
          <li>Bitácora inmutable con hash encadenado</li>
        </ul>
      </div>
    </div>
  );
}
