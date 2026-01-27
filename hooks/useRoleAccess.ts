'use client';

/**
 * Hook para control de acceso basado en roles
 * Verifica si el usuario tiene los permisos necesarios
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type RolUsuario = 'ADMINISTRADOR' | 'OPERADOR' | 'AUDITOR';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
}

interface UseRoleAccessOptions {
  requiredRoles?: RolUsuario[];
  requiredPermission?: string;
  redirectTo?: string;
}

interface UseRoleAccessReturn {
  user: User | null;
  loading: boolean;
  hasAccess: boolean;
  error: string | null;
}

// Matriz de permisos por rol
const PERMISOS_POR_ROL: Record<RolUsuario, string[]> = {
  ADMINISTRADOR: [
    'articulos.crear',
    'articulos.editar',
    'articulos.eliminar',
    'recepciones.crear',
    'despachos.crear',
    'despachos.excepcion_peps',
    'informes.generar',
    'bitacora.ver',
    'bitacora.verificar',
    'usuarios.gestionar',
    'admin.acceso',
  ],
  OPERADOR: [
    'articulos.ver',
    'recepciones.crear',
    'despachos.crear',
    'inventario.ver',
  ],
  AUDITOR: [
    'articulos.ver',
    'inventario.ver',
    'informes.ver',
    'informes.descargar',
    'bitacora.ver',
    'bitacora.verificar',
    'bitacora.exportar',
  ],
};

export function useRoleAccess(options: UseRoleAccessOptions = {}): UseRoleAccessReturn {
  const { requiredRoles, requiredPermission, redirectTo } = options;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!data.success || !data.user) {
          setError('No autenticado');
          setHasAccess(false);
          if (redirectTo) {
            router.push(redirectTo);
          }
          return;
        }

        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          nombre: data.user.nombre,
          rol: data.user.rol as RolUsuario,
        };
        setUser(userData);

        // Verificar acceso por rol
        if (requiredRoles && requiredRoles.length > 0) {
          const roleMatch = requiredRoles.includes(userData.rol);
          if (!roleMatch) {
            setHasAccess(false);
            setError('No tiene permisos para acceder a esta sección');
            if (redirectTo) {
              router.push(redirectTo);
            }
            return;
          }
        }

        // Verificar acceso por permiso específico
        if (requiredPermission) {
          const permisos = PERMISOS_POR_ROL[userData.rol] || [];
          const hasPermission = permisos.includes(requiredPermission);
          if (!hasPermission) {
            setHasAccess(false);
            setError('No tiene permisos para realizar esta acción');
            if (redirectTo) {
              router.push(redirectTo);
            }
            return;
          }
        }

        setHasAccess(true);
        setError(null);
      } catch (err) {
        console.error('Error al verificar acceso:', err);
        setError('Error al verificar permisos');
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requiredRoles, requiredPermission, redirectTo, router]);

  return { user, loading, hasAccess, error };
}

/**
 * Hook específico para páginas de administración
 * Solo permite acceso a ADMINISTRADOR
 */
export function useAdminAccess() {
  return useRoleAccess({
    requiredRoles: ['ADMINISTRADOR'],
  });
}

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(rol: RolUsuario, permission: string): boolean {
  const permisos = PERMISOS_POR_ROL[rol] || [];
  return permisos.includes(permission);
}
