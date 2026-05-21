'use client'

/**
 * Modal de entrega de un pedido. Reemplaza los dos window.prompt secuenciales:
 * captura receptor + cédula con validación en vivo y permite ajustar la
 * cantidad entregada por línea (entrega parcial) antes de confirmar.
 */

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LineasTabla } from '@/components/pedidos/lineas-tabla'

interface LineaEntrega {
  id: string
  cantidadSolicitada: number
  cantidadEntregada: number | null
  notas: string | null
  articulo: { sku: string; nombre: string; unidad_medida: string } | null
}

interface EntregaDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (datos: {
    receptor: string
    cedula: string
    lineas: { id: string; cantidadEntregada: number }[]
  }) => void | Promise<void>
  lineas: LineaEntrega[]
  loading?: boolean
}

export function EntregaDialog({ open, onClose, onConfirm, lineas, loading = false }: EntregaDialogProps) {
  const [receptor, setReceptor] = useState('')
  const [cedula, setCedula] = useState('')
  const [touched, setTouched] = useState(false)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  useEffect(() => {
    if (open) {
      setReceptor('')
      setCedula('')
      setTouched(false)
      setCantidades(Object.fromEntries(lineas.map((l) => [l.id, l.cantidadSolicitada])))
    }
  }, [open, lineas])

  const receptorValido = receptor.trim().length >= 3
  const cedulaValida = cedula.trim().length > 0
  const totalEntregado = useMemo(
    () => Object.values(cantidades).reduce((s, n) => s + (n || 0), 0),
    [cantidades]
  )
  const hayEntrega = totalEntregado > 0
  const hayParcial = lineas.some((l) => (cantidades[l.id] ?? l.cantidadSolicitada) < l.cantidadSolicitada)
  const puedeConfirmar = receptorValido && cedulaValida && hayEntrega && !loading

  function confirmar() {
    if (!puedeConfirmar) {
      setTouched(true)
      return
    }
    onConfirm({
      receptor: receptor.trim(),
      cedula: cedula.trim(),
      lineas: lineas.map((l) => ({
        id: l.id,
        cantidadEntregada: cantidades[l.id] ?? l.cantidadSolicitada,
      })),
    })
  }

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Entregar pedido</DialogTitle>
          <DialogDescription>
            Esta acción descuenta inventario y es definitiva. Confirmá los datos del receptor y las cantidades.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="entrega-receptor" required>Nombre del receptor</Label>
              <Input
                id="entrega-receptor"
                value={receptor}
                onChange={(e) => setReceptor(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Nombre completo"
                disabled={loading}
                error={touched && !receptorValido ? 'Mínimo 3 caracteres' : undefined}
              />
            </div>
            <div>
              <Label htmlFor="entrega-cedula" required>Cédula del receptor</Label>
              <Input
                id="entrega-cedula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="0-0000-0000"
                disabled={loading}
                error={touched && !cedulaValida ? 'La cédula es obligatoria' : undefined}
              />
            </div>
          </div>

          <div>
            <Label>Cantidades a entregar</Label>
            <p className="text-xs text-gray-500 mb-2">
              Podés entregar menos de lo solicitado. No se puede entregar más.
            </p>
            <LineasTabla
              lineas={lineas}
              mostrarEntregada
              valoresEntregada={cantidades}
              onChangeEntregada={(id, value) =>
                setCantidades((prev) => ({ ...prev, [id]: value }))
              }
            />
          </div>

          {hayParcial && hayEntrega && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Entrega parcial: una o más líneas se entregan con menos de lo solicitado.
            </div>
          )}
          {touched && !hayEntrega && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              Debe entregar al menos una unidad.
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={!puedeConfirmar}
            isLoading={loading}
          >
            Confirmar entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
