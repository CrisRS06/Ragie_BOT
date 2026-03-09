'use client';

/**
 * Hook para control de acceso basado en roles
 * Verifica si el usuario tiene los permisos necesarios
 * Usa AuthContext para evitar múltiples llamadas a /api/auth/me
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISOS_POR_ROL } from '@/lib/permissions';
import type { RolUsuario } from '@/lib/permissions';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  rolDisplay?: string;
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

export function useRoleAccess(options: UseRoleAccessOptions = {}): UseRoleAccessReturn {
  const { requiredRoles, requiredPermission, redirectTo } = options;
  const router = useRouter();
  const { user: authUser, loading: authLoading, error: authError } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Esperar a que cargue la autenticación
    if (authLoading) return;

    // Usuario no autenticado
    if (!authUser) {
      setHasAccess(false);
      setError(authError || 'No autenticado');
      if (redirectTo && !hasRedirected.current) {
        hasRedirected.current = true;
        router.push(redirectTo);
      }
      return;
    }

    // Verificar acceso por rol
    if (requiredRoles && requiredRoles.length > 0) {
      const roleMatch = requiredRoles.includes(authUser.rol);
      if (!roleMatch) {
        setHasAccess(false);
        setError('No tiene permisos para acceder a esta sección');
        if (redirectTo && !hasRedirected.current) {
          hasRedirected.current = true;
          router.push(redirectTo);
        }
        return;
      }
    }

    // Verificar acceso por permiso específico
    if (requiredPermission) {
      const permisos = PERMISOS_POR_ROL[authUser.rol] || [];
      const permissionGranted = permisos.includes(requiredPermission);
      if (!permissionGranted) {
        setHasAccess(false);
        setError('No tiene permisos para realizar esta acción');
        if (redirectTo && !hasRedirected.current) {
          hasRedirected.current = true;
          router.push(redirectTo);
        }
        return;
      }
    }

    // Acceso concedido
    setHasAccess(true);
    setError(null);
  }, [authUser, authLoading, authError, requiredRoles, requiredPermission, redirectTo, router]);

  // Convertir authUser al tipo User esperado
  const user: User | null = authUser ? {
    id: authUser.id,
    email: authUser.email,
    nombre: authUser.nombre,
    rol: authUser.rol,
    rolDisplay: authUser.rolDisplay,
  } : null;

  return { user, loading: authLoading, hasAccess, error };
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

// Re-export for convenience
export { hasPermission } from '@/lib/permissions';
export type { RolUsuario } from '@/lib/permissions';
