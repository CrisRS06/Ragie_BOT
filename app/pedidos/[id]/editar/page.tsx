'use client'

/**
 * Pantalla de edición de un pedido en estado BORRADOR.
 * Reusa <PedidoForm> en modo 'editar'. El backend (PUT /api/pedidos/[id]) refuerza
 * que solo el solicitante o un admin pueden editar, y solo si está en BORRADOR.
 */

import { useState, useEffect, use as usePromise } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { AccessDenied } from '@/components/ui/access-denied'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { PedidoForm, type PedidoFormValoresIniciales } from '@/components/forms/pedido-form'
import type { Articulo } from '@/components/ui/articulo-selector'

export default function EditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const { hasAccess, loading: loadingAuth } = useRoleAccess({ requiredPermission: 'pedidos.crear' })

  const [valores, setValores] = useState<PedidoFormValoresIniciales | null>(null)
  const [estado, setEstado] = useState<string | null>(null)
  const [numero, setNumero] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    async function cargar() {
      try {
        const res = await fetch(`/api/pedidos/${id}`)
        const d = await res.json()
        if (!activo) return
        if (!d.success) {
          setError(d.error || 'No se pudo cargar el pedido')
          return
        }
        const p = d.pedido
        const bodegaId: string = p.bodega?.id ?? ''
        const lineasRaw: { articuloId: string; cantidadSolicitada: number }[] = p.lineas ?? []

        // Cargar el catálogo de la bodega para poblar cada `articulo` y que la
        // advertencia de stock funcione al editar. Si falla, el form igual
        // funciona (solo no muestra la advertencia ámbar).
        let articulosPorId = new Map<string, Articulo>()
        if (bodegaId) {
          try {
            const artRes = await fetch(`/api/articulos?bodegaId=${encodeURIComponent(bodegaId)}`)
            const artData = await artRes.json()
            if (artData.success && Array.isArray(artData.data)) {
              articulosPorId = new Map(
                (artData.data as Articulo[]).map((a) => [a.id, a])
              )
            }
          } catch {
            // Silencioso: la advertencia de stock simplemente no aparece.
          }
        }
        if (!activo) return

        setEstado(p.estado)
        setNumero(p.numero)
        setValores({
          bodegaId,
          unidadReceptoraId: p.unidadReceptora?.id ?? '',
          observaciones: p.observaciones ?? '',
          lineas: lineasRaw.map((l) => ({
            articuloId: l.articuloId,
            articulo: articulosPorId.get(l.articuloId) ?? null,
            cantidad: String(l.cantidadSolicitada),
          })),
        })
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'Error de red')
      } finally {
        if (activo) setLoading(false)
      }
    }

    cargar()
    return () => {
      activo = false
    }
  }, [id])

  if (loadingAuth || loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!hasAccess) return <AccessDenied />

  if (error) {
    return <div className="container mx-auto px-4 py-6 text-red-600">{error}</div>
  }

  if (estado !== 'BORRADOR') {
    return (
      <div className="container mx-auto px-4 py-6 space-y-3">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Este pedido ya no es editable porque no está en borrador (estado actual: {estado}).
        </div>
        <Link href={`/pedidos/${id}`}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver al detalle</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div>
        <Link href={`/pedidos/${id}`} className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver al detalle
        </Link>
        <h1 className="text-xl font-semibold mt-1">Editar borrador {numero}</h1>
        <p className="text-sm text-zinc-600">Modificá los artículos y datos. Para enviar el pedido, usá el botón "Enviar" en el detalle.</p>
      </div>
      {valores && <PedidoForm modo="editar" pedidoId={id} valoresIniciales={valores} />}
    </div>
  )
}
