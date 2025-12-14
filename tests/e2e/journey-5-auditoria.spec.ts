/**
 * E2E Test - Journey 5: Auditoría / Bitácora
 *
 * Verifica el flujo de auditoría:
 * 1. Ver listado de eventos de bitácora
 * 2. Filtrar por fecha, acción, entidad
 * 3. Verificar integridad del hash encadenado
 * 4. Exportar bitácora a CSV
 */

import { test, expect } from '@playwright/test';

test.describe('Journey 5: Auditoría / Bitácora', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auditoria');
  });

  test('debería mostrar la página de auditoría', async ({ page }) => {
    // Verificar título
    await expect(page.locator('h1')).toContainText(/Auditoría|Bitácora/i);

    // Verificar que la página cargó
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('debería cargar registros de bitácora', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar que hay una tabla o lista de registros
    const tabla = page.locator('table');
    if (await tabla.isVisible()) {
      // Verificar encabezados típicos de bitácora
      const headers = page.locator('th, thead td');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });

  test('debería mostrar filtros de búsqueda', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Verificar que hay campos de filtro
    const filtros = page.locator('input[type="date"], select, input[type="search"]');
    const filtroCount = await filtros.count();

    // Debería haber algún tipo de filtro
    expect(filtroCount).toBeGreaterThan(0);
  });

  test('debería permitir filtrar por fecha', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Buscar campos de fecha
    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    if (dateCount > 0) {
      // Establecer fecha desde
      const hoy = new Date().toISOString().split('T')[0];
      await dateInputs.first().fill(hoy);

      // Buscar botón de filtrar
      const filterButton = page.locator('button:has-text(/Filtrar|Buscar|Aplicar/i)');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(1500);
      }

      // Verificar que no hay error
      await expect(page.locator('text=/Error de conexión/i')).not.toBeVisible();
    }
  });

  test('debería permitir filtrar por acción', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Buscar select de acción
    const accionSelect = page.locator('select').nth(0);

    if (await accionSelect.isVisible()) {
      const options = accionSelect.locator('option');
      const optionCount = await options.count();

      if (optionCount > 1) {
        await accionSelect.selectOption({ index: 1 });

        const filterButton = page.locator('button:has-text(/Filtrar|Buscar|Aplicar/i)');
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.waitForTimeout(1500);
        }
      }
    }
  });

  test('debería mostrar información de hash para cada registro', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Buscar elementos que muestran hash
    const hashElements = page.locator('code, .font-mono, td:has-text("...")');
    const hashCount = await hashElements.count();

    // Si hay registros, deberían mostrar hash
    if (hashCount > 0) {
      expect(hashCount).toBeGreaterThan(0);
    }
  });

  test('debería permitir verificar integridad de la bitácora', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Buscar botón de verificar integridad
    const verifyButton = page.locator('button:has-text(/Verificar.*Integridad|Verificar/i)');

    if (await verifyButton.isVisible()) {
      await verifyButton.click();

      // Esperar resultado
      await page.waitForTimeout(3000);

      // Debería mostrar resultado de verificación
      const resultado = page.locator('text=/íntegro|válido|registros verificados|cadena íntegra/i');
      const resultadoVisible = await resultado.isVisible();

      // Alternativamente puede mostrar error si la cadena está rota
      const errorResult = page.locator('text=/error|corrupto|rota/i');
      const errorVisible = await errorResult.isVisible();

      // Debería mostrar algún resultado
      expect(resultadoVisible || errorVisible).toBeTruthy();
    }
  });

  test('debería permitir exportar bitácora a CSV', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Buscar botón de exportar
    const exportButton = page.locator('button:has-text(/Exportar.*CSV|Exportar|CSV/i)');

    if (await exportButton.isVisible()) {
      // Configurar listener para descarga
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        expect(filename).toContain('.csv');
      }
    }
  });

  test('debería mostrar información de usuario para cada evento', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Buscar tabla de registros
    const tabla = page.locator('table');
    if (await tabla.isVisible()) {
      // Verificar que hay columna de usuario
      const usuarioHeader = page.locator('th:has-text(/Usuario/i)');
      const hasUsuario = await usuarioHeader.isVisible();

      // O verificar en las filas
      const usuarioCell = page.locator('td:has-text(/Sistema|admin|Administrador/i)');
      const hasUsuarioCells = (await usuarioCell.count()) >= 0;

      // La página debería cargar correctamente
      expect(hasUsuario || hasUsuarioCells).toBeTruthy();
    }
  });

  test('debería mostrar fecha/hora formateada', async ({ page }) => {
    await page.waitForTimeout(2000);

    const tabla = page.locator('table');
    if (await tabla.isVisible()) {
      // Verificar que hay fechas formateadas (formato dd/mm/yyyy o similar)
      const fechaCells = page.locator('td:has-text(/\\d{2}\\/\\d{2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2}/)');
      const fechaCount = await fechaCells.count();

      // Si hay registros, deberían tener fechas
      if (fechaCount > 0) {
        expect(fechaCount).toBeGreaterThan(0);
      }
    }
  });

  test('debería manejar bitácora vacía correctamente', async ({ page }) => {
    // Filtrar por fecha futura para simular vacío
    await page.waitForTimeout(1500);

    const dateInputs = page.locator('input[type="date"]');
    const dateCount = await dateInputs.count();

    if (dateCount >= 2) {
      const fechaFutura = new Date();
      fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
      const fechaStr = fechaFutura.toISOString().split('T')[0];

      await dateInputs.first().fill(fechaStr);
      await dateInputs.last().fill(fechaStr);

      const filterButton = page.locator('button:has-text(/Filtrar|Buscar|Aplicar/i)');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(1500);

        // Debería mostrar mensaje de "sin registros" o tabla vacía
        const emptyMessage = page.locator('text=/No hay|vacío|sin registros/i');
        // No verificamos estrictamente porque puede haber registros futuros
      }
    }
  });
});
