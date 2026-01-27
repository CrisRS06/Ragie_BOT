'use client';

/**
 * Componente AccessDenied
 * Muestra mensaje de acceso denegado cuando el usuario no tiene permisos
 */

import Link from 'next/link';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from './button';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export function AccessDenied({
  title = 'Acceso Denegado',
  message = 'No tiene permisos para acceder a esta sección. Contacte al administrador si cree que esto es un error.',
  backHref = '/dashboard',
  backLabel = 'Volver al Dashboard',
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {message}
        </p>
        <Link href={backHref}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
