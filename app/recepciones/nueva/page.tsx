'use client';

/**
 * Página: Nueva Recepción de Mercancía
 * Journey 1 Crítico - Con navegación global mejorada
 */

import { RecepcionForm } from '@/components/forms/recepcion-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { AccessDenied } from '@/components/ui/access-denied';
import { RefreshCw } from 'lucide-react';

export default function NuevaRecepcionPage() {
  const { hasAccess, loading, error } = useRoleAccess({
    requiredPermission: 'recepciones.crear',
    redirectTo: '/recepciones',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied message={error || undefined} backHref="/recepciones" backLabel="Volver a Recepciones" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header de página */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nueva Recepción de Mercancía
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Registrar entrada de productos al inventario
        </p>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de la Recepción</CardTitle>
          <CardDescription>
            Complete la información de la mercancía recibida. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecepcionForm />
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Instrucciones
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Seleccione el artículo desde el catálogo</li>
          <li>La fecha de vencimiento debe ser futura</li>
          <li>El sistema creará automáticamente un nuevo lote con timestamp PEPS</li>
          <li>Se registrará en la bitácora de auditoría</li>
        </ul>
      </div>
    </div>
  );
}
