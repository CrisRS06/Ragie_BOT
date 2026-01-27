'use client';

/**
 * AuthContext - Proveedor de autenticación global
 * Centraliza las llamadas a /api/auth/me para evitar múltiples requests
 * Refresca automáticamente al cambiar de ruta (después de login redirect)
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

type RolUsuario = 'ADMINISTRADOR' | 'OPERADOR' | 'AUDITOR';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  rolDisplay?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          nombre: data.user.nombre,
          rol: data.user.rol as RolUsuario,
          rolDisplay: data.user.rolDisplay,
        });
        setError(null);
      } else {
        setUser(null);
        setError(data.error || 'No autenticado');
      }
    } catch (err) {
      console.error('Error al obtener usuario:', err);
      setUser(null);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Refrescar cuando se navega desde /login a otra página (después de login exitoso)
  useEffect(() => {
    if (previousPathRef.current === '/login' && pathname !== '/login' && !user) {
      fetchUser();
    }
    previousPathRef.current = pathname;
  }, [pathname, user, fetchUser]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
