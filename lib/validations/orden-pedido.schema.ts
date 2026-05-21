/**
 * Schemas de validación con Zod para Órdenes de Pedido (PANI ↔ Super Cadena)
 */

import { z } from 'zod'

const uuid = z.string().uuid('UUID inválido')

export const lineaPedidoSchema = z.object({
  articuloId: uuid,
  cantidadSolicitada: z.number().positive('La cantidad debe ser mayor a 0'),
  notas: z.string().max(500).optional(),
})

export const crearOrdenPedidoSchema = z
  .object({
    bodegaId: uuid,
    unidadReceptoraId: uuid,
    observaciones: z.string().max(1000).optional(),
    lineas: z.array(lineaPedidoSchema).min(1, 'Debe incluir al menos un artículo'),
  })
  .refine(
    (data) => {
      const ids = data.lineas.map((l) => l.articuloId)
      return new Set(ids).size === ids.length
    },
    {
      message: 'No se puede repetir el mismo artículo en dos líneas',
      path: ['lineas'],
    }
  )

export const rechazarOrdenSchema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

export const anularOrdenSchema = z.object({
  motivo: z.string().min(5, 'El motivo debe tener al menos 5 caracteres').max(500),
})

export const entregarOrdenSchema = z.object({
  receptor: z.string().min(3, 'El nombre del receptor es obligatorio'),
  cedula: z.string().min(1, 'La cédula es obligatoria').max(50),
  lineas: z
    .array(
      z.object({
        id: uuid,
        cantidadEntregada: z.number().min(0, 'No puede ser negativa'),
      })
    )
    .optional(),
})

export type CrearOrdenPedidoInput = z.infer<typeof crearOrdenPedidoSchema>
export type LineaPedidoInput = z.infer<typeof lineaPedidoSchema>
export type RechazarOrdenInput = z.infer<typeof rechazarOrdenSchema>
export type AnularOrdenInput = z.infer<typeof anularOrdenSchema>
export type EntregarOrdenInput = z.infer<typeof entregarOrdenSchema>
