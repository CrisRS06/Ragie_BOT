'use client'

/**
 * Panel de acciones de un pedido. Muestra solo los botones disponibles según
 * rol/estado/ownership y resuelve cada uno con modales (nunca window.prompt):
 *  - Aceptar / Marcar listo: ejecutan directo (reversibles).
 *  - Enviar: AlertDialog de confirmación (congela líneas). Si el stock no
 *    alcanza, el servidor responde 409 y se ofrece forzar (solo admin, con motivo).
 *  - Rechazar / Anular: MotivoDialog (textarea con validación).
 *  - Devolver a borrador (reabrir): AlertDialog de confirmación.
 *  - Entregar: EntregaDialog (receptor + cédula + cantidades).
 *  - Reducir cantidades: ReducirDialog (bajar líneas sin reabrir).
 * Cada resultado dispara un toast de éxito o error.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertDialog } from '@/components/ui/dialog'
import { MotivoDialog } from '@/components/pedidos/motivo-dialog'
import { EntregaDialog } from '@/components/pedidos/entrega-dialog'
import { ReducirDialog } from '@/components/pedidos/reducir-dialog'
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

interface Faltante {
  sku: string
  nombre: string
  demanda: number
  disponible: number
  faltante: number
}

interface Props {
  pedidoId: string
  estado: EstadoPedido
  rol: RolUsuario
  esSolicitante: boolean
  lineas: LineaEntrega[]
  onCompletado: () => void | Promise<void>
}

type ModalAbierto =
  | 'confirmar-enviar'
  | 'forzar-envio'
  | 'motivo-rechazar'
  | 'motivo-anular'
  | 'confirmar-reabrir'
  | 'entrega'
  | 'reducir'
  | null

const MENSAJE_EXITO: Record<AccionPedido, string> = {
  enviar: 'Pedido enviado',
  aceptar: 'Pedido aceptado',
  marcar_listo: 'Pedido listo para retiro',
  entregar: 'Pedido entregado',
  rechazar: 'Pedido rechazado',
  anular: 'Pedido anulado',
  reabrir: 'Pedido devuelto a borrador',
}

function resumenFaltantes(faltantes: Faltante[]): string {
  return faltantes
    .map((f) => `${f.sku}: pide ${f.demanda}, disponible ${f.disponible}`)
    .join('. ')
}

export function AccionesPanel({ pedidoId, estado, rol, esSolicitante, lineas, onCompletado }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<AccionPedido | null>(null)
  const [reduciendo, setReduciendo] = useState(false)
  const [modal, setModal] = useState<ModalAbierto>(null)
  const [faltantes, setFaltantes] = useState<Faltante[]>([])

  const esAdmin = rol === 'ADMINISTRADOR'
  const acciones = accionesDisponibles(estado, rol, esSolicitante)
  // Reducir no es una transición de estado: admin en ENVIADO/EN_PREPARACION,
  // solicitante solo en ENVIADO.
  const puedeReducir =
    (esAdmin && (estado === 'ENVIADO' || estado === 'EN_PREPARACION')) ||
    (esSolicitante && estado === 'ENVIADO')

  if (acciones.length === 0 && !puedeReducir) return null

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

  async function intentarEnviar(forzar = false, motivo?: string): Promise<void> {
    setPending('enviar')
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forzar, motivo }),
      })
      const data = await res.json()
      if (res.status === 409 && data.code === 'STOCK_INSUFICIENTE') {
        const fs: Faltante[] = Array.isArray(data.faltantes) ? data.faltantes : []
        setFaltantes(fs)
        if (data.puedeForzar) {
          setModal('forzar-envio')
        } else {
          setModal(null)
          toast.error('Stock insuficiente', resumenFaltantes(fs) || 'No hay stock disponible para este pedido')
        }
        return
      }
      if (!res.ok || !data.success) {
        toast.error('No se pudo enviar', data.error)
        return
      }
      toast.success(MENSAJE_EXITO.enviar)
      setModal(null)
      await onCompletado()
      router.refresh()
    } catch (err) {
      toast.error('Error de red', err instanceof Error ? err.message : undefined)
    } finally {
      setPending(null)
    }
  }

  async function ejecutarReducir(lineasReducidas: { id: string; cantidadSolicitada: number }[]): Promise<void> {
    setReduciendo(true)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/reducir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineas: lineasReducidas }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error('No se pudo reducir', data.error)
        return
      }
      toast.success('Cantidades reducidas')
      setModal(null)
      await onCompletado()
      router.refresh()
    } catch (err) {
      toast.error('Error de red', err instanceof Error ? err.message : undefined)
    } finally {
      setReduciendo(false)
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
      case 'reabrir':
        setModal('confirmar-reabrir')
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
            disabled={pending !== null || reduciendo}
            isLoading={pending === a}
            onClick={() => onClick(a)}
          >
            {LABEL_ACCION[a]}
          </Button>
        ))}
        {puedeReducir && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending !== null || reduciendo}
            isLoading={reduciendo}
            onClick={() => setModal('reducir')}
          >
            Reducir cantidades
          </Button>
        )}
      </div>

      <AlertDialog
        open={modal === 'confirmar-enviar'}
        onClose={() => setModal(null)}
        onConfirm={() => intentarEnviar(false)}
        title="Enviar pedido"
        description="Al enviar, las líneas quedan congeladas y no podrás editarlas. ¿Continuar?"
        confirmText="Enviar pedido"
        variant="warning"
        loading={pending === 'enviar'}
      />

      <MotivoDialog
        open={modal === 'forzar-envio'}
        onClose={() => setModal(null)}
        onConfirm={(motivo) => intentarEnviar(true, motivo)}
        titulo="Forzar envío sin stock"
        descripcion={`El pedido excede el stock disponible (${resumenFaltantes(faltantes)}). Como administrador podés enviarlo igual; quedará registrado con tu motivo.`}
        minLength={5}
        placeholder="Motivo para enviar sin stock suficiente..."
        confirmText="Forzar envío"
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

      <AlertDialog
        open={modal === 'confirmar-reabrir'}
        onClose={() => setModal(null)}
        onConfirm={() => ejecutar('reabrir')}
        title="Devolver a borrador"
        description="El pedido volverá a borrador para que puedas editar las líneas y reenviarlo. ¿Continuar?"
        confirmText="Devolver a borrador"
        variant="warning"
        loading={pending === 'reabrir'}
      />

      <EntregaDialog
        open={modal === 'entrega'}
        onClose={() => setModal(null)}
        onConfirm={(datos) => ejecutar('entregar', datos)}
        lineas={lineas}
        loading={pending === 'entregar'}
      />

      <ReducirDialog
        open={modal === 'reducir'}
        onClose={() => setModal(null)}
        onConfirm={ejecutarReducir}
        lineas={lineas}
        loading={reduciendo}
      />
    </div>
  )
}
