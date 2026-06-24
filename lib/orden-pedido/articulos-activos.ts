/**
 * Dado un conjunto de articuloIds solicitados y las filas de articulos
 * encontradas (con su `activo`), devuelve los ids que NO se pueden pedir: los
 * desactivados o los que no existen. Defensa en profundidad para que un cliente
 * manipulado no cree un pedido de articulos inactivos saltandose la UI.
 */
export function articulosInactivos(
  idsSolicitados: string[],
  filas: { id: string; activo: boolean | null }[]
): string[] {
  const activoPorId = new Map(filas.map((f) => [f.id, f.activo]))
  return [...new Set(idsSolicitados)].filter((id) => activoPorId.get(id) !== true)
}
