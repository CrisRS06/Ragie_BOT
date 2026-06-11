import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Llama una PG function de órdenes de pedido que aún no está en los tipos
 * generados de Supabase (migraciones 011/013). Cast localizado en un solo
 * lugar: evita romper el type-check sin regenerar `database.types.ts`.
 *
 * Devuelve la forma estándar `{ data, error }` de supabase-js.
 */
export async function rpcPedido<T = unknown>(
  fn: string,
  args: Record<string, unknown>
): Promise<{ data: T | null; error: { message: string } | null }> {
  // Importante: se invoca inline sobre `supabaseAdmin` (no extraer `.rpc` a una
  // variable) para no perder el binding de `this`; supabase-js usa `this.rest`
  // internamente y un método desligado tira "Cannot read properties of undefined".
  return (
    supabaseAdmin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: T | null; error: { message: string } | null }>
  )(fn, args)
}
