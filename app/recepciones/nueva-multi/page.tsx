'use client';

/**
 * Página: Nueva Recepción Multi-Producto
 * Permite crear documentos de recepción con múltiples líneas
 */

import Link from 'next/link';
import { RecepcionMultiForm } from '@/components/forms/recepcion-multi-form';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Package, RefreshCw } from 'lucide-react';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { AccessDenied } from '@/components/ui/access-denied';

export default function NuevaRecepcionMultiPage() {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/recepciones"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a Recepciones
          </Link>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Nueva Recepción Multi-Producto
              </h1>
              <p className="text-sm text-gray-600">
                Cree un documento de recepción con múltiples líneas de productos
              </p>
            </div>
          </div>
        </div>

        {/* Información */}
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Flujo de trabajo
              </p>
              <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>
                  <strong>Paso 1:</strong> Complete los datos del documento y agregue las líneas de productos
                </li>
                <li>
                  <strong>Paso 2:</strong> Guarde el documento (quedará en estado BORRADOR)
                </li>
                <li>
                  <strong>Paso 3:</strong> Procese el documento para crear los lotes e inventariar los productos
                </li>
              </ul>
              <p className="mt-2 text-xs text-blue-600">
                El sistema crea automáticamente timestamps únicos para cada línea, garantizando el orden PEPS correcto.
              </p>
            </div>
          </div>
        </Card>

        {/* Formulario */}
        <RecepcionMultiForm />
      </div>
    </div>
  );
}
