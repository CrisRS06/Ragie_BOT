'use client'

/**
 * Modal para reducir (solo bajar) las cantidades solicitadas de un pedido ya
 * enviado, sin devolverlo a borrador. Cada línea se puede bajar hasta 1 y nunca
 * subir. Solo se envían las líneas que efectivamente bajaron.
 */

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface LineaReducible {
  id: string
  cantidadSolicitada: number
  articulo: { sku: string; nombre: string; unidad_medida: string } | null
}

interface ReducirDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (lineas: { id: string; cantidadSolicitada: number }[]) => void | Promise<void>
  lineas: LineaReducible[]
  loading?: boolean
}

export function ReducirDialog({ open, onClose, onConfirm, lineas, loading = false }: ReducirDialogProps) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  useEffect(() => {
    if (open) {
      setCantidades(Object.fromEntries(lineas.map((l) => [l.id, l.cantidadSolicitada])))
    }
  }, [open, lineas])

  // Líneas que bajaron respecto a su valor actual (las únicas que se envían).
  const reducidas = useMemo(
    () =>
      lineas
        .map((l) => ({ id: l.id, actual: l.cantidadSolicitada, nueva: cantidades[l.id] ?? l.cantidadSolicitada }))
        .filter((l) => l.nueva < l.actual),
    [lineas, cantidades]
  )

  // Validez: cada valor editado debe ser entero ≥ 1 y ≤ su actual.
  const hayInvalida = lineas.some((l) => {
    const v = cantidades[l.id] ?? l.cantidadSolicitada
    return !Number.isInteger(v) || v < 1 || v > l.cantidadSolicitada
  })

  const puedeConfirmar = reducidas.length > 0 && !hayInvalida && !loading

  function confirmar() {
    if (!puedeConfirmar) return
    onConfirm(reducidas.map((l) => ({ id: l.id, cantidadSolicitada: l.nueva })))
  }

  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reducir cantidades</DialogTitle>
          <DialogDescription>
            Podés bajar la cantidad de una o más líneas. No se puede subir. Para subir o cambiar
            artículos, devolvé el pedido a borrador.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Artículo</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Nueva</th>
                  <th className="px-3 py-2 text-left">U.M.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {lineas.map((l) => {
                  const v = cantidades[l.id] ?? l.cantidadSolicitada
                  const invalida = !Number.isInteger(v) || v < 1 || v > l.cantidadSolicitada
                  return (
                    <tr key={l.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 text-zinc-600 font-mono text-xs">{l.articulo?.sku || '—'}</td>
                      <td className="px-3 py-2 text-zinc-900">{l.articulo?.nombre || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium">{l.cantidadSolicitada}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          max={l.cantidadSolicitada}
                          value={v}
                          disabled={loading}
                          onChange={(e) =>
                            setCantidades((prev) => ({ ...prev, [l.id]: Math.floor(Number(e.target.value)) || 0 }))
                          }
                          className={`w-20 px-2 py-1 text-right border rounded text-sm ${invalida ? 'border-red-400' : 'border-zinc-300'}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-600">{l.articulo?.unidad_medida || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {reducidas.length === 0 ? (
            <p className="text-xs text-zinc-500">Bajá al menos una cantidad para poder confirmar.</p>
          ) : (
            <Label>{reducidas.length} línea(s) se reducirán.</Label>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!puedeConfirmar} isLoading={loading}>
            Confirmar reducción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
