/**
 * Cron Jobs - Sistema de tareas programadas
 *
 * Este módulo exporta todas las tareas cron del sistema.
 * Para ejecutar los cron jobs, se puede:
 * 1. Usar un servicio externo como Vercel Cron
 * 2. Configurar un cron job en el servidor
 * 3. Usar una API route que se llame periódicamente
 */

export { ejecutarCronInformes, verificarNecesidadInforme } from './informes.cron';
export { ejecutarCronCortes, verificarNecesidadCorte } from './cortes.cron';
export { ejecutarCronAlertas, generarAlertasVencimiento } from './alertas.cron';

/**
 * Configuración de horarios de ejecución:
 *
 * - Informe Mensual: Días 1, 2, 3 de cada mes a las 6:00 AM
 *   Cron: 0 6 1-3 * *
 *
 * - Corte Mensual: Día 1 de cada mes a las 00:01 AM
 *   Cron: 1 0 1 * *
 *
 * - Alertas de Vencimiento: Diariamente a las 7:00 AM
 *   Cron: 0 7 * * *
 */

export const CRON_SCHEDULES = {
  INFORME_MENSUAL: '0 6 1-3 * *',
  CORTE_MENSUAL: '1 0 1 * *',
  ALERTAS_VENCIMIENTO: '0 7 * * *',
} as const;
