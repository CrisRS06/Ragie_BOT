/**
 * Schemas de validación con Zod para Recepciones
 */

import { z } from 'zod';

/**
 * Schema para crear una recepción
 */
export const createRecepcionSchema = z.object({
  articuloId: z.string().min(1, 'El artículo es obligatorio'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  fechaVencimiento: z.coerce.date().refine(
    (date) => date > new Date(),
    'La fecha de vencimiento debe ser futura'
  ),
  numeroLote: z.string().optional(),
  proveedor: z.string().optional(),
  costoUnitario: z.number().positive().optional(),
  ubicacion: z.string().optional(),
  documentoReferencia: z.string().optional(),
});

export type CreateRecepcionInput = z.infer<typeof createRecepcionSchema>;

/**
 * Schema para respuesta de recepción creada
 */
export const recepcionResponseSchema = z.object({
  success: z.boolean(),
  lote: z.object({
    id: z.string(),
    articuloId: z.string(),
    cantidadInicial: z.number(),
    cantidadDisponible: z.number(),
    fechaVencimiento: z.date(),
  }),
  movimiento: z.object({
    id: z.string(),
    tipo: z.string(),
    cantidad: z.number(),
  }),
});

export type RecepcionResponse = z.infer<typeof recepcionResponseSchema>;
