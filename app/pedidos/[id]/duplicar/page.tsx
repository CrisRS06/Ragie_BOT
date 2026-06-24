'use client'

/**
 * Pantalla de duplicado de un pedido.
 * Crea un BORRADOR nuevo a partir de uno existente (cualquier estado), copiando
 * las lineas y dejando la unidad receptora vacia para elegir la sucursal destino.
 * Reusa <PedidoForm> en modo 'duplicar' (POST /api/pedidos).
 */

import { useState, useEffect, use as usePromise } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { AccessDenied } from '@/components/ui/access-denied'
import { Skeleton } from '@/components/ui/skeleton'
import { PedidoForm } from '@/components/forms/pedido-form'
import { construirValoresDuplicado, type ValoresDuplicado } from '@/lib/orden-pedido/duplicar'
import type { Articulo } from '@/components/ui/articulo-selector'

export default function DuplicarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const { hasAccess, loading: loadingAuth } = useRoleAccess({ requiredPermission: 'pedidos.crear' })

  const [valores, setValores] = useState<ValoresDuplicado | null>(null)
  const [numeroOrigen, setNumeroOrigen] = useState<string | null>(null)
  const [unidadOrigen, setUnidadOrigen] = useState<{ id: string; nombre: string } | null>(null)
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

        // Catalogo de la bodega para poblar los articulos activos (nombre + stock).
        let articulosPorId = new Map<string, Articulo>()
        if (bodegaId) {
          try {
            const artRes = await fetch(`/api/articulos?bodegaId=${encodeURIComponent(bodegaId)}`)
            const artData = await artRes.json()
            if (artData.success && Array.isArray(artData.data)) {
              articulosPorId = new Map((artData.data as Articulo[]).map((a) => [a.id, a]))
            }
          } catch {
            // Silencioso: las lineas activas igual cargan, sin la advertencia de stock.
          }
        }
        if (!activo) return

        setNumeroOrigen(p.numero)
        setUnidadOrigen(
          p.unidadReceptora
            ? { id: p.unidadReceptora.id, nombre: `${p.unidadReceptora.codigo} - ${p.unidadReceptora.nombre}` }
            : null
        )
        setValores(
          construirValoresDuplicado(
            { bodega: p.bodega, observaciones: p.observaciones, lineas: p.lineas },
            articulosPorId
          )
        )
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div>
        <Link href={`/pedidos/${id}`} className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver al detalle
        </Link>
        <h1 className="text-xl font-semibold mt-1">Duplicar pedido {numeroOrigen}</h1>
      </div>

      <div className="rounded-md border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800">
        Esto crea un <strong>borrador nuevo</strong>; el pedido {numeroOrigen} no se modifica.
        {unidadOrigen && (
          <>
            {' '}Unidad receptora del original: <strong>{unidadOrigen.nombre}</strong>. Elegí la sucursal destino abajo.
          </>
        )}
      </div>

      {valores && (
        <PedidoForm modo="duplicar" valoresIniciales={valores} origenUnidadReceptoraId={unidadOrigen?.id} />
      )}
    </div>
  )
}
