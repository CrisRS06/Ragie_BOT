'use client'

/**
 * Modal con textarea para acciones que requieren un motivo (Rechazar, Anular).
 * Reemplaza window.prompt: valida la longitud en vivo y deshabilita el botón
 * hasta cumplir el mínimo.
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface MotivoDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void | Promise<void>
  titulo: string
  descripcion?: string
  minLength: number
  placeholder?: string
  confirmText: string
  loading?: boolean
}

export function MotivoDialog({
  open,
  onClose,
  onConfirm,
  titulo,
  descripcion,
  minLength,
  placeholder,
  confirmText,
  loading = false,
}: MotivoDialogProps) {
  const [motivo, setMotivo] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setMotivo('')
      setTouched(false)
    }
  }, [open])

  const largo = motivo.trim().length
  const valido = largo >= minLength
  const mostrarError = touched && !valido

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="motivo-textarea" required>Motivo</Label>
          <textarea
            id="motivo-textarea"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            rows={4}
            disabled={loading}
            className={`mt-1 flex w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900
              placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              ${mostrarError ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300 focus-visible:ring-blue-600'}`}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className={mostrarError ? 'text-red-600' : 'text-gray-500'}>
              {mostrarError ? `El motivo debe tener al menos ${minLength} caracteres` : ''}
            </span>
            <span className={largo < minLength ? 'text-gray-400' : 'text-green-600'}>
              {largo}/{minLength}
            </span>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => valido && onConfirm(motivo.trim())}
            disabled={!valido || loading}
            isLoading={loading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
