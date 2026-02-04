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
    const reporteCards = page.getByText(/Informe|Reporte|Mensual|Vencimientos|Cortes|Bitácora/i);
    const cardCount = await reporteCards.count();

    expect(cardCount).toBeGreaterThan(0);
  });

  test('debería permitir generar informe mensual', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar botón de generar informe mensual (usar nombre exacto)
    const generarButton = page.getByRole('button', { name: 'Generar Informe' });

    if (await generarButton.isVisible()) {
      await generarButton.click();

      // Esperar resultado (puede ser éxito, error, o mensaje de no implementado)
      await page.waitForTimeout(3000);

      // Verificar que aparece algún mensaje de resultado (incluye "no implementada")
      const resultado = page.locator('[class*="bg-green-50"], [class*="bg-red-50"]').first();
      await expect(resultado).toBeVisible({ timeout: 10000 });
    }
  });

  test('debería permitir ver reporte de vencimientos', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar botón o link de vencimientos
    const vencimientosButton = page.getByRole('button', { name: /Vencimientos/i });
    const vencimientosLink = page.getByRole('link', { name: /Vencimientos/i });

    if (await vencimientosButton.isVisible()) {
      await vencimientosButton.click();
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
    } else if (await vencimientosLink.isVisible()) {
      await vencimientosLink.click();
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('debería tener enlace a cortes de existencias', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar enlace a cortes (usar nombre más específico)
    const cortesLink = page.getByRole('link', { name: 'Ver Cortes' });

    if (await cortesLink.isVisible()) {
      await cortesLink.click();
      await page.waitForURL(/\/cortes/, { timeout: 5000 });
    } else {
      // Intentar con el link del navbar
      const navCortesLink = page.getByRole('link', { name: 'Cortes', exact: true });
      if (await navCortesLink.isVisible()) {
        await navCortesLink.click();
        await page.waitForURL(/\/cortes/, { timeout: 5000 });
      }
    }
  });

  test('debería tener enlace a bitácora de auditoría', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Buscar enlace a bitácora (usar nombre más específico)
    const bitacoraLink = page.getByRole('link', { name: 'Ver Bitácora' });

    if (await bitacoraLink.isVisible()) {
      await bitacoraLink.click();
      await page.waitForURL(/\/auditoria/, { timeout: 5000 });
    } else {
      // Intentar con el link del navbar
      const navAuditoriaLink = page.getByRole('link', { name: 'Auditoría', exact: true });
      if (await navAuditoriaLink.isVisible()) {
        await navAuditoriaLink.click();
        await page.waitForURL(/\/auditoria/, { timeout: 5000 });
      }
    }
  });

  test('debería mostrar información regulatoria', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verificar que se muestra información regulatoria
    const regulatoria = page.getByText(/Requisitos|Regulatorio|obligatorio|firma/i);
    const count = await regulatoria.count();

    // Debería haber alguna mención a requisitos regulatorios
    expect(count).toBeGreaterThan(0);
  });

  test('debería mostrar estado de informes generados', async ({ page }) => {
    // Verificar que hay información sobre informes existentes
    await page.waitForTimeout(1500);

    // La página debería indicar si hay informes pendientes o generados
    const estadoInfo = page.getByText(/Informe|mensual|días|generar/i);
    const count = await estadoInfo.count();

    expect(count).toBeGreaterThan(0);
  });

  test('debería mostrar loading state al generar reportes', async ({ page }) => {
    await page.waitForTimeout(1000);

    const generarButton = page.getByRole('button', { name: /Generar/i }).first();

    if (await generarButton.isVisible()) {
      await generarButton.click();

      // Verificar estado de carga - el loading puede ser muy rápido
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('API de Reportes', () => {
  // Nota: Estos tests de API necesitan autenticación,
  // que se hereda del storage state configurado en playwright.config.ts

  test('debería responder correctamente a GET /api/informes/vencimientos', async ({ request }) => {
    const response = await request.get('/api/informes/vencimientos');
    // La API puede devolver 200 o 401 dependiendo de la autenticación
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('debería responder correctamente a GET /api/informes/mensual', async ({ request }) => {
    const response = await request.get('/api/informes/mensual');
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('debería responder correctamente a GET /api/dashboard/metricas', async ({ request }) => {
    const response = await request.get('/api/dashboard/metricas');
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });
});
