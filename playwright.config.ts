import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Configuración de Playwright para tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */

const authFile = path.join(__dirname, '.playwright/.auth/user.json');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // MVP: Sequential para facilitar debug
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // MVP: Single worker
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts razonables para MVP
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Setup project - se ejecuta primero para autenticar
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Tests con autenticación
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usar el estado de autenticación guardado
        storageState: authFile,
      },
      dependencies: ['setup'], // Ejecutar setup primero
    },
  ],

  // Web server para tests E2E
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
