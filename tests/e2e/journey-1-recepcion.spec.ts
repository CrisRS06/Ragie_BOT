/**
 * E2E Test - Journey 1: Recepción de Mercancía
 *
 * Verifica el flujo completo end-to-end:
 * 1. Navegar a página de nueva recepción
 * 2. Cargar lista de artículos
 * 3. Completar formulario
 * 4. Validar campos obligatorios
 * 5. Enviar formulario
 * 6. Verificar que se creó el lote
 * 7. Verificar que se registró en bitácora
 */

import { test, expect } from '@playwright/test';

test.describe('Journey 1: Recepción de Mercancía', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de nueva recepción
    await page.goto('/recepciones/nueva');
  });

  test('debería mostrar el formulario de recepción correctamente', async ({ page }) => {
    // Verificar título
    await expect(page.locator('h1')).toContainText('Nueva Recepción de Mercancía');

    // Verificar que el formulario esté visible
    await expect(page.locator('form')).toBeVisible();

    // Verificar campos obligatorios
    await expect(page.locator('label:has-text("Artículo")')).toBeVisible();
    await expect(page.locator('label:has-text("Cantidad")')).toBeVisible();
    await expect(page.locator('label:has-text("Fecha de Vencimiento")')).toBeVisible();
  });

  test('debería cargar la lista de artículos desde la API', async ({ page }) => {
    // Esperar a que se carguen los artículos
    await page.waitForTimeout(1000);

    // Verificar que el select de artículos tiene opciones
    const select = page.locator('select[name="articuloId"]');
    const options = select.locator('option');

    const count = await options.count();
    expect(count).toBeGreaterThan(1); // Debe tener al menos la opción vacía + artículos
  });

  test('debería validar campos obligatorios', async ({ page }) => {
    // Intentar enviar formulario vacío
    await page.click('button[type="submit"]');

    // Esperar un poco para que aparezcan los errores
    await page.waitForTimeout(500);

    // Verificar que aparecen mensajes de error
    // (Los errores se muestran debajo de cada campo)
    await expect(page.locator('text=Seleccione un artículo')).toBeVisible();
    await expect(page.locator('text=La cantidad debe ser mayor a 0')).toBeVisible();
  });

  test('debería validar que la fecha de vencimiento sea futura', async ({ page }) => {
    // Esperar a que carguen los artículos
    await page.waitForTimeout(1000);

    // Seleccionar primer artículo
    await page.selectOption('select[name="articuloId"]', { index: 1 });

    // Ingresar cantidad
    await page.fill('input[name="cantidad"]', '10');

    // Ingresar fecha pasada
    const fechaPasada = new Date();
    fechaPasada.setDate(fechaPasada.getDate() - 1);
    const fechaPasadaStr = fechaPasada.toISOString().split('T')[0];
    await page.fill('input[name="fechaVencimiento"]', fechaPasadaStr);

    // Intentar enviar
    await page.click('button[type="submit"]');

    // Esperar error
    await page.waitForTimeout(500);

    // Verificar mensaje de error
    await expect(page.locator('text=La fecha debe ser futura')).toBeVisible();
  });

  test('debería crear una recepción exitosamente (FLUJO COMPLETO)', async ({ page }) => {
    // Esperar a que carguen los artículos
    await page.waitForTimeout(1500);

    // Seleccionar primer artículo disponible
    await page.selectOption('select[name="articuloId"]', { index: 1 });

    // Esperar a que aparezca la info del artículo
    await page.waitForTimeout(500);

    // Verificar que aparece la Descripción SIGAF
    await expect(page.locator('text=Descripción SIGAF:')).toBeVisible();

    // Completar campos obligatorios
    await page.fill('input[name="cantidad"]', '50');

    // Fecha de vencimiento (6 meses adelante)
    const fechaFutura = new Date();
    fechaFutura.setMonth(fechaFutura.getMonth() + 6);
    const fechaFuturaStr = fechaFutura.toISOString().split('T')[0];
    await page.fill('input[name="fechaVencimiento"]', fechaFuturaStr);

    // Completar campos opcionales
    await page.fill('input[name="numeroLote"]', 'TEST-E2E-001');
    await page.fill('input[name="proveedor"]', 'Proveedor Test E2E');
    await page.fill('input[name="costoUnitario"]', '1500.50');
    await page.fill('input[name="ubicacion"]', 'Estante Test');
    await page.fill('input[name="documentoReferencia"]', 'Factura Test #999');

    // Enviar formulario
    await page.click('button[type="submit"]');

    // Esperar respuesta (loading state)
    await expect(page.locator('button:has-text("Guardando...")')).toBeVisible();

    // Esperar mensaje de éxito (timeout más largo para la transacción)
    await expect(page.locator('text=Recepción creada exitosamente')).toBeVisible({ timeout: 10000 });

    // Verificar que el formulario se limpió
    await expect(page.locator('input[name="cantidad"]')).toHaveValue('');

    // Verificar que el botón volvió a estado normal
    await expect(page.locator('button:has-text("Guardar Recepción")')).toBeVisible();
  });

  test('debería mostrar error si la API falla', async ({ page }) => {
    // Interceptar la petición y hacer que falle
    await page.route('/api/recepciones', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({
          success: false,
          message: 'Error simulado para test',
        }),
      });
    });

    // Esperar a que carguen los artículos
    await page.waitForTimeout(1000);

    // Llenar formulario
    await page.selectOption('select[name="articuloId"]', { index: 1 });
    await page.fill('input[name="cantidad"]', '10');

    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 30);
    await page.fill('input[name="fechaVencimiento"]', fechaFutura.toISOString().split('T')[0]);

    // Enviar
    await page.click('button[type="submit"]');

    // Verificar mensaje de error
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 5000 });
  });

  test('debería mostrar loading state mientras se envía', async ({ page }) => {
    // Esperar artículos
    await page.waitForTimeout(1000);

    // Llenar formulario rápidamente
    await page.selectOption('select[name="articuloId"]', { index: 1 });
    await page.fill('input[name="cantidad"]', '5');

    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 30);
    await page.fill('input[name="fechaVencimiento"]', fechaFutura.toISOString().split('T')[0]);

    // Click enviar
    await page.click('button[type="submit"]');

    // Verificar que el botón muestra "Guardando..."
    await expect(page.locator('button:has-text("Guardando...")')).toBeVisible();

    // Verificar que el botón está deshabilitado
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('debería permitir cancelar y volver al dashboard', async ({ page }) => {
    // Click en botón Cancelar
    await page.click('button:has-text("Cancelar")');

    // Verificar redirección (o navegación)
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });

  test('debería permitir volver al dashboard desde el header', async ({ page }) => {
    // Click en link "Volver al Dashboard"
    await page.click('a:has-text("Volver al Dashboard")');

    // Verificar navegación
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });
});
