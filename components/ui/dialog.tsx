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
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Content */}
      <div className="relative z-50 animate-in zoom-in-95 duration-200">
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
        'bg-white rounded-lg shadow-xl w-full max-w-md mx-4',
        'border border-gray-200',
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
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
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
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

// Dialog Footer
export function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-gray-200 flex justify-end gap-3',
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
