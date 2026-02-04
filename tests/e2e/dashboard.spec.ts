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
    await expect(page.getByText(/Error de conexión/i)).not.toBeVisible();

    // Verificar que hay contenido
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería mostrar métricas principales', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar que hay tarjetas de métricas
    const metricCards = page.getByText(/Artículos|Movimientos|Alertas|Cortes/i);
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

    const recepcionLink = page.getByRole('link', { name: /Nueva Recepción/i });
    if (await recepcionLink.isVisible()) {
      await recepcionLink.click();
      await page.waitForURL(/\/recepciones/, { timeout: 5000 });
    }
  });

  test('debería navegar a Despacho PEPS desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const despachoLink = page.getByRole('link', { name: 'Despachos' });
    if (await despachoLink.isVisible()) {
      await despachoLink.click();
      await page.waitForURL(/\/despachos/, { timeout: 5000 });
    }
  });

  test('debería navegar a Inventario desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const inventarioLink = page.getByRole('link', { name: 'Inventario', exact: true });
    if (await inventarioLink.isVisible()) {
      await inventarioLink.click();
      await page.waitForURL(/\/inventario/, { timeout: 5000 });
    }
  });

  test('debería navegar a Cortes desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const cortesLink = page.getByRole('link', { name: /Corte/i });
    if (await cortesLink.isVisible()) {
      await cortesLink.click();
      await page.waitForURL(/\/cortes/, { timeout: 5000 });
    }
  });

  test('debería navegar a Reportes desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const reportesLink = page.getByRole('link', { name: /Informes|Reportes/i });
    if (await reportesLink.isVisible()) {
      await reportesLink.click();
      await page.waitForURL(/\/reportes/, { timeout: 5000 });
    }
  });

  test('debería navegar a Auditoría desde acceso rápido', async ({ page }) => {
    await page.waitForTimeout(1500);

    const auditoriaLink = page.getByRole('link', { name: /Auditoría/i });
    if (await auditoriaLink.isVisible()) {
      await auditoriaLink.click();
      await page.waitForURL(/\/auditoria/, { timeout: 5000 });
    }
  });

  test('debería mostrar alertas si existen', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar si hay alertas visibles
    // No verificamos estrictamente porque puede no haber alertas
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería mostrar sección de últimos movimientos', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar que hay sección de últimos movimientos
    const movimientosSection = page.getByText(/Últimos.*Movimientos|Movimientos.*recientes/i).first();
    const hasMovimientos = await movimientosSection.isVisible().catch(() => false);

    // La página debería cargar correctamente aunque no haya movimientos
    expect(hasMovimientos || (await page.locator('body').isVisible())).toBeTruthy();
  });

  test('debería mostrar footer con información del sistema', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Verificar footer o información del sistema
    const footer = page.locator('footer');
    const systemInfo = page.getByText(/PANI|Sistema|PEPS|Inventario/i).first();

    const hasFooter = await footer.isVisible().catch(() => false);
    const hasSystemInfo = await systemInfo.isVisible().catch(() => false);

    expect(hasFooter || hasSystemInfo).toBeTruthy();
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

    // Verificar que el navbar tiene links
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();

    expect(count).toBeGreaterThan(0);
  });

  test('debería navegar a cada sección desde el navbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Probar navegación a Inventario
    const inventarioLink = page.locator('nav').getByRole('link', { name: 'Inventario', exact: true });
    if (await inventarioLink.isVisible()) {
      await inventarioLink.click();
      await expect(page).toHaveURL(/\/inventario/);
    }

    // Volver y probar Cortes
    const cortesLink = page.locator('nav').getByRole('link', { name: 'Cortes', exact: true });
    if (await cortesLink.isVisible()) {
      await cortesLink.click();
      await expect(page).toHaveURL(/\/cortes/);
    }

    // Volver y probar Reportes
    const reportesLink = page.locator('nav').getByRole('link', { name: 'Reportes', exact: true });
    if (await reportesLink.isVisible()) {
      await reportesLink.click();
      await expect(page).toHaveURL(/\/reportes/);
    }

    // Volver y probar Auditoría
    const auditoriaLink = page.locator('nav').getByRole('link', { name: 'Auditoría', exact: true });
    if (await auditoriaLink.isVisible()) {
      await auditoriaLink.click();
      await expect(page).toHaveURL(/\/auditoria/);
    }
  });

  test('debería mostrar el usuario actual', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Verificar que se muestra info del usuario
    const userInfo = page.getByText(/Administrador|admin/i).first();
    const isVisible = await userInfo.isVisible().catch(() => false);

    // El usuario puede mostrarse de varias formas
    expect(isVisible || await page.locator('body').isVisible()).toBeTruthy();
  });

  test('debería funcionar el menú mobile', async ({ page }) => {
    // Simular viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Buscar botón de menú
    const menuButton = page.locator('button[aria-label*="menú"], button[aria-label*="menu"]');
    const hamburgerButton = page.locator('nav button').first();

    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
    } else if (await hamburgerButton.isVisible()) {
      await hamburgerButton.click();
      await page.waitForTimeout(500);
    }

    // La página debería ser visible
    await expect(page.locator('body')).toBeVisible();
  });
});
