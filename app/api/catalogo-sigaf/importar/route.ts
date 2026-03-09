/**
 * API: /api/catalogo-sigaf/importar
 * POST - Importar códigos SIGAF desde Excel (CSV)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface SigafRow {
  codigo: string
  descripcion: string
  partida?: string
  precio_unitario?: number
  iva_percent?: number
  clasificacion?: string
  contratacion?: string
  contratista?: string
  plazo_entrega?: string
  analista?: string
  observaciones?: string
}

/**
 * POST /api/catalogo-sigaf/importar - Importar desde CSV/JSON
 * Recibe un array de objetos con los datos a importar
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('catalogo.gestionar')
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const body = await request.json()
    const { datos } = body as { datos: SigafRow[] }

    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron datos para importar' },
        { status: 400 }
      )
    }

    // Validar y transformar datos
    const registrosValidos: SigafRow[] = []
    const errores: { fila: number; error: string }[] = []

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i]

      // Validar campos requeridos
      if (!fila.codigo || !fila.descripcion) {
        errores.push({
          fila: i + 1,
          error: 'Código y descripción son requeridos',
        })
        continue
      }

      // Transformar datos
      registrosValidos.push({
        codigo: String(fila.codigo).trim(),
        descripcion: String(fila.descripcion).trim(),
        partida: fila.partida ? String(fila.partida).trim() : undefined,
        precio_unitario: fila.precio_unitario ? parseFloat(String(fila.precio_unitario)) : undefined,
        iva_percent: fila.iva_percent ? parseFloat(String(fila.iva_percent)) : 0.13,
        clasificacion: fila.clasificacion ? String(fila.clasificacion).trim() : undefined,
        contratacion: fila.contratacion ? String(fila.contratacion).trim() : undefined,
        contratista: fila.contratista ? String(fila.contratista).trim() : undefined,
        plazo_entrega: fila.plazo_entrega ? String(fila.plazo_entrega).trim() : undefined,
        analista: fila.analista ? String(fila.analista).trim() : undefined,
        observaciones: fila.observaciones ? String(fila.observaciones).trim() : undefined,
      })
    }

    if (registrosValidos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay registros válidos para importar',
          errores,
        },
        { status: 400 }
      )
    }

    // Upsert en lotes
    let insertados = 0
    let actualizados = 0
    const erroresDB: { codigo: string; error: string }[] = []

    for (const registro of registrosValidos) {
      // Verificar si ya existe
      const { data: existente } = await supabase
        .from('catalogo_sigaf')
        .select('id')
        .eq('codigo', registro.codigo)
        .single()

      if (existente) {
        // Actualizar
        const { error } = await supabaseAdmin
          .from('catalogo_sigaf')
          .update({
            descripcion: registro.descripcion,
            partida: registro.partida || null,
            precio_unitario: registro.precio_unitario || null,
            iva_percent: registro.iva_percent ?? 0.13,
            clasificacion: registro.clasificacion || null,
            contratacion: registro.contratacion || null,
            contratista: registro.contratista || null,
            plazo_entrega: registro.plazo_entrega || null,
            analista: registro.analista || null,
            observaciones: registro.observaciones || null,
            activo: true,
          })
          .eq('id', existente.id)

        if (error) {
          erroresDB.push({ codigo: registro.codigo, error: 'Error al guardar registro' })
        } else {
          actualizados++
        }
      } else {
        // Insertar
        const { error } = await supabaseAdmin
          .from('catalogo_sigaf')
          .insert({
            codigo: registro.codigo,
            descripcion: registro.descripcion,
            partida: registro.partida || null,
            precio_unitario: registro.precio_unitario || null,
            iva_percent: registro.iva_percent ?? 0.13,
            clasificacion: registro.clasificacion || null,
            contratacion: registro.contratacion || null,
            contratista: registro.contratista || null,
            plazo_entrega: registro.plazo_entrega || null,
            analista: registro.analista || null,
            observaciones: registro.observaciones || null,
            activo: true,
          })

        if (error) {
          erroresDB.push({ codigo: registro.codigo, error: 'Error al guardar registro' })
        } else {
          insertados++
        }
      }
    }

    // Registrar en audit_log
    await supabaseAdmin.from('audit_log').insert({
      usuario_id: user.id,
      accion: 'IMPORTAR_CATALOGO_SIGAF',
      entidad: 'catalogo_sigaf',
      datos_nuevos: {
        total_procesados: registrosValidos.length,
        insertados,
        actualizados,
        errores_validacion: errores.length,
        errores_db: erroresDB.length,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Importación completada: ${insertados} insertados, ${actualizados} actualizados`,
      resumen: {
        total_procesados: registrosValidos.length,
        insertados,
        actualizados,
        errores_validacion: errores,
        errores_db: erroresDB,
      },
    })
  } catch (error) {
    console.error('Error al importar catálogo SIGAF:', error)
    return NextResponse.json(
      { success: false, error: 'Error al importar catálogo' },
      { status: 500 }
    )
  }
}
