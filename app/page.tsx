/**
 * Página Principal - Dashboard del Sistema de Inventario PEPS
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirigir al dashboard (después de auth)
  // Por ahora, redirigir directamente al dashboard
  redirect('/dashboard');
}
