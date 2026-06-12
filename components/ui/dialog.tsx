'use client';

/**
 * Componente Dialog - Modal de confirmación
 */

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

// Dialog Root
export function Dialog({ open, onClose, children }: DialogProps) {
  // Cerrar con Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Content. w-full + justify-center acotan el ancho al viewport (el modal
          ya no se sale por los lados en pantallas angostas como un teléfono) y
          max-h-full deja que DialogContent haga scroll interno en modales altos.
          El onClick cierra solo si se toca el espacio vacío del wrapper (no el
          modal), preservando "tocar afuera para cerrar". */}
      <div
        className="relative z-50 flex max-h-full w-full justify-center animate-in zoom-in-95 duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Dialog Content
export function DialogContent({ className, children }: DialogContentProps) {
  return (
    <div
      className={cn(
        // Sin mx-4: el padding del contenedor raíz ya separa el modal de los
        // bordes. El ancho lo limita el wrapper (w-full + justify-center).
        'bg-white rounded-lg shadow-xl w-full max-w-md',
        'border border-gray-200',
        // Columna acotada a la altura visible. Combinado con DialogBody
        // (overflow-y-auto) y header/footer (shrink-0), evita que el contenido
        // se salga de la pantalla en modales con tablas largas.
        'flex max-h-[calc(100dvh-2rem)] flex-col',
        className
      )}
    >
      {children}
    </div>
  );
}

// Dialog Header
export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn('shrink-0 px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
}

// Dialog Title
export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h2>
  );
}

// Dialog Description
export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return (
    <div className={cn('mt-1 text-sm text-gray-600', className)}>
      {children}
    </div>
  );
}

// Dialog Body (for content between header and footer)
export function DialogBody({ className, children }: DialogContentProps) {
  return (
    // min-h-0 + overflow-y-auto: en un flex-col acotado, este cuerpo es la única
    // región que hace scroll cuando el contenido excede la altura disponible.
    <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4', className)}>
      {children}
    </div>
  );
}

// Dialog Footer
export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'shrink-0 px-6 py-4 border-t border-gray-200 flex justify-end gap-3',
        className
      )}
    >
      {children}
    </div>
  );
}

// Alert Dialog para confirmaciones destructivas
interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default' | 'destructive';
  loading?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loading = false,
}: AlertDialogProps) {
  const variantStyles = {
    danger: 'destructive',
    destructive: 'destructive',
    warning: 'default',
    default: 'default',
  } as const;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variantStyles[variant]}
            onClick={onConfirm}
            isLoading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
