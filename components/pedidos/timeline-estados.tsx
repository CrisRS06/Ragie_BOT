/**
 * Timeline visual del flujo de estados de un pedido.
 * Muestra qué hitos ya se alcanzaron y cuándo.
 */
import { Check, Circle, X } from 'lucide-react'
import type { EstadoPedido } from '@/lib/orden-pedido/transiciones'

interface TimelineItem {
  label: string
  fecha: string | null
  alcanzado: boolean
}

interface Props {
  estado: EstadoPedido
  fechaCreacion: string
  fechaEnvio: string | null
  fechaAceptacion: string | null
  fechaListo: string | null
  fechaEntrega: string | null
}

function fmt(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function TimelineEstados({
  estado, fechaCreacion, fechaEnvio, fechaAceptacion, fechaListo, fechaEntrega,
}: Props) {
  const esRechazado = estado === 'RECHAZADO'
  const esAnulado = estado === 'ANULADO'
  const items: TimelineItem[] = [
    { label: 'Creado', fecha: fmt(fechaCreacion), alcanzado: true },
    { label: 'Enviado', fecha: fmt(fechaEnvio), alcanzado: !!fechaEnvio },
    { label: 'En preparación', fecha: fmt(fechaAceptacion), alcanzado: !!fechaAceptacion },
    { label: 'Listo para retiro', fecha: fmt(fechaListo), alcanzado: !!fechaListo },
    { label: 'Entregado', fecha: fmt(fechaEntrega), alcanzado: !!fechaEntrega },
  ]

  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => {
        const Icon = it.alcanzado ? Check : Circle
        const colorIcon = it.alcanzado ? 'text-green-600' : 'text-zinc-300'
        return (
          <div key={it.label} className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${colorIcon}`} />
            <div className="flex-1">
              <div className={`text-sm font-medium ${it.alcanzado ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {it.label}
              </div>
              {it.fecha && <div className="text-xs text-zinc-500">{it.fecha}</div>}
            </div>
          </div>
        )
      })}
      {(esRechazado || esAnulado) && (
        <div className="flex items-center gap-3 pt-2 border-t border-zinc-200">
          <X className="h-5 w-5 text-red-600" />
          <div className="text-sm font-medium text-red-700">
            {esRechazado ? 'Pedido rechazado' : 'Pedido anulado'}
          </div>
        </div>
      )}
    </div>
  )
}
