'use client'

/**
 * Panel de acciones de un pedido. Muestra solo los botones disponibles según
 * rol/estado/ownership y resuelve cada uno con modales (nunca window.prompt):
 *  - Aceptar / Marcar listo: ejecutan directo (reversibles).
 *  - Enviar: AlertDialog de confirmación (congela líneas).
 *  - Rechazar / Anular: MotivoDialog (textarea con validación).
 *  - Entregar: EntregaDialog (receptor + cédula + cantidades).
 * Cada resultado dispara un toast de éxito o error.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertDialog } from '@/components/ui/dialog'
import { MotivoDialog } from '@/components/pedidos/motivo-dialog'
import { EntregaDialog } from '@/components/pedidos/entrega-dialog'
import { toast } from '@/lib/hooks/use-toast'
import {
  accionesDisponibles,
  LABEL_ACCION,
  type AccionPedido,
  type EstadoPedido,
} from '@/lib/orden-pedido/transiciones'
import type { RolUsuario } from '@/lib/permissions'

interface LineaEntrega {
  id: string
  cantidadSolicitada: number
  cantidadEntregada: number | null
  notas: string | null
  articulo: { sku: string; nombre: string; unidad_medida: string } | null
}

interface Props {
  pedidoId: string
  estado: EstadoPedido
  rol: RolUsuario
  esSolicitante: boolean
  lineas: LineaEntrega[]
  onCompletado: () => void | Promise<void>
}

type ModalAbierto = 'confirmar-enviar' | 'motivo-rechazar' | 'motivo-anular' | 'entrega' | null

const MENSAJE_EXITO: Record<AccionPedido, string> = {
  enviar: 'Pedido enviado',
  aceptar: 'Pedido aceptado',
  marcar_listo: 'Pedido listo para retiro',
  entregar: 'Pedido entregado',
  rechazar: 'Pedido rechazado',
  anular: 'Pedido anulado',
}

export function AccionesPanel({ pedidoId, estado, rol, esSolicitante, lineas, onCompletado }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<AccionPedido | null>(null)
  const [modal, setModal] = useState<ModalAbierto>(null)

  const acciones = accionesDisponibles(estado, rol, esSolicitante)
  if (acciones.length === 0) return null

  async function ejecutar(accion: AccionPedido, body?: Record<string, unknown>): Promise<void> {
    const ruta = accion === 'marcar_listo' ? 'listo' : accion
    setPending(accion)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/${ruta}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(`No se pudo ${LABEL_ACCION[accion].toLowerCase()}`, data.error)
        return
      }
      toast.success(MENSAJE_EXITO[accion])
      setModal(null)
      await onCompletado()
      router.refresh()
    } catch (err) {
      toast.error('Error de red', err instanceof Error ? err.message : undefined)
    } finally {
      setPending(null)
    }
  }

  function onClick(accion: AccionPedido) {
    switch (accion) {
      case 'aceptar':
      case 'marcar_listo':
        ejecutar(accion)
        break
      case 'enviar':
        setModal('confirmar-enviar')
        break
      case 'rechazar':
        setModal('motivo-rechazar')
        break
      case 'anular':
        setModal('motivo-anular')
        break
      case 'entregar':
        setModal('entrega')
        break
    }
  }

  const variant = (a: AccionPedido): 'default' | 'destructive' | 'outline' => {
    if (a === 'rechazar' || a === 'anular') return 'destructive'
    if (a === 'enviar' || a === 'entregar') return 'default'
    return 'outline'
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {acciones.map((a) => (
          <Button
            key={a}
            variant={variant(a)}
            size="sm"
            disabled={pending !== null}
            isLoading={pending === a}
            onClick={() => onClick(a)}
          >
            {LABEL_ACCION[a]}
          </Button>
        ))}
      </div>

      <AlertDialog
        open={modal === 'confirmar-enviar'}
        onClose={() => setModal(null)}
        onConfirm={() => ejecutar('enviar')}
        title="Enviar pedido"
        description="Al enviar, las líneas quedan congeladas y no podrás editarlas. ¿Continuar?"
        confirmText="Enviar pedido"
        variant="warning"
        loading={pending === 'enviar'}
      />

      <MotivoDialog
        open={modal === 'motivo-rechazar'}
        onClose={() => setModal(null)}
        onConfirm={(motivo) => ejecutar('rechazar', { motivo })}
        titulo="Rechazar pedido"
        descripcion="El solicitante verá el motivo. El pedido no se podrá reactivar."
        minLength={10}
        placeholder="Explicá por qué se rechaza el pedido..."
        confirmText="Rechazar pedido"
        loading={pending === 'rechazar'}
      />

      <MotivoDialog
        open={modal === 'motivo-anular'}
        onClose={() => setModal(null)}
        onConfirm={(motivo) => ejecutar('anular', { motivo })}
        titulo="Anular pedido"
        descripcion="El pedido quedará anulado de forma permanente."
        minLength={5}
        placeholder="Motivo de la anulación..."
        confirmText="Anular pedido"
        loading={pending === 'anular'}
      />

      <EntregaDialog
        open={modal === 'entrega'}
        onClose={() => setModal(null)}
        onConfirm={(datos) => ejecutar('entregar', datos)}
        lineas={lineas}
        loading={pending === 'entregar'}
      />
    </div>
  )
}
