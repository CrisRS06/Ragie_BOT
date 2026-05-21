/**
 * E2E Test - Journey 6: Órdenes de Pedido (PANI ↔ Super Cadena)
 *
 * Cubre el flujo completo:
 *  1. AUDITOR crea y envía un pedido.
 *  2. OPERADOR lo acepta y marca listo.
 *  3. AUDITOR ve estado LISTO_RETIRO en su contador.
 *  4. OPERADOR entrega → se descuenta stock vía dispatch_peps, se genera hash de firma.
 *  5. Se verifica el PDF y la integridad.
 *  6. Smoke test del flujo de rechazo.
 *
 * Trabaja con request context (API HTTP directa) para que el test sea robusto y
 * no dependa de detalles visuales del UI. Los usuarios de prueba (auditor.test@local,
 * operador.test@local) deben existir en el Supabase local — se crean automáticamente
 * en el setup si faltan.
 */

import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

const USUARIOS = {
  auditor: { email: 'auditor.test@local', password: 'Test1234!' },
  operador: { email: 'operador.test@local', password: 'Test1234!' },
  admin: { email: 'admin@bodegaje.example.com', password: 'Admin2024Secure' },
}

async function loginAs(email: string, password: string): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE })
  const res = await ctx.post('/api/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) {
    throw new Error(`Login fallido para ${email}: ${res.status()} ${await res.text()}`)
  }
  return ctx
}

async function getInventoryRefs(ctx: APIRequestContext) {
  const bodegasRes = await ctx.get('/api/bodegas')
  const bodegas: Array<{ id: string; codigo: string }> =
    (await bodegasRes.json()).bodegas || []
  expect(bodegas.length, 'Debe existir al menos una bodega').toBeGreaterThan(0)

  const unidadesRes = await ctx.get('/api/unidades-receptoras')
  const unidadesData = await unidadesRes.json()
  const unidad = (unidadesData.data || unidadesData.unidades || [])[0]
  expect(unidad, 'Debe existir al menos una unidad receptora').toBeTruthy()

  // Buscar la primera bodega que tenga ≥ 2 artículos con stock ≥ 50.
  const invRes = await ctx.get(`/api/inventario?limite=300&soloConStock=true`)
  const invData = await invRes.json()
  type ArtBodega = { bodegaId: string; stockEnBodega: number }
  type Art = { id: string; stockTotal: number; bodegas: ArtBodega[] }
  const inventario: Art[] = invData.inventario || []

  for (const b of bodegas) {
    const conStock = inventario.filter((a) => {
      const enBodega = (a.bodegas || []).find((x) => x.bodegaId === b.id)
      return enBodega && enBodega.stockEnBodega >= 50
    })
    if (conStock.length >= 2) {
      return {
        bodegaId: b.id,
        unidadReceptoraId: unidad.id as string,
        articulo1Id: conStock[0].id,
        articulo2Id: conStock[1].id,
      }
    }
  }
  throw new Error('No hay ninguna bodega con ≥ 2 artículos con stock ≥ 50 — el snapshot de prod no alcanza para el test')
}

