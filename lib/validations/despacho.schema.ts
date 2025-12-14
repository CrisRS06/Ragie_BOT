/**
 * Schemas de validación con Zod para Despachos PEPS
 */

import { z } from 'zod';

/**
 * Schema para crear un despacho
 */
export const createDespachoSchema = z.object({
  articuloId: z.string().min(1, 'El artículo es obligatorio'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  receptor: z.string().min(3, 'El nombre del receptor es obligatorio (mínimo 3 caracteres)'),
  cedulaReceptor: z.string().optional(),
  unidadReceptoraId: z.string().optional(),
  observaciones: z.string().optional(),
  // Opcional: permitir especificar lotes manualmente (para excepciones autorizadas)
  lotesEspecificos: z
    .array(
      z.object({
        loteId: z.string(),
        cantidad: z.number().positive(),
      })
    )
    .optional(),
  // Para excepciones al orden PEPS (requiere autorización)
  excepcionPEPS: z.boolean().optional().default(false),
  motivoExcepcion: z.string().min(10, 'El motivo de excepción debe tener al menos 10 caracteres').optional(),
});

export type CreateDespachoInput = z.infer<typeof createDespachoSchema>;

/**
 * Validación adicional: si hay excepción PEPS, el motivo es obligatorio
 */
export const createDespachoSchemaRefinado = createDespachoSchema.refine(
  (data) => {
    if (data.excepcionPEPS && !data.motivoExcepcion) {
      return false;
    }
    return true;
  },
  {
    message: 'El motivo es obligatorio cuando se solicita una excepción al orden PEPS',
    path: ['motivoExcepcion'],
  }
);

/**
 * Schema para respuesta de despacho creado
 */
export const despachoResponseSchema = z.object({
  success: z.boolean(),
  despachoId: z.string(),
  movimientos: z.array(
    z.object({
      id: z.string(),
      loteId: z.string(),
      cantidad: z.number(),
    })
  ),
  lotesConsumidos: z.array(
    z.object({
      loteId: z.string(),
      numeroLote: z.string().nullable(),
      cantidadConsumida: z.number(),
      cantidadRestante: z.number(),
      fechaVencimiento: z.date(),
    })
  ),
  cantidadTotal: z.number(),
});

export type DespachoResponse = z.infer<typeof despachoResponseSchema>;

/**
 * Schema para consultar lotes PEPS de un artículo
 */
export const getLotesPEPSSchema = z.object({
  articuloId: z.string().min(1, 'El ID del artículo es obligatorio'),
  cantidadRequerida: z.number().positive().optional(),
});

export type GetLotesPEPSInput = z.infer<typeof getLotesPEPSSchema>;

/**
 * Schema para anular un despacho
 */
export const anularDespachoSchema = z.object({
  despachoId: z.string().min(1, 'El ID del despacho es obligatorio'),
  motivo: z.string().min(10, 'El motivo de anulación debe tener al menos 10 caracteres'),
});

export type AnularDespachoInput = z.infer<typeof anularDespachoSchema>;
