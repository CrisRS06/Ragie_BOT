/**
 * Schemas de validación con Zod para Artículos
 */

import { z } from 'zod';

/**
 * Unidades de medida permitidas
 */
export const UnidadMedidaEnum = z.enum([
  'UNIDAD',
  'KILOGRAMO',
  'GRAMO',
  'LITRO',
  'MILILITRO',
  'METRO',
  'CENTIMETRO',
  'PAQUETE',
  'CAJA',
  'BOLSA',
  'ROLLO',
  'GALON',
  'LIBRA',
  'ONZA',
]);

export type UnidadMedida = z.infer<typeof UnidadMedidaEnum>;

/**
 * Schema para crear un artículo
 */
export const createArticuloSchema = z.object({
  sku: z
    .string()
    .min(3, 'El SKU debe tener al menos 3 caracteres')
    .max(50, 'El SKU no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9\-]+$/, 'El SKU solo puede contener letras mayúsculas, números y guiones'),
  nombre: z
    .string()
    .min(5, 'El nombre debe tener al menos 5 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  descripcionSIGAF: z
    .string()
    .min(10, 'La descripción SIGAF debe tener al menos 10 caracteres')
    .max(500, 'La descripción SIGAF no puede exceder 500 caracteres')
    .regex(
      /^[A-Z0-9\s\-.,()]+$/,
      'La descripción SIGAF solo puede contener mayúsculas, números, espacios y puntuación básica'
    ),
  codigoSIGAF: z.string().optional(),
  // FASE 1: Campos adicionales PANI
  codigoBarras: z.string().max(50, 'El código de barras no puede exceder 50 caracteres').optional().nullable(),
  marca: z.string().max(100, 'La marca no puede exceder 100 caracteres').optional().nullable(),
  ivaPercent: z
    .number()
    .min(0, 'El porcentaje de IVA no puede ser negativo')
    .max(1, 'El porcentaje de IVA debe ser entre 0 y 1 (ej: 0.13 para 13%)')
    .optional()
    .default(0.13),
  observaciones: z.string().max(2000, 'Las observaciones no pueden exceder 2000 caracteres').optional().nullable(),
  unidadMedida: UnidadMedidaEnum,
  stockMinimo: z.number().min(0, 'El stock mínimo no puede ser negativo').optional().default(0),
  stockMaximo: z.number().min(0, 'El stock máximo no puede ser negativo').optional(),
  ubicacionDefault: z.string().optional(),
  categoria: z.string().optional(),
  activo: z.boolean().optional().default(true),
});

export type CreateArticuloInput = z.infer<typeof createArticuloSchema>;

/**
 * Schema para actualizar un artículo
 */
export const updateArticuloSchema = createArticuloSchema.partial().extend({
  id: z.string().min(1, 'El ID del artículo es obligatorio'),
});

export type UpdateArticuloInput = z.infer<typeof updateArticuloSchema>;

/**
 * Schema para respuesta de artículo
 */
export const articuloResponseSchema = z.object({
  id: z.string(),
  sku: z.string(),
  nombre: z.string(),
  descripcionSIGAF: z.string(),
  codigoSIGAF: z.string().nullable(),
  // FASE 1: Campos adicionales PANI
  codigoBarras: z.string().nullable(),
  marca: z.string().nullable(),
  ivaPercent: z.number(),
  observaciones: z.string().nullable(),
  unidadMedida: z.string(),
  stockMinimo: z.number(),
  stockMaximo: z.number().nullable(),
  ubicacionDefault: z.string().nullable(),
  categoria: z.string().nullable(),
  activo: z.boolean(),
  stockActual: z.number().optional(),
  totalLotes: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ArticuloResponse = z.infer<typeof articuloResponseSchema>;

/**
 * Schema para filtros de listado de artículos
 */
export const listArticulosSchema = z.object({
  busqueda: z.string().optional(),
  categoria: z.string().optional(),
  soloActivos: z.boolean().optional().default(true),
  conStock: z.boolean().optional(),
  sinStock: z.boolean().optional(),
  limite: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  ordenarPor: z.enum(['nombre', 'sku', 'stockActual', 'createdAt']).optional().default('nombre'),
  orden: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type ListArticulosInput = z.infer<typeof listArticulosSchema>;

/**
 * Schema para importación masiva de artículos (CSV)
 */
export const importArticulosCSVSchema = z.object({
  datos: z.array(
    z.object({
      sku: z.string().min(1),
      nombre: z.string().min(1),
      descripcionSIGAF: z.string().min(1),
      codigoSIGAF: z.string().optional(),
      unidadMedida: z.string(),
      stockMinimo: z.string().optional(),
    })
  ),
  actualizarExistentes: z.boolean().optional().default(false),
});

export type ImportArticulosCSVInput = z.infer<typeof importArticulosCSVSchema>;

/**
 * Schema para artículo con información de stock
 */
export const articuloConStockSchema = articuloResponseSchema.extend({
  stockActual: z.number(),
  totalLotes: z.number(),
  lotesProximosAVencer: z.number(),
  alertaStockBajo: z.boolean(),
});

export type ArticuloConStock = z.infer<typeof articuloConStockSchema>;
