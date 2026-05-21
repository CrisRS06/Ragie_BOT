'use client'

/**
 * Listado de Órdenes de Pedido (PANI ↔ Super Cadena).
 * - AUDITOR ve solo los propios.
 * - OPERADOR/ADMIN ven todos; tab "Bandeja" filtra ENVIADO + EN_PREPARACION.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, RefreshCw, Search, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/lib/permissions'
import { EstadoBadge } from '@/components/pedidos/estado-badge'
import { LABEL_ESTADO, type EstadoPedido } from '@/lib/orden-pedido/transiciones'

interface PedidoListItem {
  id: string
  numero: string
  estado: EstadoPedido
  observaciones: string | null
  fechaEnvio: string | null
  fechaEntrega: string | null
  createdAt: string
  totalLineas: number
  bodega: { codigo: string; nombre: string } | null
  unidadReceptora: { codigo: string; nombre: string } | null
  solicitante: { nombre: string; email: string | null } | null
}

const ESTADOS_FILTRO: EstadoPedido[] = [
  'BORRADOR', 'ENVIADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENTREGADO', 'RECHAZADO', 'ANULADO',
]

export default function PedidosPage() {
  const { user } = useAuth()
  const canCreate = user?.rol ? hasPermission(user.rol, 'pedidos.crear') : false
  const canVerTodos = user?.rol ? hasPermission(user.rol, 'pedidos.ver_todos') : false

  const searchParams = useSearchParams()
  const estadoParam = searchParams.get('estado')
  const estadoInicial: EstadoPedido | '' =
    estadoParam && (ESTADOS_FILTRO as string[]).includes(estadoParam)
      ? (estadoParam as EstadoPedido)
      : ''
  const qInicial = searchParams.get('q') ?? ''
  const tabInicial: 'todos' | 'bandeja' = searchParams.get('bandeja') === 'true' ? 'bandeja' : 'todos'

  const [pedidos, setPedidos] = useState<PedidoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [estado, setEstado] = useState<EstadoPedido | ''>(estadoInicial)
  const [busqueda, setBusqueda] = useState(qInicial)
  const [tab, setTab] = useState<'todos' | 'bandeja'>(tabInicial)
  const limite = 20

  // Default tab según rol
  useEffect(() => {
    if (canVerTodos) setTab('bandeja')
  }, [canVerTodos])

  const fetchPedidos = useCallback(
    async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          limite: String(limite),
          offset: String(page * limite),
        })
        if (estado) params.set('estado', estado)
        if (busqueda) params.set('q', busqueda)
        if (tab === 'bandeja' && canVerTodos) params.set('bandeja', 'true')
        const res = await fetch(`/api/pedidos?${params}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Error')
        setPedidos(data.pedidos)
        setTotal(data.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de red')
      } finally {
        setLoading(false)
      }
    },
    [page, estado, busqueda, tab, canVerTodos]
  )

  useEffect(() => {
    fetchPedidos()
  }, [fetchPedidos])

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-zinc-600" />
          <h1 className="text-xl font-semibold">Órdenes de Pedido</h1>
        </div>
        {canCreate && (
          <Link href="/pedidos/nuevo">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo pedido</Button>
          </Link>
        )}
      </div>

      {canVerTodos && (
        <div className="flex gap-1 border-b border-zinc-200">
          <button
            onClick={() => { setTab('bandeja'); setPage(0) }}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'bandeja' ? 'border-blue-600 text-blue-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Bandeja (pendientes)
          </button>
          <button
            onClick={() => { setTab('todos'); setPage(0) }}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'todos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Todos
          </button>
        </div>
      )}

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto] items-end">
          <div>
            <label className="text-xs text-zinc-600 block mb-1">Buscar por número</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPage(0) }}
                placeholder="PANI-2026-..."
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-600 block mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => { setEstado(e.target.value as EstadoPedido | ''); setPage(0) }}
              className="w-full h-9 px-2 border border-zinc-300 rounded-md text-sm bg-white"
            >
              <option value="">Todos</option>
              {ESTADOS_FILTRO.map((e) => <option key={e} value={e}>{LABEL_ESTADO[e]}</option>)}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPedidos}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
          </Button>
        </div>
      </Card>

      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-zinc-200">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-10 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <ClipboardList className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-700">No hay pedidos para mostrar</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              {canCreate
                ? 'Cuando crees una orden de pedido aparecerá acá. Empezá creando la primera.'
                : 'Todavía no hay órdenes de pedido que coincidan con los filtros.'}
            </p>
            {canCreate && (
              <Link href="/pedidos/nuevo" className="mt-4">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Crear primer pedido</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-medium text-zinc-600 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Número</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Solicitante</th>
                  <th className="px-3 py-2 text-left">Bodega</th>
                  <th className="px-3 py-2 text-right">Líneas</th>
                  <th className="px-3 py-2 text-left">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/pedidos/${p.id}`} className="text-blue-700 hover:underline">{p.numero}</Link>
                    </td>
                    <td className="px-3 py-2"><EstadoBadge estado={p.estado} /></td>
                    <td className="px-3 py-2">{p.solicitante?.nombre || '—'}</td>
                    <td className="px-3 py-2 text-zinc-600">{p.bodega ? `${p.bodega.codigo}` : '—'}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{p.totalLineas}</td>
                    <td className="px-3 py-2 text-zinc-600">{fmt(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > limite && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-600">
            Mostrando {page * limite + 1}-{Math.min((page + 1) * limite, total)} de {total}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * limite >= total} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
