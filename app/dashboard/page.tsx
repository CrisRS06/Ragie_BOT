/**
 * Dashboard Principal - Mejorado con navegación global
 * Vista general del sistema con métricas clave y accesos rápidos
 */

import { Package, TrendingUp, AlertTriangle, ClipboardList, FileText, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Alertas Críticas */}
      <div className="mb-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                <strong>Atención:</strong> Es necesario generar el informe mensual de inventario.
                Tienes hasta el día 3 del mes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Artículos Activos"
          value="145"
          icon={<Package className="h-6 w-6 text-blue-600" />}
          bgColor="bg-blue-100"
        />
        <MetricCard
          title="Movimientos del Mes"
          value="248"
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          bgColor="bg-green-100"
        />
        <MetricCard
          title="Próximos a Vencer"
          value="12"
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          bgColor="bg-red-100"
        />
        <MetricCard
          title="Cortes del Año"
          value="8"
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
            available={true}
          />
          <QuickAccessCard
            title="Despacho PEPS"
            description="Realizar salida de inventario"
            icon={<TrendingUp className="h-8 w-8" />}
            href="/despachos/nuevo"
            color="green"
            available={false}
          />
          <QuickAccessCard
            title="Generar Corte"
            description="Corte de existencias bajo demanda"
            icon={<ClipboardList className="h-8 w-8" />}
            href="/cortes/nuevo"
            color="purple"
            available={false}
          />
          <QuickAccessCard
            title="Informes"
            description="Ver y generar reportes"
            icon={<FileText className="h-8 w-8" />}
            href="/reportes"
            color="orange"
            available={false}
          />
          <QuickAccessCard
            title="Inventario"
            description="Consultar existencias"
            icon={<Package className="h-8 w-8" />}
            href="/inventario"
            color="indigo"
            available={false}
          />
          <QuickAccessCard
            title="Auditoría"
            description="Bitácora y verificación"
            icon={<Users className="h-8 w-8" />}
            href="/auditoria"
            color="gray"
            available={false}
          />
        </div>
      </div>

      {/* Últimos Movimientos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Últimos Movimientos</h2>
        </div>
        <div className="p-6">
          <EmptyState
            title="No hay movimientos recientes"
            description="Los movimientos de inventario aparecerán aquí una vez que se registren operaciones."
          />
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
  icon: React.ReactNode;
  bgColor: string;
}

function MetricCard({ title, value, icon, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${bgColor} rounded-md p-3`}>
          {icon}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
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
  available: boolean;
}

function QuickAccessCard({ title, description, icon, href, color, available }: QuickAccessCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  if (!available) {
    return (
      <div className="bg-white rounded-lg shadow p-6 opacity-60 cursor-not-allowed relative">
        <div className={`inline-flex p-3 rounded-md ${colorClasses[color]} opacity-50`}>
          {icon}
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Próximamente
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-all p-6 group hover:scale-105 duration-200"
    >
      <div className={`inline-flex p-3 rounded-md ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
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
