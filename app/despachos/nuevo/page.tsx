'use client';

/**
 * Página: Nueva Salida/Despacho PEPS Multi-Producto
 * Journey 2: Despacho usando algoritmo PEPS con múltiples productos
 */

import { DespachoMultiForm } from '@/components/forms/despacho-multi-form';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { AccessDenied } from '@/components/ui/access-denied';
import { RefreshCw } from 'lucide-react';

export default function NuevoDespachoPage() {
  const { hasAccess, loading, error } = useRoleAccess({
    requiredPermission: 'despachos.crear',
    redirectTo: '/despachos',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied message={error || undefined} backHref="/despachos" backLabel="Volver a Despachos" />;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Despacho PEPS</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Registre una salida de inventario con múltiples productos. El sistema consumirá
          automáticamente los lotes más antiguos primero (método PEPS).
        </p>
      </div>

      {/* Información PEPS */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Método PEPS (Primeras Entradas, Primeras Salidas)
            </h3>
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              <ul className="list-disc list-inside space-y-1">
                <li>Los lotes se consumen en orden de fecha de ingreso (más antiguo primero)</li>
                <li>Puede agregar múltiples productos en un solo despacho</li>
                <li>Si la cantidad excede un lote, se consumen múltiples lotes en cascada</li>
                <li>Cada línea se procesa de forma independiente usando PEPS</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario Multi-Producto */}
      <DespachoMultiForm />
    </div>
  );
}
