/**
 * Dashboard Principal
 * Vista general del sistema con métricas clave y accesos rápidos
 */

import { Package, TrendingUp, AlertTriangle, FileText, ClipboardList, Users } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema de Inventario PEPS
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Patronato Nacional de la Infancia - Costa Rica
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Usuario: <span className="font-medium">Administrador</span>
              </span>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertas Críticas */}
        <div className="mb-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Artículos */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Artículos Activos
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">145</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Movimientos del Mes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Movimientos del Mes
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">248</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Alertas de Vencimiento */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Próximos a Vencer
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">12</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Cortes Realizados */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cortes del Año
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">8</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
            icon={<TrendingUp className="h-8 w-8" />}
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
            title="Catálogo SIGAF"
            description="Gestionar descripciones SIGAF"
            icon={<ClipboardList className="h-8 w-8" />}
            href="/articulos/sigaf"
            color="indigo"
          />
          <QuickAccessCard
            title="Usuarios"
            description="Administrar usuarios y permisos"
            icon={<Users className="h-8 w-8" />}
            href="/usuarios"
            color="gray"
          />
        </div>

        {/* Últimos Movimientos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Últimos Movimientos</h2>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <p>Los movimientos aparecerán aquí una vez que se registren operaciones.</p>
              <p className="text-sm mt-2">Sistema listo para operar.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Sistema de Inventario PEPS © 2025 - Patronato Nacional de la Infancia
            <br />
            <span className="text-xs">
              Cumplimiento regulatorio completo | Versión 1.0.0
            </span>
          </p>
        </div>
      </footer>
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
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
    indigo: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
    gray: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };

  return (
    <a
      href={href}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      <div className={`inline-flex p-3 rounded-md ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </a>
  );
}
