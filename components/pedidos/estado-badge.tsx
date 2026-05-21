import { LABEL_ESTADO, type EstadoPedido } from '@/lib/orden-pedido/transiciones'

const COLORES: Record<EstadoPedido, string> = {
  BORRADOR: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  ENVIADO: 'bg-blue-100 text-blue-800 border-blue-300',
  EN_PREPARACION: 'bg-amber-100 text-amber-800 border-amber-300',
  LISTO_RETIRO: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  ENTREGADO: 'bg-green-100 text-green-800 border-green-300',
  RECHAZADO: 'bg-red-100 text-red-800 border-red-300',
  ANULADO: 'bg-zinc-200 text-zinc-600 border-zinc-400 line-through',
}

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${COLORES[estado]}`}>
      {LABEL_ESTADO[estado]}
    </span>
  )
}
