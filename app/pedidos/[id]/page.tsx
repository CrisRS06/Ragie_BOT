'use client'

/**
 * Detalle de una orden de pedido.
 * Muestra timeline de estados, líneas, panel de acciones según rol, y descarga del PDF.
 */

import { useState, useEffect, useCallback, use as usePromise } from 'react'
import Link from 'next/link'
import { FileDown, ArrowLeft, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoBadge } from '@/components/pedidos/estado-badge'
import { TimelineEstados } from '@/components/pedidos/timeline-estados'
import { LineasTabla } from '@/components/pedidos/lineas-tabla'
import { AccionesPanel } from '@/components/pedidos/acciones-panel'
import { useAuth } from '@/contexts/AuthContext'
import type { EstadoPedido } from '@/lib/orden-pedido/transiciones'

interface Linea {
  id: string
  articuloId: string
  cantidadSolicitada: number
  cantidadEntregada: number | null
  notas: string | null
  articulo: { id: string; sku: string; nombre: string; descripcion_sigaf: string | null; unidad_medida: string } | null
}

interface Historial {
  id: string
  accion: string
  fecha: string
  usuarioId: string | null
  datos: unknown
}

interface PedidoDetalle {
  id: string
  numero: string
  estado: EstadoPedido
  observaciones: string | null
  fechaEnvio: string | null
  fechaAceptacion: string | null
  fechaListo: string | null
  fechaEntrega: string | null
  receptorNombre: string | null
  receptorCedula: string | null
  motivoRechazo: string | null
  motivoAnulacion: string | null
  hashFirma: string | null
  createdAt: string
  bodega: { id: string; codigo: string; nombre: string } | null
  unidadReceptora: { id: string; codigo: string; nombre: string } | null
  solicitanteId: string
  solicitante: { id: string; nombre: string; email: string | null } | null
  aceptadoPor: { id: string; nombre: string } | null
  entregadoPor: { id: string; nombre: string } | null
  lineas: Linea[]
  historial: Historial[]
}

export default function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const { user } = useAuth()
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarPedido = useCallback(async () => {
    try {
      const r = await fetch(`/api/pedidos/${id}`)
      const d = await r.json()
      if (d.success) setPedido(d.pedido)
      else setError(d.error || 'Error al cargar')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    cargarPedido()
  }, [cargarPedido])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }
  if (error) return <div className="container mx-auto px-4 py-6 text-red-600">{error}</div>
  if (!pedido) return null

  const esSolicitante = pedido.solicitanteId === user?.id
  const rol = user?.rol
  const puedeEditar = pedido.estado === 'BORRADOR' && (esSolicitante || rol === 'ADMINISTRADOR')

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/pedidos" className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver al listado
        </Link>
        <div className="flex gap-2">
          {puedeEditar && (
            <Link href={`/pedidos/${pedido.id}/editar`}>
              <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" /> Editar borrador</Button>
            </Link>
          )}
          <a href={`/api/pedidos/${pedido.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-1" /> Descargar PDF</Button>
          </a>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Orden de pedido</div>
            <div className="text-2xl font-bold font-mono">{pedido.numero}</div>
            {pedido.solicitante && (
              <div className="text-sm text-zinc-600 mt-1">
                Solicitante: <span className="font-medium">{pedido.solicitante.nombre}</span>
              </div>
            )}
          </div>
          <EstadoBadge estado={pedido.estado} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Datos</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">Bodega</dt>
                <dd>{pedido.bodega ? `${pedido.bodega.codigo} - ${pedido.bodega.nombre}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Unidad receptora</dt>
                <dd>{pedido.unidadReceptora ? `${pedido.unidadReceptora.codigo} - ${pedido.unidadReceptora.nombre}` : '—'}</dd>
              </div>
              {pedido.observaciones && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">Observaciones</dt>
                  <dd>{pedido.observaciones}</dd>
                </div>
              )}
              {pedido.motivoRechazo && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500 text-red-600">Motivo del rechazo</dt>
                  <dd className="text-red-700">{pedido.motivoRechazo}</dd>
                </div>
              )}
              {pedido.motivoAnulacion && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">Motivo de anulación</dt>
                  <dd>{pedido.motivoAnulacion}</dd>
                </div>
              )}
              {pedido.estado === 'ENTREGADO' && (
                <>
                  <div>
                    <dt className="text-xs text-zinc-500">Receptor</dt>
                    <dd>{pedido.receptorNombre}{pedido.receptorCedula ? ` (${pedido.receptorCedula})` : ''}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Entregado por</dt>
                    <dd>{pedido.entregadoPor?.nombre || '—'}</dd>
                  </div>
                  {pedido.hashFirma && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-zinc-500">Firma digital SHA-256</dt>
                      <dd className="font-mono text-xs break-all bg-zinc-50 p-2 rounded">{pedido.hashFirma}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Líneas</h2>
            <LineasTabla
              lineas={pedido.lineas.map((l) => ({
                id: l.id,
                cantidadSolicitada: Number(l.cantidadSolicitada),
                cantidadEntregada: l.cantidadEntregada != null ? Number(l.cantidadEntregada) : null,
                notas: l.notas,
                articulo: l.articulo,
              }))}
              mostrarEntregada={pedido.estado === 'ENTREGADO'}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">Progreso</h2>
            <TimelineEstados
              estado={pedido.estado}
              fechaCreacion={pedido.createdAt}
              fechaEnvio={pedido.fechaEnvio}
              fechaAceptacion={pedido.fechaAceptacion}
              fechaListo={pedido.fechaListo}
              fechaEntrega={pedido.fechaEntrega}
            />
          </Card>

          {rol && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Acciones</h2>
              <AccionesPanel
                pedidoId={pedido.id}
                estado={pedido.estado}
                rol={rol}
                esSolicitante={esSolicitante}
                lineas={pedido.lineas.map((l) => ({
                  id: l.id,
                  cantidadSolicitada: Number(l.cantidadSolicitada),
                  cantidadEntregada: l.cantidadEntregada != null ? Number(l.cantidadEntregada) : null,
                  notas: l.notas,
                  articulo: l.articulo
                    ? { sku: l.articulo.sku, nombre: l.articulo.nombre, unidad_medida: l.articulo.unidad_medida }
                    : null,
                }))}
                onCompletado={cargarPedido}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
