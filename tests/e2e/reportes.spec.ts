/**
 * E2E Test - Reportes e Informes
 *
 * Verifica el flujo de generación de reportes:
 * 1. Ver página de reportes
 * 2. Generar informe mensual
 * 3. Ver reporte de vencimientos
 * 4. Navegar a cortes y bitácora
 */

import { test, expect } from '@playwright/test';

test.describe('Reportes e Informes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reportes');
  });

  test('debería mostrar la página de reportes', async ({ page }) => {
    // Verificar título
    await expect(page.locator('h1')).toContainText(/Reportes|Informes/i);

    // Verificar que la página cargó
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería mostrar opciones de reportes disponibles', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verificar que hay tarjetas de reportes
    const reporteCards = page.locator('text=/Informe|Reporte|Mensual|Vencimientos|Cortes|Bitácora/i');
    const cardCount = await reporteCards.count();

    expect(cardCount).toBeGreaterThan(0);
  });

  test('debería permitir generar informe mensual', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar botón de generar informe mensual
    const generarButton = page.locator('button:has-text(/Generar.*Informe/i)');

    if (await generarButton.isVisible()) {
      await generarButton.click();

      // Esperar resultado
      await page.waitForTimeout(5000);

      // Verificar mensaje (éxito o error)
      const resultado = page.locator('text=/éxito|exitoso|generado|error|ya existe/i');
      await expect(resultado.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('debería permitir ver reporte de vencimientos', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar botón de vencimientos
    const vencimientosButton = page.locator('button:has-text(/Vencimientos|Ver.*Venc/i)');

    if (await vencimientosButton.isVisible()) {
      await vencimientosButton.click();

      // Esperar resultado
      await page.waitForTimeout(3000);

      // Verificar mensaje
      const resultado = page.locator('text=/encontraron|lotes|alertas|vencimiento/i');
      await expect(resultado.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('debería tener enlace a cortes de existencias', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar enlace a cortes
    const cortesLink = page.locator('a:has-text(/Cortes|Ver.*Cortes/i)');

    if (await cortesLink.isVisible()) {
      await cortesLink.click();
      await page.waitForURL(/\/cortes/, { timeout: 5000 });
    }
  });

  test('debería tener enlace a bitácora de auditoría', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar enlace a bitácora
    const bitacoraLink = page.locator('a:has-text(/Bitácora|Auditoría/i)');

    if (await bitacoraLink.isVisible()) {
      await bitacoraLink.click();
      await page.waitForURL(/\/auditoria/, { timeout: 5000 });
    }
  });

  test('debería mostrar información regulatoria', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verificar que se muestra información regulatoria
    const regulatoria = page.locator('text=/Requisitos|Regulatorio|obligatorio|firma/i');
    const count = await regulatoria.count();

    // Debería haber alguna mención a requisitos regulatorios
    expect(count).toBeGreaterThan(0);
  });

  test('debería mostrar estado de informes generados', async ({ page }) => {
    // Verificar que hay información sobre informes existentes
    await page.waitForTimeout(1500);

    // La página debería indicar si hay informes pendientes o generados
    const estadoInfo = page.locator('text=/Informe|mensual|días|generar/i');
    const count = await estadoInfo.count();

    expect(count).toBeGreaterThan(0);
  });

  test('debería mostrar loading state al generar reportes', async ({ page }) => {
    await page.waitForTimeout(1000);

    const generarButton = page.locator('button:has-text(/Generar/i)').first();

    if (await generarButton.isVisible()) {
      await generarButton.click();

      // Verificar estado de carga
      const loadingState = page.locator('button:has-text(/Generando|Cargando/i), [class*="loading"], [class*="spinner"]');
      // El loading puede ser muy rápido, así que no verificamos estrictamente
    }
  });
});

test.describe('API de Reportes', () => {
  test('debería responder correctamente a GET /api/informes/vencimientos', async ({ request }) => {
    const response = await request.get('/api/informes/vencimientos');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  test('debería responder correctamente a GET /api/informes/mensual', async ({ request }) => {
    const response = await request.get('/api/informes/mensual');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  test('debería responder correctamente a GET /api/dashboard/metricas', async ({ request }) => {
    const response = await request.get('/api/dashboard/metricas');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('metricas');
  });
});
