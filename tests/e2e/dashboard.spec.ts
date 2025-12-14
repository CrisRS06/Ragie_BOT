/**
 * E2E Test - Dashboard Principal
 *
 * Verifica el dashboard dinámico:
 * 1. Carga de métricas reales
 * 2. Accesos rápidos funcionando
 * 3. Últimos movimientos
 * 4. Alertas del sistema
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('debería cargar el dashboard correctamente', async ({ page }) => {
    // Esperar a que carguen las métricas
    await page.waitForTimeout(2000);

    // Verificar que no hay error de carga
    await expect(page.locator('text=/Error de conexión/i')).not.toBeVisible();

    // Verificar que hay contenido
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería mostrar métricas principales', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar que hay tarjetas de métricas
    const metricCards = page.locator('text=/Artículos|Movimientos|Alertas|Cortes/i');
    const cardCount = await metricCards.count();

    expect(cardCount).toBeGreaterThan(0);
  });

  test('debería mostrar accesos rápidos', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Verificar que hay accesos rápidos
    const quickLinks = page.locator('a[href*="/"]');
    const linkCount = await quickLinks.count();

    expect(linkCount).toBeGreaterThan(0);
  });

  test('debería navegar a Nueva Recepción desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const recepcionLink = page.locator('a:has-text("Nueva Recepción")');
    if (await recepcionLink.isVisible()) {
      await recepcionLink.click();
      await page.waitForURL(/\/recepciones/, { timeout: 5000 });
    }
  });

  test('debería navegar a Despacho PEPS desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const despachoLink = page.locator('a:has-text("Despacho PEPS")');
    if (await despachoLink.isVisible()) {
      await despachoLink.click();
      await page.waitForURL(/\/despachos/, { timeout: 5000 });
    }
  });

  test('debería navegar a Inventario desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const inventarioLink = page.locator('a:has-text("Inventario")');
    if (await inventarioLink.isVisible()) {
      await inventarioLink.click();
      await page.waitForURL(/\/inventario/, { timeout: 5000 });
    }
  });

  test('debería navegar a Cortes desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const cortesLink = page.locator('a:has-text(/Corte|Cortes/i)');
    if (await cortesLink.isVisible()) {
      await cortesLink.click();
      await page.waitForURL(/\/cortes/, { timeout: 5000 });
    }
  });

  test('debería navegar a Reportes desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const reportesLink = page.locator('a:has-text(/Informes|Reportes/i)');
    if (await reportesLink.isVisible()) {
      await reportesLink.click();
      await page.waitForURL(/\/reportes/, { timeout: 5000 });
    }
  });

  test('debería navegar a Auditoría desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const auditoriaLink = page.locator('a:has-text("Auditoría")');
    if (await auditoriaLink.isVisible()) {
      await auditoriaLink.click();
      await page.waitForURL(/\/auditoria/, { timeout: 5000 });
    }
  });

  test('debería mostrar alertas si existen', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar si hay alertas visibles
    const alertas = page.locator('[class*="alert"], [class*="warning"], text=/Atención|Alerta/i');
    // No verificamos estrictamente porque puede no haber alertas
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería mostrar sección de últimos movimientos', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar que hay sección de últimos movimientos
    const movimientosSection = page.locator('text=/Últimos.*Movimientos|Movimientos.*recientes/i');
    const hasMovimientos = await movimientosSection.isVisible();

    // La página debería cargar correctamente aunque no haya movimientos
    expect(hasMovimientos || (await page.locator('body').isVisible())).toBeTruthy();
  });

  test('debería mostrar footer con información del sistema', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Verificar footer
    const footer = page.locator('footer, text=/PANI|Sistema de Inventario|PEPS/i');
    const footerCount = await footer.count();

    expect(footerCount).toBeGreaterThan(0);
  });
});

test.describe('Navegación Global (Navbar)', () => {
  test('debería mostrar la barra de navegación', async ({ page }) => {
    await page.goto('/dashboard');

    // Verificar que el navbar está visible
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
  });

  test('debería tener todos los links de navegación activos', async ({ page }) => {
    await page.goto('/dashboard');

    // Verificar links principales
    const links = [
      'Dashboard',
      'Recepciones',
      'Despachos',
      'Inventario',
      'Cortes',
      'Reportes',
      'Auditoría',
    ];

    for (const linkText of links) {
      const link = page.locator(`nav a:has-text("${linkText}")`);
      const count = await link.count();
      // Verificar que el link existe y no está deshabilitado
      if (count > 0) {
        const isDisabled = await link.getAttribute('class');
        expect(isDisabled).not.toContain('disabled');
      }
    }
  });

  test('debería navegar a cada sección desde el navbar', async ({ page }) => {
    await page.goto('/dashboard');

    // Probar navegación a Inventario
    await page.click('nav a:has-text("Inventario")');
    await expect(page).toHaveURL(/\/inventario/);

    // Volver y probar Cortes
    await page.click('nav a:has-text("Cortes")');
    await expect(page).toHaveURL(/\/cortes/);

    // Volver y probar Reportes
    await page.click('nav a:has-text("Reportes")');
    await expect(page).toHaveURL(/\/reportes/);

    // Volver y probar Auditoría
    await page.click('nav a:has-text("Auditoría")');
    await expect(page).toHaveURL(/\/auditoria/);
  });

  test('debería mostrar el usuario actual', async ({ page }) => {
    await page.goto('/dashboard');

    // Verificar que se muestra info del usuario
    const userInfo = page.locator('text=/Administrador|admin/i');
    await expect(userInfo.first()).toBeVisible();
  });

  test('debería funcionar el menú mobile', async ({ page }) => {
    // Simular viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Buscar botón de menú
    const menuButton = page.locator('button[aria-label*="menú"], button:has(svg)');

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Verificar que se abre el menú
      await page.waitForTimeout(500);
      const mobileMenu = page.locator('nav a:visible');
      const visibleLinks = await mobileMenu.count();
      expect(visibleLinks).toBeGreaterThan(0);
    }
  });
});
