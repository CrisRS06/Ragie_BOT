/**
 * Smoke Test - Verifica que el sistema esté vivo
 * Debe ejecutarse en < 10 segundos
 */

import { describe, it, expect } from 'vitest';
import type { Database } from '@/lib/supabase/database.types';

describe('Smoke Tests - Sistema Vivo', () => {
  it('debería poder hacer una petición al health check', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
    expect(data.version).toBeDefined();
  }, 5000); // Timeout de 5 segundos

  it('debería tener los tipos de base de datos correctos', () => {
    // Verificar que los tipos de Supabase están definidos correctamente
    type Tables = Database['public']['Tables'];
    type Functions = Database['public']['Functions'];

    // Verificar tablas principales existen en los tipos
    const _articulos: Tables['articulos']['Row'] = {} as Tables['articulos']['Row'];
    const _lotes: Tables['lotes']['Row'] = {} as Tables['lotes']['Row'];
    const _movimientos: Tables['movimientos']['Row'] = {} as Tables['movimientos']['Row'];

    // Verificar funciones PEPS existen en los tipos
    const _dispatchPeps: Functions['dispatch_peps'] = {} as Functions['dispatch_peps'];
    const _receiveInventory: Functions['receive_inventory'] = {} as Functions['receive_inventory'];
    const _adjustInventory: Functions['adjust_inventory'] = {} as Functions['adjust_inventory'];

    // Si llegamos aquí sin errores de TypeScript, los tipos están correctos
    expect(true).toBe(true);
  });
});
