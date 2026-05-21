'use client'

interface LineaTabla {
  id: string
  cantidadSolicitada: number
  cantidadEntregada: number | null
  notas: string | null
  articulo: { sku: string; nombre: string; unidad_medida: string } | null
}

interface Props {
  lineas: LineaTabla[]
  mostrarEntregada?: boolean
  /** Si se pasa, permite editar cantidad_entregada (para form de entrega). */
  onChangeEntregada?: (id: string, value: number) => void
  /**
   * Si se pasa, el input de cantidad entregada se vuelve controlado (value);
   * el padre mantiene el estado y el input se sincroniza al re-renderizar.
   * Si se omite, se mantiene el comportamiento con defaultValue.
   */
  valoresEntregada?: Record<string, number>
}

export function LineasTabla({
  lineas,
  mostrarEntregada = false,
  onChangeEntregada,
  valoresEntregada,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs font-medium text-zinc-600 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Artículo</th>
            <th className="px-3 py-2 text-right">Solicitada</th>
            {mostrarEntregada && <th className="px-3 py-2 text-right">Entregada</th>}
            <th className="px-3 py-2 text-left">U.M.</th>
            <th className="px-3 py-2 text-left">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {lineas.map((l) => (
            <tr key={l.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 text-zinc-600 font-mono text-xs">{l.articulo?.sku || '—'}</td>
              <td className="px-3 py-2 text-zinc-900">{l.articulo?.nombre || '—'}</td>
              <td className="px-3 py-2 text-right font-medium">{l.cantidadSolicitada}</td>
              {mostrarEntregada && (
                <td className="px-3 py-2 text-right">
                  {onChangeEntregada ? (
                    valoresEntregada ? (
                      <input
                        type="number"
                        min={0}
                        max={l.cantidadSolicitada}
                        value={valoresEntregada[l.id] ?? l.cantidadEntregada ?? l.cantidadSolicitada}
                        onChange={(e) => onChangeEntregada(l.id, Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-zinc-300 rounded text-sm"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={l.cantidadSolicitada}
                        defaultValue={l.cantidadEntregada ?? l.cantidadSolicitada}
                        onChange={(e) => onChangeEntregada(l.id, Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-zinc-300 rounded text-sm"
                      />
                    )
                  ) : (
                    <span className="font-medium">
                      {l.cantidadEntregada != null ? l.cantidadEntregada : '—'}
                    </span>
                  )}
                </td>
              )}
              <td className="px-3 py-2 text-zinc-600">{l.articulo?.unidad_medida || '—'}</td>
              <td className="px-3 py-2 text-zinc-600 text-xs">{l.notas || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
