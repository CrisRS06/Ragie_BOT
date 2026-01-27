/**
 * Hook para manejar notificaciones Toast
 */

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

// Estado global simple para los toasts
let listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function emitChange() {
  for (const listener of listeners) {
    listener(memoryState);
  }
}

function addToast(toast: Omit<Toast, 'id'>): string {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: Toast = {
    ...toast,
    id,
    duration: toast.duration ?? 5000,
  };

  memoryState = {
    toasts: [...memoryState.toasts, newToast],
  };

  emitChange();

  // Auto-remover después del duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }

  return id;
}

function removeToast(id: string) {
  memoryState = {
    toasts: memoryState.toasts.filter((t) => t.id !== id),
  };
  emitChange();
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState);

  // Suscribirse a cambios (FIXED: usar useEffect en lugar de useState para cleanup)
  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    return addToast(options);
  }, []);

  const success = useCallback((title: string, message?: string) => {
    return addToast({ type: 'success', title, message });
  }, []);

  const error = useCallback((title: string, message?: string) => {
    return addToast({ type: 'error', title, message });
  }, []);

  const warning = useCallback((title: string, message?: string) => {
    return addToast({ type: 'warning', title, message });
  }, []);

  const info = useCallback((title: string, message?: string) => {
    return addToast({ type: 'info', title, message });
  }, []);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  return {
    toasts: state.toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
  };
}

// Funciones de utilidad para usar fuera de componentes
export const toast = {
  success: (title: string, message?: string) =>
    addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    addToast({ type: 'info', title, message }),
  dismiss: removeToast,
};
