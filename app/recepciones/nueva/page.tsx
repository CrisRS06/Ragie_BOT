/**
 * Página: Nueva Recepción de Mercancía
 * Journey 1 Crítico - Con navegación global mejorada
 */

import { RecepcionForm } from '@/components/forms/recepcion-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NuevaRecepcionPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header de página */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Nueva Recepción de Mercancía
        </h1>
        <p className="mt-1 text-sm text-gray-600">
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
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          📋 Instrucciones
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Seleccione el artículo desde el catálogo</li>
          <li>La fecha de vencimiento debe ser futura</li>
          <li>El sistema creará automáticamente un nuevo lote con timestamp PEPS</li>
          <li>Se registrará en la bitácora de auditoría</li>
        </ul>
      </div>
    </div>
  );
}
