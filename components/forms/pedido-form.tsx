'use client'

/**
 * Formulario de Órdenes de Pedido (PANI ↔ Super Cadena).
 * Soporta dos modos:
 *  - 'crear': POST /api/pedidos (botones "Guardar borrador" y "Enviar pedido").
 *  - 'editar': PUT /api/pedidos/[id] (solo "Guardar cambios"; enviar se hace desde el detalle).
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { BodegaSelector } from '@/components/ui/bodega-selector'
import { ArticuloSelector, type Articulo } from '@/components/ui/articulo-selector'
import { toast } from '@/lib/hooks/use-toast'
import { Plus, Trash2, Save, Send } from 'lucide-react'

interface UnidadReceptora {
  id: string
  codigo: string
  nombre: string
}

interface LineaForm {
  id: string
  articuloId: string
  articulo: Articulo | null
  cantidad: string
}

export interface PedidoFormValoresIniciales {
  bodegaId: string
  unidadReceptoraId: string
  observaciones: string
  lineas: { articuloId: string; articulo: Articulo | null; cantidad: string }[]
}

interface PedidoFormProps {
  modo?: 'crear' | 'editar'
  pedidoId?: string
  valoresIniciales?: PedidoFormValoresIniciales
}

const emptyLinea = (): LineaForm => ({
  id: crypto.randomUUID(),
  articuloId: '',
  articulo: null,
  cantidad: '',
})

function lineasIniciales(v?: PedidoFormValoresIniciales): LineaForm[] {
  if (!v || v.lineas.length === 0) return [emptyLinea()]
  return v.lineas.map((l) => ({
    id: crypto.randomUUID(),
    articuloId: l.articuloId,
    articulo: l.articulo,
    cantidad: l.cantidad,
  }))
}

export function PedidoForm({ modo = 'crear', pedidoId, valoresIniciales }: PedidoFormProps) {
  const router = useRouter()
  const esEditar = modo === 'editar'

  const [unidades, setUnidades] = useState<UnidadReceptora[]>([])
  const [unidadesError, setUnidadesError] = useState(false)
  const [bodegaId, setBodegaId] = useState(valoresIniciales?.bodegaId ?? '')
  const [unidadReceptoraId, setUnidadReceptoraId] = useState(valoresIniciales?.unidadReceptoraId ?? '')
  const [observaciones, setObservaciones] = useState(valoresIniciales?.observaciones ?? '')
  const [lineas, setLineas] = useState<LineaForm[]>(() => lineasIniciales(valoresIniciales))
  const [loading, setLoading] = useState<'guardar' | 'enviar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/unidades-receptoras')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUnidades(d.data)
          setUnidadesError(false)
        } else {
          setUnidadesError(true)
          toast.error(
            'No se pudieron cargar las unidades receptoras',
            d.error || 'Recargá la página o intentá más tarde.'
          )
        }
      })
      .catch(() => {
        setUnidadesError(true)
        toast.error(
          'No se pudieron cargar las unidades receptoras',
          'Verificá tu conexión y recargá la página.'
        )
      })
  }, [])

  const agregarLinea = useCallback(() => setLineas((p) => [...p, emptyLinea()]), [])
  const eliminarLinea = useCallback(
    (id: string) => setLineas((p) => (p.length === 1 ? p : p.filter((l) => l.id !== id))),
    []
  )
  const actualizarLinea = useCallback(
    (id: string, campo: keyof LineaForm, valor: string | Articulo | null) => {
      setLineas((p) => p.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)))
      // Limpiar el error del campo apenas se corrige
      setFieldErrors((prev) => {
        if (Object.keys(prev).length === 0) return prev
        return {}
      })
    },
    []
  )

  function validar(): boolean {
    const errs: Record<string, string> = {}
    if (!bodegaId) errs.bodegaId = 'Seleccione la bodega'
    if (!unidadReceptoraId) errs.unidadReceptoraId = 'Seleccione la unidad receptora'
    // Detectar artículos repetidos: el backend rechaza el pedido entero si un
    // artículo aparece en dos líneas. Lo cazamos acá y apuntamos a la línea exacta.
    const primeraLineaPorArticulo = new Map<string, number>()
    lineas.forEach((l, i) => {
      if (!l.articuloId) {
        errs[`linea_${i}_articulo`] = 'Seleccione un artículo'
      } else {
        const primera = primeraLineaPorArticulo.get(l.articuloId)
        if (primera !== undefined) {
          errs[`linea_${i}_articulo`] = `Artículo repetido: ya está en la línea #${primera}. Borre esta línea y sume la cantidad en la #${primera}.`
        } else {
          primeraLineaPorArticulo.set(l.articuloId, i + 1)
        }
      }
      const c = Number(l.cantidad)
      if (!c || c <= 0) errs[`linea_${i}_cantidad`] = 'Cantidad inválida'
    })
    setFieldErrors(errs)

    if (Object.keys(errs).length > 0) {
      // Scroll al primer campo con error
      let targetId = ''
      if (errs.bodegaId) targetId = 'campo-bodega'
      else if (errs.unidadReceptoraId) targetId = 'campo-unidad'
      else {
        const idx = lineas.findIndex((_, i) => errs[`linea_${i}_articulo`] || errs[`linea_${i}_cantidad`])
        if (idx >= 0) targetId = `campo-linea-${idx}`
      }
      requestAnimationFrame(() => {
        if (targetId) document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return false
    }
    return true
  }

  async function submit(modoSubmit: 'guardar' | 'enviar') {
    setError(null)
    if (!validar()) return
    setLoading(modoSubmit)
    try {
      const payload = {
        bodegaId,
        unidadReceptoraId,
        observaciones: observaciones || undefined,
        lineas: lineas.map((l) => ({
          articuloId: l.articuloId,
          cantidadSolicitada: Number(l.cantidad),
        })),
      }

      let url: string
      let method: string
      if (esEditar) {
        url = `/api/pedidos/${pedidoId}`
        method = 'PUT'
      } else {
        url = modoSubmit === 'enviar' ? '/api/pedidos?enviar=true' : '/api/pedidos'
        method = 'POST'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        // El API devuelve el motivo específico en `detalles` (fieldErrors de Zod);
        // mostrarlo en vez del genérico "Datos inválidos" para que se sepa qué corregir.
        const detalles = data.detalles as Record<string, string[] | undefined> | undefined
        const especificos = detalles
          ? [...new Set(Object.values(detalles).flat().filter((m): m is string => !!m))]
          : []
        const msg = especificos.length > 0 ? especificos.join(' ') : data.error || 'No se pudo guardar el pedido'
        setError(msg)
        toast.error('No se pudo guardar el pedido', msg)
        return
      }

      if (esEditar) toast.success('Cambios guardados')
      else if (modoSubmit === 'enviar') toast.success('Pedido enviado')
      else toast.success('Borrador guardado')

      router.push(`/pedidos/${esEditar ? pedidoId : data.pedido.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red'
      setError(msg)
      toast.error('Error de red', msg)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="p-4">
        <h2 className="text-base font-semibold mb-3">Datos del pedido</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div id="campo-bodega">
            <Label htmlFor="bodega" required>Bodega de origen</Label>
            <BodegaSelector value={bodegaId} onChange={(v) => { setBodegaId(v); setFieldErrors({}) }} error={fieldErrors.bodegaId} />
          </div>
          <div id="campo-unidad">
            <Label htmlFor="unidad" required>Unidad receptora</Label>
            <Select
              id="unidad"
              value={unidadReceptoraId}
              onChange={(e) => { setUnidadReceptoraId(e.target.value); setFieldErrors({}) }}
              error={fieldErrors.unidadReceptoraId}
            >
              <option value="">Seleccione...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.codigo} - {u.nombre}</option>
              ))}
            </Select>
            {unidadesError && (
              <p className="mt-1 text-xs text-red-600">
                No se pudieron cargar las unidades receptoras. Recargá la página para reintentar.
              </p>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="obs">Observaciones</Label>
          <Input
            id="obs"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas opcionales del solicitante..."
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Artículos solicitados</h2>
          <Button type="button" variant="outline" size="sm" onClick={agregarLinea}>
            <Plus className="h-4 w-4 mr-1" /> Agregar línea
          </Button>
        </div>

        <div className="space-y-3">
          {lineas.map((linea, idx) => {
            const cant = Number(linea.cantidad)
            const stock = linea.articulo?.stockTotal
            const excedeStock = stock != null && cant > 0 && cant > stock
            // Artículos ya elegidos en las OTRAS líneas: el selector los bloquea
            // para que no se pueda repetir el mismo artículo (el backend lo rechaza).
            const yaEnOtrasLineas = lineas
              .map((l, i) => ({ id: l.articuloId, linea: i + 1 }))
              .filter((x) => x.id && x.linea !== idx + 1)
            return (
              <div
                key={linea.id}
                id={`campo-linea-${idx}`}
                className="grid gap-2 sm:grid-cols-[1fr_140px_40px] items-start border-b border-zinc-100 pb-3 last:border-0"
              >
                <div>
                  <Label required>Artículo #{idx + 1}</Label>
                  <ArticuloSelector
                    value={linea.articuloId}
                    onChange={(art) => {
                      actualizarLinea(linea.id, 'articulo', art)
                      actualizarLinea(linea.id, 'articuloId', art?.id || '')
                    }}
                    bodegaId={bodegaId || undefined}
                    soloConStock={true}
                    error={fieldErrors[`linea_${idx}_articulo`]}
                    yaSeleccionados={yaEnOtrasLineas}
                  />
                </div>
                <div>
                  <Label required>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={linea.cantidad}
                    onChange={(e) => actualizarLinea(linea.id, 'cantidad', e.target.value)}
                    error={fieldErrors[`linea_${idx}_cantidad`]}
                  />
                  {excedeStock && (
                    <p className="mt-1 text-xs text-amber-600">
                      Supera el stock en bodega ({stock} {linea.articulo?.unidadMedida}). El pedido igual se puede enviar.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-6"
                  onClick={() => eliminarLinea(linea.id)}
                  disabled={lineas.length === 1}
                  aria-label="Eliminar línea"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => submit('guardar')}
          disabled={loading !== null}
          isLoading={loading === 'guardar'}
        >
          <Save className="h-4 w-4 mr-1" />
          {esEditar ? 'Guardar cambios' : 'Guardar borrador'}
        </Button>
        {!esEditar && (
          <Button
            onClick={() => submit('enviar')}
            disabled={loading !== null}
            isLoading={loading === 'enviar'}
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar pedido
          </Button>
        )}
      </div>
    </div>
  )
}
