/**
 * Setup global para tests con Vitest
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de variables de entorno para tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test_secret';
// NODE_ENV is already set by Vitest to 'test'
