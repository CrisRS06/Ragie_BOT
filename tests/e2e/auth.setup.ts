/**
 * Playwright Auth Setup
 *
 * Este archivo se ejecuta antes de los tests para autenticar
 * y guardar el estado de la sesión.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../.playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Credenciales de prueba (desde CLAUDE.md)
  const testEmail = process.env.TEST_USER_EMAIL || 'admin@bodegaje.example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'Admin2024Secure';

  // Ir a la página de login
  await page.goto('/login');

  // Esperar a que cargue la página (verifica que no esté en estado de "checking auth")
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Llenar el formulario
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);

  // Enviar el formulario
  await page.click('button[type="submit"]');

  // Esperar a que redirija al dashboard (indica login exitoso)
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // Guardar el estado de autenticación (cookies, localStorage, etc.)
  await page.context().storageState({ path: authFile });
});
