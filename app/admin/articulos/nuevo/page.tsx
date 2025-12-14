/**
 * Admin - Crear Nuevo Artículo
 */

import { ArticuloForm } from '@/components/forms/articulo-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NuevoArticuloPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/articulos"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Artículos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Artículo</h1>
          <p className="mt-1 text-sm text-gray-600">
            Complete la información para agregar un artículo al catálogo
          </p>
        </div>

        {/* Formulario */}
        <ArticuloForm mode="create" />
      </div>
    </div>
  );
}
