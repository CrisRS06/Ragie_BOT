/**
 * Smoke Test - Verifica que el sistema esté vivo
 * Debe ejecutarse en < 10 segundos
 */

import { describe, it, expect } from 'vitest';

describe('Smoke Tests - Sistema Vivo', () => {
  it('debería poder hacer una petición al health check', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database).toBe('connected');
    expect(data.version).toBeDefined();
  }, 5000); // Timeout de 5 segundos

  it('debería tener la estructura de datos correcta', () => {
    // Test rápido de imports críticos
    expect(() => require('@/lib/prisma')).not.toThrow();
    expect(() => require('@/lib/services/peps.service')).not.toThrow();
    expect(() => require('@/lib/services/bitacora.service')).not.toThrow();
    expect(() => require('@/lib/services/cortes.service')).not.toThrow();
  });
});
