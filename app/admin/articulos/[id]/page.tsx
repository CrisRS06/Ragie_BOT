'use client';

/**
 * Admin - Editar Artículo
 */

import { useState, useEffect, use } from 'react';
import { ArticuloForm } from '@/components/forms/articulo-form';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface Articulo {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  descripcionSIGAF: string;
  codigoSIGAF?: string | null;
  unidadMedida: string;
  stockMinimo?: number | null;
  stockMaximo?: number | null;
  requiereVencimiento: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditarArticuloPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticulo();
  }, [resolvedParams.id]);

  const fetchArticulo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/articulos/${resolvedParams.id}`);
      const data = await response.json();

      if (data.success) {
        setArticulo(data.data);
      } else {
        setError(data.error || 'Artículo no encontrado');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando artículo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/admin/articulos"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Artículos
          </Link>

          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Editar Artículo</h1>
          <p className="mt-1 text-sm text-gray-600">
            Modifique la información del artículo{' '}
            <span className="font-medium">{articulo?.sku}</span>
          </p>
        </div>

        {/* Formulario */}
        <ArticuloForm mode="edit" articulo={articulo} />
      </div>
    </div>
  );
}
