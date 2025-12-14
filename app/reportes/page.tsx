'use client';

/**
 * Página: Reportes e Informes
 * Dashboard de generación de reportes regulatorios
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ReportesPage() {
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

  const generarReporteVencimientos = async () => {
    setGenerando('vencimientos');
    setResultado(null);
    try {
      const response = await fetch('/api/informes/vencimientos');
      const data = await response.json();

      setResultado({
        tipo: 'Reporte de Vencimientos',
        mensaje: data.success
          ? `Se encontraron ${data.totalAlertas} lotes con alertas de vencimiento`
          : data.error,
        success: data.success,
      });
    } catch (err) {
      setResultado({
        tipo: 'Reporte de Vencimientos',
        mensaje: 'Error al generar reporte',
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
        {/* Informe Mensual */}
        <Card>
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
        </Card>

        {/* Reporte Quincenal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reporte Quincenal</CardTitle>
            <CardDescription>
              Detalle de movimientos con filtros por fecha, artículo y receptor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Exportable en PDF y CSV. Incluye todos los movimientos del período seleccionado.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Próximamente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reporte de Vencimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reporte de Vencimientos</CardTitle>
            <CardDescription>
              Lotes próximos a vencer y productos ya vencidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Alertas FEFO informativas. No afecta el orden de despacho PEPS.
              </p>
              <Button
                onClick={generarReporteVencimientos}
                isLoading={generando === 'vencimientos'}
                disabled={generando !== null}
                variant="outline"
                className="w-full"
              >
                Ver Vencimientos
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertas del Sistema</CardTitle>
            <CardDescription>
              Notificaciones de vencimientos, stock bajo y pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Resumen de alertas activas por severidad y tipo.
              </p>
              <Link href="/inventario">
                <Button variant="outline" className="w-full">
                  Ver Inventario
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
