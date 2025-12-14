'use client';

/**
 * Dashboard Principal - Dinámico con datos reales
 * Vista general del sistema con métricas clave y accesos rápidos
 */

import { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, ClipboardList, FileText, Users, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface Metricas {
  totalArticulos: number;
  articulosConStock: number;
  articulosSinStock: number;
  movimientosMes: {
    entradas: number;
    salidas: number;
    total: number;
  };
  alertas: {
    lotesProximosVencer: number;
    lotesVencidos: number;
    articulosStockBajo: number;
  };
  cortesAnio: number;
  ultimosMovimientos: Array<{
    id: string;
    tipo: 'ENTRADA' | 'SALIDA';
    articulo: string;
    cantidad: number;
    fecha: string;
    usuario: string;
  }>;
  informeMensualPendiente: boolean;
}

export default function DashboardPage() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetricas();
  }, []);

  const fetchMetricas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/metricas');
      const data = await response.json();

      if (data.success) {
        setMetricas(data.metricas);
      } else {
        setError('Error al cargar métricas');
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchMetricas}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totalAlertas = metricas
    ? metricas.alertas.lotesProximosVencer +
      metricas.alertas.lotesVencidos +
      metricas.alertas.articulosStockBajo
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Alertas Críticas */}
      {metricas?.informeMensualPendiente && (
        <div className="mb-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  <strong>Atención:</strong> Es necesario generar el informe mensual de inventario.
                  Tienes hasta el día 3 del mes.
                </p>
                <Link
                  href="/reportes"
                  className="mt-2 inline-block text-sm text-yellow-700 hover:text-yellow-900 underline"
                >
                  Ir a Reportes →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de vencimiento */}
      {metricas && metricas.alertas.lotesVencidos > 0 && (
        <div className="mb-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  <strong>Alerta:</strong> Hay {metricas.alertas.lotesVencidos} lote(s) vencido(s) en el inventario.
                </p>
                <Link
                  href="/inventario"
                  className="mt-2 inline-block text-sm text-red-700 hover:text-red-900 underline"
                >
                  Ver Inventario →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Artículos con Stock"
          value={metricas?.articulosConStock.toString() || '0'}
          subtitle={`${metricas?.totalArticulos || 0} registrados`}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          bgColor="bg-blue-100"
        />
        <MetricCard
          title="Movimientos del Mes"
          value={metricas?.movimientosMes.total.toString() || '0'}
          subtitle={`↑${metricas?.movimientosMes.entradas || 0} ↓${metricas?.movimientosMes.salidas || 0}`}
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          bgColor="bg-green-100"
        />
        <MetricCard
          title="Alertas Activas"
          value={totalAlertas.toString()}
          subtitle={`${metricas?.alertas.lotesProximosVencer || 0} por vencer`}
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          bgColor="bg-red-100"
          highlight={totalAlertas > 0}
        />
        <MetricCard
          title="Cortes del Año"
          value={metricas?.cortesAnio.toString() || '0'}
          subtitle="Snapshots de inventario"
          icon={<ClipboardList className="h-6 w-6 text-purple-600" />}
          bgColor="bg-purple-100"
        />
      </div>

      {/* Accesos Rápidos */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickAccessCard
            title="Nueva Recepción"
            description="Registrar entrada de mercancía"
            icon={<Package className="h-8 w-8" />}
            href="/recepciones/nueva"
            color="blue"
          />
          <QuickAccessCard
            title="Despacho PEPS"
            description="Realizar salida de inventario"
            icon={<TrendingDown className="h-8 w-8" />}
            href="/despachos/nuevo"
            color="green"
          />
          <QuickAccessCard
            title="Generar Corte"
            description="Corte de existencias bajo demanda"
            icon={<ClipboardList className="h-8 w-8" />}
            href="/cortes/nuevo"
            color="purple"
          />
          <QuickAccessCard
            title="Informes"
            description="Ver y generar reportes"
            icon={<FileText className="h-8 w-8" />}
            href="/reportes"
            color="orange"
          />
          <QuickAccessCard
            title="Inventario"
            description="Consultar existencias"
            icon={<Package className="h-8 w-8" />}
            href="/inventario"
            color="indigo"
          />
          <QuickAccessCard
            title="Auditoría"
            description="Bitácora y verificación"
            icon={<Users className="h-8 w-8" />}
            href="/auditoria"
            color="gray"
          />
        </div>
      </div>

      {/* Últimos Movimientos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Últimos Movimientos</h2>
          <Link href="/inventario" className="text-sm text-blue-600 hover:text-blue-800">
            Ver todo →
          </Link>
        </div>
        <div className="p-6">
          {metricas?.ultimosMovimientos && metricas.ultimosMovimientos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Artículo
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cantidad
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metricas.ultimosMovimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            mov.tipo === 'ENTRADA'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {mov.tipo === 'ENTRADA' ? '↑ Entrada' : '↓ Salida'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{mov.articulo}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{mov.cantidad}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{formatDate(mov.fecha)}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{mov.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No hay movimientos recientes"
              description="Los movimientos de inventario aparecerán aquí una vez que se registren operaciones."
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Sistema de Inventario PEPS © 2025 - Patronato Nacional de la Infancia
          <br />
          <span className="text-xs">
            Cumplimiento regulatorio completo | Versión 1.0.0
          </span>
        </p>
      </footer>
    </div>
  );
}

// ============================================
// Componentes
// ============================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  bgColor: string;
  highlight?: boolean;
}

function MetricCard({ title, value, subtitle, icon, bgColor, highlight }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${highlight ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${bgColor} rounded-md p-3`}>{icon}</div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
            {subtitle && <dd className="text-xs text-gray-400">{subtitle}</dd>}
          </dl>
        </div>
      </div>
    </div>
  );
}

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'gray';
}

function QuickAccessCard({ title, description, icon, href, color }: QuickAccessCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-all p-6 group hover:scale-105 duration-200"
    >
      <div
        className={`inline-flex p-3 rounded-md ${colorClasses[color]} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
        Ir →
      </div>
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{description}</p>
    </div>
  );
}
