/**
 * Página: Nueva Salida/Despacho PEPS
 * Journey 2: Despacho usando algoritmo PEPS
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DespachoForm } from '@/components/forms/despacho-form';

export default function NuevoDespachoPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Despacho PEPS</h1>
        <p className="text-gray-600 mt-1">
          Registre una salida de inventario. El sistema consumirá automáticamente los lotes
          más antiguos primero (método PEPS).
        </p>
      </div>

      {/* Información PEPS */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
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
            <h3 className="text-sm font-medium text-amber-800">
              Método PEPS (Primeras Entradas, Primeras Salidas)
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Los lotes se consumen en orden de fecha de ingreso (más antiguo primero)</li>
                <li>El sistema muestra los lotes en el orden correcto para su referencia</li>
                <li>Si la cantidad solicitada excede un lote, se consumen múltiples lotes en cascada</li>
                <li>Las alertas FEFO (próximos a vencer) son informativas, no afectan el orden PEPS</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Despacho</CardTitle>
          <CardDescription>
            Complete los datos del despacho. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DespachoForm />
        </CardContent>
      </Card>
    </div>
  );
}
