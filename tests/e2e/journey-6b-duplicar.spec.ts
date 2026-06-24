/**
 * E2E - Journey 6b: Duplicar pedido.
 *  1. El GET de un pedido trae `articulo.activo` por linea.
 *  2. "Duplicar" (POST con las mismas lineas) crea un borrador nuevo e independiente;
 *     el original no se toca.
 *  3. El guard server-side rechaza una linea con articulo inexistente (400).
 */

import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const ADMIN = { email: 'admin@bodegaje.example.com', password: 'Admin2024Secure' }

async function loginAs(email: string, password: string): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE })
  const res = await ctx.post('/api/auth/login', { data: { email, password }, headers: { 'Content-Type': 'application/json' } })
  if (!res.ok()) throw new Error(`Login fallido para ${email}: ${res.status()} ${await res.text()}`)
  return ctx
}

async function refs(ctx: APIRequestContext) {
  const bodegas: Array<{ id: string }> = (await (await ctx.get('/api/bodegas')).json()).bodegas || []
  expect(bodegas.length, 'Debe existir al menos una bodega').toBeGreaterThan(0)
  const unidadesData = await (await ctx.get('/api/unidades-receptoras')).json()
  const unidad = (unidadesData.data || unidadesData.unidades || [])[0]
  expect(unidad, 'Debe existir al menos una unidad receptora').toBeTruthy()
  const inventario: Array<{ id: string; bodegas?: { bodegaId: string; stockEnBodega: number }[] }> =
    (await (await ctx.get('/api/inventario?limite=300&soloConStock=true')).json()).inventario || []
  for (const b of bodegas) {
    const art = inventario.find((a) => (a.bodegas || []).some((x) => x.bodegaId === b.id && x.stockEnBodega >= 5))
    if (art) return { bodegaId: b.id, unidadReceptoraId: unidad.id as string, articuloId: art.id }
  }
  throw new Error('No hay bodega con un articulo con stock >= 5 para el test')
}

test.describe('Journey 6b: Duplicar pedido', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('duplicar crea un borrador nuevo independiente y el original no se toca', async () => {
    const admin = await loginAs(ADMIN.email, ADMIN.password)
    const r = await refs(admin)

    const aRes = await admin.post('/api/pedidos', {
      data: { bodegaId: r.bodegaId, unidadReceptoraId: r.unidadReceptoraId, observaciones: 'Original 6b',
              lineas: [{ articuloId: r.articuloId, cantidadSolicitada: 3 }] },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(aRes.status()).toBe(200)
    const a = (await aRes.json()).pedido

    // GET del original: las lineas traen articulo.activo (cambio de la Task 3)
    const aGet = await (await admin.get(`/api/pedidos/${a.id}`)).json()
    expect(aGet.pedido.lineas[0].articulo.activo).toBe(true)

    // "Duplicado" = nuevo POST con las mismas lineas (lo que hace el form de duplicado)
    const bRes = await admin.post('/api/pedidos', {
      data: { bodegaId: r.bodegaId, unidadReceptoraId: r.unidadReceptoraId, observaciones: 'Original 6b',
              lineas: [{ articuloId: r.articuloId, cantidadSolicitada: 3 }] },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(bRes.status()).toBe(200)
    const b = (await bRes.json()).pedido
    expect(b.id).not.toBe(a.id)
    expect(b.numero).not.toBe(a.numero)
    expect(b.estado).toBe('BORRADOR')

    // El original quedo intacto
    const aGet2 = await (await admin.get(`/api/pedidos/${a.id}`)).json()
    expect(aGet2.pedido.estado).toBe('BORRADOR')
    expect(aGet2.pedido.numero).toBe(a.numero)

    await admin.dispose()
  })

  test('POST rechaza una linea con articulo inexistente (guard server-side)', async () => {
    const admin = await loginAs(ADMIN.email, ADMIN.password)
    const r = await refs(admin)

    const res = await admin.post('/api/pedidos', {
      data: { bodegaId: r.bodegaId, unidadReceptoraId: r.unidadReceptoraId,
              lineas: [{ articuloId: '00000000-0000-0000-0000-000000000000', cantidadSolicitada: 1 }] },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).code).toBe('ARTICULO_INACTIVO')

    await admin.dispose()
  })
})
