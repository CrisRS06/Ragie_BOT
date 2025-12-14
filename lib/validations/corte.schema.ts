/**
 * Schemas de validación con Zod para Cortes de Existencias
 */

import { z } from 'zod';

/**
 * Tipos de corte disponibles
 */
export const TipoCorteEnum = z.enum([
  'MENSUAL_AUTOMATICO',
  'BAJO_DEMANDA',
  'COMPRA_SEGUN_DEMANDA',
]);

export type TipoCorte = z.infer<typeof TipoCorteEnum>;

/**
 * Schema para crear un corte bajo demanda
 */
export const createCorteSchema = z.object({
  tipo: TipoCorteEnum.default('BAJO_DEMANDA'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
  periodoInicio: z.coerce.date().optional(),
  periodoFin: z.coerce.date().optional(),
});

export type CreateCorteInput = z.infer<typeof createCorteSchema>;

/**
 * Schema para respuesta de corte creado
 */
export const corteResponseSchema = z.object({
  success: z.boolean(),
  corte: z.object({
    id: z.string(),
    tipo: TipoCorteEnum,
    timestamp: z.date(),
    hashSnapshot: z.string(),
    motivo: z.string().nullable(),
  }),
  totalArticulos: z.number(),
  totalLotes: z.number(),
  totalUnidades: z.number(),
});

export type CorteResponse = z.infer<typeof corteResponseSchema>;

/**
 * Schema para verificar integridad de un corte
 */
export const verificarCorteSchema = z.object({
  corteId: z.string().min(1, 'El ID del corte es obligatorio'),
});

export type VerificarCorteInput = z.infer<typeof verificarCorteSchema>;

/**
 * Schema para resultado de verificación
 */
export const verificacionResultSchema = z.object({
  integro: z.boolean(),
  hashOriginal: z.string(),
  hashRecalculado: z.string(),
  coincide: z.boolean(),
  mensaje: z.string(),
});

export type VerificacionResult = z.infer<typeof verificacionResultSchema>;

/**
 * Schema para filtros de listado de cortes
 */
export const listCortesSchema = z.object({
  tipo: TipoCorteEnum.optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  limite: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ListCortesInput = z.infer<typeof listCortesSchema>;

/**
 * Schema para detalle de corte
 */
export const corteDetalleSchema = z.object({
  id: z.string(),
  articuloId: z.string(),
  loteId: z.string(),
  cantidad: z.number(),
  ubicacion: z.string().nullable(),
  fechaVencimiento: z.date(),
  articulo: z.object({
    sku: z.string(),
    nombre: z.string(),
    descripcionSIGAF: z.string(),
    unidadMedida: z.string(),
  }),
});

export type CorteDetalle = z.infer<typeof corteDetalleSchema>;