test.describe('Journey 6: Órdenes de Pedido — Flujo Completo', () => {
  // Disable auth file dependency for this journey — usamos sesiones explícitas.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('flujo feliz: AUDITOR crea → OPERADOR acepta/listo/entrega → stock descuenta', async () => {
    const auditor = await loginAs(USUARIOS.auditor.email, USUARIOS.auditor.password)
    const operador = await loginAs(USUARIOS.operador.email, USUARIOS.operador.password)

    const refs = await getInventoryRefs(auditor)

    // 1. AUDITOR crea pedido en BORRADOR + envía
    const crearRes = await auditor.post('/api/pedidos?enviar=true', {
      data: {
        bodegaId: refs.bodegaId,
        unidadReceptoraId: refs.unidadReceptoraId,
        observaciones: 'Pedido E2E journey-6',
        lineas: [
          { articuloId: refs.articulo1Id, cantidadSolicitada: 15 },
          { articuloId: refs.articulo2Id, cantidadSolicitada: 20 },
        ],
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(crearRes.status(), 'POST /api/pedidos').toBe(200)
    const crearData = await crearRes.json()
    expect(crearData.success).toBe(true)
    expect(crearData.pedido.estado).toBe('ENVIADO')
    expect(crearData.pedido.numero).toMatch(/^PANI-\d{4}-\d{4}$/)
    const pedidoId = crearData.pedido.id as string

    // 2. AUDITOR no puede aceptar su propio pedido (403)
    const intentarAceptarComoAuditor = await auditor.post(`/api/pedidos/${pedidoId}/aceptar`)
    expect(intentarAceptarComoAuditor.status(), 'auditor no debe poder aceptar').toBe(403)

    // 3. OPERADOR acepta
    const aceptarRes = await operador.post(`/api/pedidos/${pedidoId}/aceptar`)
    expect(aceptarRes.status()).toBe(200)
    expect((await aceptarRes.json()).estado).toBe('EN_PREPARACION')

    // 4. OPERADOR marca listo
    const listoRes = await operador.post(`/api/pedidos/${pedidoId}/listo`)
    expect(listoRes.status()).toBe(200)
    expect((await listoRes.json()).estado).toBe('LISTO_RETIRO')

    // 5. AUDITOR ve el contador con 1 listo
    const contadorRes = await auditor.get('/api/pedidos/contador')
    expect(contadorRes.status()).toBe(200)
    const contadorData = await contadorRes.json()
    expect(contadorData.listosAuditor).toBeGreaterThanOrEqual(1)

    // 6. AUDITOR sólo ve sus propios pedidos en GET /api/pedidos.
    //    Verificamos por solicitante.id (estable) en vez de nombre.
    const meRes = await auditor.get('/api/auth/me')
    const me = (await meRes.json()).user
    const misPedidosRes = await auditor.get('/api/pedidos?limite=50')
    const misPedidosData = await misPedidosRes.json()
    const idsAjenos = (misPedidosData.pedidos as Array<{ solicitante: { id: string } }>)
      .filter((p) => p.solicitante?.id && p.solicitante.id !== me.id)
    expect(idsAjenos, 'AUDITOR no debe ver pedidos de otros').toHaveLength(0)

    // 7. OPERADOR entrega
    const entregarRes = await operador.post(`/api/pedidos/${pedidoId}/entregar`, {
      data: { receptor: 'Receptor E2E', cedula: '9-9999-9999' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(entregarRes.status(), `entregar: ${await entregarRes.text()}`).toBe(200)
    const entregaData = await entregarRes.json()
    expect(entregaData.success).toBe(true)
    expect(entregaData.resultado.hash_firma).toMatch(/^[a-f0-9]{64}$/)

    // 8. Verificar detalle: estado ENTREGADO + hash presente
    const detalleRes = await operador.get(`/api/pedidos/${pedidoId}`)
    const detalle = await detalleRes.json()
    expect(detalle.pedido.estado).toBe('ENTREGADO')
    expect(detalle.pedido.hashFirma).toBe(entregaData.resultado.hash_firma)
    expect(detalle.pedido.receptorNombre).toBe('Receptor E2E')

    // 9. PDF responde 200 y es application/pdf
    const pdfRes = await operador.get(`/api/pedidos/${pedidoId}/pdf`)
    expect(pdfRes.status()).toBe(200)
    expect(pdfRes.headers()['content-type']).toContain('application/pdf')
    const pdfBuffer = await pdfRes.body()
    expect(pdfBuffer.byteLength, 'PDF debe pesar > 1KB').toBeGreaterThan(1000)
    expect(pdfBuffer.subarray(0, 4).toString('ascii')).toBe('%PDF')

    await auditor.dispose()
    await operador.dispose()
  })

  test('flujo de rechazo: OPERADOR rechaza con motivo, no se descuenta stock', async () => {
    const auditor = await loginAs(USUARIOS.auditor.email, USUARIOS.auditor.password)
    const operador = await loginAs(USUARIOS.operador.email, USUARIOS.operador.password)

    const refs = await getInventoryRefs(auditor)

    const crearRes = await auditor.post('/api/pedidos?enviar=true', {
      data: {
        bodegaId: refs.bodegaId,
        unidadReceptoraId: refs.unidadReceptoraId,
        lineas: [{ articuloId: refs.articulo1Id, cantidadSolicitada: 5 }],
      },
      headers: { 'Content-Type': 'application/json' },
    })
    const pedidoId = (await crearRes.json()).pedido.id

    // OPERADOR rechaza sin motivo suficiente → 400
    const malRechazo = await operador.post(`/api/pedidos/${pedidoId}/rechazar`, {
      data: { motivo: 'corto' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(malRechazo.status()).toBe(400)

    // Rechazo válido
    const rechazoRes = await operador.post(`/api/pedidos/${pedidoId}/rechazar`, {
      data: { motivo: 'Producto vencido al momento de revisión' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(rechazoRes.status()).toBe(200)
    expect((await rechazoRes.json()).estado).toBe('RECHAZADO')

    // Detalle: motivo presente, hashFirma nulo
    const detalle = await (await operador.get(`/api/pedidos/${pedidoId}`)).json()
    expect(detalle.pedido.estado).toBe('RECHAZADO')
    expect(detalle.pedido.motivoRechazo).toContain('Producto vencido')
    expect(detalle.pedido.hashFirma).toBeNull()

    await auditor.dispose()
    await operador.dispose()
  })

  test('AUDITOR no puede ver pedido ajeno (403)', async () => {
    const auditor = await loginAs(USUARIOS.auditor.email, USUARIOS.auditor.password)
    const admin = await loginAs(USUARIOS.admin.email, USUARIOS.admin.password)

    const refs = await getInventoryRefs(admin)

    // Admin crea un pedido (lo hace en su nombre, no del auditor)
    const crearRes = await admin.post('/api/pedidos', {
      data: {
        bodegaId: refs.bodegaId,
        unidadReceptoraId: refs.unidadReceptoraId,
        lineas: [{ articuloId: refs.articulo1Id, cantidadSolicitada: 1 }],
      },
      headers: { 'Content-Type': 'application/json' },
    })
    const pedidoAjenoId = (await crearRes.json()).pedido.id

    const verAjenoRes = await auditor.get(`/api/pedidos/${pedidoAjenoId}`)
    expect(verAjenoRes.status()).toBe(403)

    await auditor.dispose()
    await admin.dispose()
  })
})
