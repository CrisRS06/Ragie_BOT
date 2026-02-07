/**
 * Schemas de validación con Zod para Documentos de Recepción Multi-Producto
 */

import { z } from 'zod';

/**
 * Schema para una línea de recepción
 */
export const lineaRecepcionSchema = z.object({
  articuloId: z
    .string()
    .min(1, 'El artículo es obligatorio'),
  cantidad: z
    .number()
    .positive('La cantidad debe ser mayor a 0'),
  costoUnitario: z
    .number()
    .min(0, 'El costo unitario no puede ser negativo')
    .optional()
    .nullable(),
  fechaVencimiento: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine(
      (date) => date > new Date(),
      'La fecha de vencimiento debe ser futura'
    )
    .optional()
    .nullable(),
  numeroLoteProveedor: z
    .string()
    .max(100, 'El número de lote no puede exceder 100 caracteres')
    .optional()
    .nullable(),
  ubicacion: z
    .string()
    .max(100, 'La ubicación no puede exceder 100 caracteres')
    .optional()
    .nullable(),
});

export type LineaRecepcionInput = z.infer<typeof lineaRecepcionSchema>;

/**
 * Schema para crear un documento de recepción
 */
export const createDocumentoRecepcionSchema = z.object({
  proveedorId: z.string().optional().nullable(),
  documentoExterno: z
    .string()
    .max(100, 'El documento externo no puede exceder 100 caracteres')
    .optional()
    .nullable(),
  fechaDocumento: z
    .string()
    .or(z.date())
    .transform((val) => (val ? new Date(val) : null))
    .optional()
    .nullable(),
  observaciones: z
    .string()
    .max(2000, 'Las observaciones no pueden exceder 2000 caracteres')
    .optional()
    .nullable(),
  lineas: z
    .array(lineaRecepcionSchema)
    .min(1, 'El documento debe tener al menos una línea')
    .max(100, 'El documento no puede tener más de 100 líneas'),
});

export type CreateDocumentoRecepcionInput = z.infer<typeof createDocumentoRecepcionSchema>;

/**
 * Schema para procesar un documento
 */
export const procesarDocumentoSchema = z.object({
  documentoId: z.string().min(1, 'El ID del documento es obligatorio'),
});

export type ProcesarDocumentoInput = z.infer<typeof procesarDocumentoSchema>;

/**
 * Schema para anular un documento
 */
export const anularDocumentoSchema = z.object({
  documentoId: z.string().min(1, 'El ID del documento es obligatorio'),
  motivo: z
    .string()
    .min(10, 'El motivo debe tener al menos 10 caracteres')
    .max(500, 'El motivo no puede exceder 500 caracteres'),
});

export type AnularDocumentoInput = z.infer<typeof anularDocumentoSchema>;

/**
 * Schema para filtros de listado
 */
export const listDocumentosRecepcionSchema = z.object({
  estado: z
    .enum(['BORRADOR', 'PROCESADO', 'ANULADO_PARCIAL', 'ANULADO_TOTAL'])
    .optional(),
  proveedorId: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  limite: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ListDocumentosRecepcionInput = z.infer<typeof listDocumentosRecepcionSchema>;

/**
 * Estado del documento para respuestas
 */
export const estadoDocumentoEnum = z.enum([
  'BORRADOR',
  'PROCESADO',
  'ANULADO_PARCIAL',
  'ANULADO_TOTAL',
]);

export type EstadoDocumento = z.infer<typeof estadoDocumentoEnum>;
