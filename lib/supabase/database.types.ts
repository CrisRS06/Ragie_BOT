export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      articulos: {
        Row: {
          activo: boolean | null
          codigo_sigaf: string | null
          created_at: string | null
          descripcion: string | null
          descripcion_sigaf: string | null
          id: string
          iva_percent: number | null
          marca: string | null
          nombre: string
          proveedor_id: string | null
          sku: string
          stock_minimo: number | null
          unidad_medida: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo_sigaf?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_sigaf?: string | null
          id?: string
          iva_percent?: number | null
          marca?: string | null
          nombre: string
          proveedor_id?: string | null
          sku: string
          stock_minimo?: number | null
          unidad_medida: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo_sigaf?: string | null
          created_at?: string | null
          descripcion?: string | null
          descripcion_sigaf?: string | null
          id?: string
          iva_percent?: number | null
          marca?: string | null
          nombre?: string
          proveedor_id?: string | null
          sku?: string
          stock_minimo?: number | null
          unidad_medida?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articulos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          accion: string
          created_at: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          entidad: string
          entidad_id: string | null
          id: string
          ip: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: string
          ip?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          ip?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      bodegas: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          direccion: string | null
          id: string
          nombre: string
          responsable: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          responsable?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          responsable?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalogo_sigaf: {
        Row: {
          activo: boolean | null
          analista: string | null
          clasificacion: string | null
          codigo: string
          contratacion: string | null
          contratista: string | null
          created_at: string | null
          descripcion: string
          id: string
          iva_percent: number | null
          observaciones: string | null
          partida: string | null
          plazo_entrega: string | null
          precio_unitario: number | null
        }
        Insert: {
          activo?: boolean | null
          analista?: string | null
          clasificacion?: string | null
          codigo: string
          contratacion?: string | null
          contratista?: string | null
          created_at?: string | null
          descripcion: string
          id?: string
          iva_percent?: number | null
          observaciones?: string | null
          partida?: string | null
          plazo_entrega?: string | null
          precio_unitario?: number | null
        }
        Update: {
          activo?: boolean | null
          analista?: string | null
          clasificacion?: string | null
          codigo?: string
          contratacion?: string | null
          contratista?: string | null
          created_at?: string | null
          descripcion?: string
          id?: string
          iva_percent?: number | null
          observaciones?: string | null
          partida?: string | null
          plazo_entrega?: string | null
          precio_unitario?: number | null
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          clave: string
          created_at: string | null
          descripcion: string | null
          tipo: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          clave: string
          created_at?: string | null
          descripcion?: string | null
          tipo?: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          clave?: string
          created_at?: string | null
          descripcion?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      contador_consecutivos: {
        Row: {
          anio: number
          tipo: string
          ultimo_numero: number
          updated_at: string | null
        }
        Insert: {
          anio: number
          tipo: string
          ultimo_numero?: number
          updated_at?: string | null
        }
        Update: {
          anio?: number
          tipo?: string
          ultimo_numero?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cortes: {
        Row: {
          completado: boolean | null
          created_at: string | null
          hash_snapshot: string | null
          id: string
          motivo: string | null
          periodo_fin: string | null
          periodo_inicio: string | null
          solicitado_por_id: string | null
          tipo: string | null
          total_articulos: number | null
          total_lotes: number | null
        }
        Insert: {
          completado?: boolean | null
          created_at?: string | null
          hash_snapshot?: string | null
          id?: string
          motivo?: string | null
          periodo_fin?: string | null
          periodo_inicio?: string | null
          solicitado_por_id?: string | null
          tipo?: string | null
          total_articulos?: number | null
          total_lotes?: number | null
        }
        Update: {
          completado?: boolean | null
          created_at?: string | null
          hash_snapshot?: string | null
          id?: string
          motivo?: string | null
          periodo_fin?: string | null
          periodo_inicio?: string | null
          solicitado_por_id?: string | null
          tipo?: string | null
          total_articulos?: number | null
          total_lotes?: number | null
        }
        Relationships: []
      }
      detalles_corte: {
        Row: {
          articulo_id: string
          cantidad: number
          corte_id: string
          created_at: string | null
          fecha_vencimiento: string | null
          id: string
          lote_id: string | null
          ubicacion: string | null
        }
        Insert: {
          articulo_id: string
          cantidad: number
          corte_id: string
          created_at?: string | null
          fecha_vencimiento?: string | null
          id?: string
          lote_id?: string | null
          ubicacion?: string | null
        }
        Update: {
          articulo_id?: string
          cantidad?: number
          corte_id?: string
          created_at?: string | null
          fecha_vencimiento?: string | null
          id?: string
          lote_id?: string | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalles_corte_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_corte_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_corte_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      detalles_recepcion: {
        Row: {
          articulo_id: string
          cantidad: number
          costo_unitario: number | null
          created_at: string | null
          documento_id: string
          fecha_vencimiento: string | null
          id: string
          lote_id: string | null
          numero_lote_proveedor: string | null
          ubicacion: string | null
        }
        Insert: {
          articulo_id: string
          cantidad: number
          costo_unitario?: number | null
          created_at?: string | null
          documento_id: string
          fecha_vencimiento?: string | null
          id?: string
          lote_id?: string | null
          numero_lote_proveedor?: string | null
          ubicacion?: string | null
        }
        Update: {
          articulo_id?: string
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string | null
          documento_id?: string
          fecha_vencimiento?: string | null
          id?: string
          lote_id?: string | null
          numero_lote_proveedor?: string | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalles_recepcion_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_recepcion_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_recepcion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_recepcion_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_recepcion: {
        Row: {
          bodega_id: string | null
          created_at: string | null
          documento_externo: string | null
          estado: string | null
          fecha_documento: string | null
          id: string
          numero: string
          observaciones: string | null
          proveedor_id: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          bodega_id?: string | null
          created_at?: string | null
          documento_externo?: string | null
          estado?: string | null
          fecha_documento?: string | null
          id?: string
          numero: string
          observaciones?: string | null
          proveedor_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          bodega_id?: string | null
          created_at?: string | null
          documento_externo?: string | null
          estado?: string | null
          fecha_documento?: string | null
          id?: string
          numero?: string
          observaciones?: string | null
          proveedor_id?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_recepcion_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_recepcion_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      informes: {
        Row: {
          created_at: string | null
          datos: Json | null
          generado_por_id: string | null
          hash_firma: string | null
          id: string
          periodo_fin: string | null
          periodo_inicio: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          datos?: Json | null
          generado_por_id?: string | null
          hash_firma?: string | null
          id?: string
          periodo_fin?: string | null
          periodo_inicio?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          datos?: Json | null
          generado_por_id?: string | null
          hash_firma?: string | null
          id?: string
          periodo_fin?: string | null
          periodo_inicio?: string | null
          tipo?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          activo: boolean | null
          agotado: boolean | null
          articulo_id: string
          bodega_id: string | null
          cantidad_disponible: number
          cantidad_inicial: number
          costo_unitario: number | null
          created_at: string | null
          fecha_ingreso: string | null
          fecha_vencimiento: string | null
          id: string
          numero_lote: string | null
          proveedor: string | null
          ubicacion: string | null
        }
        Insert: {
          activo?: boolean | null
          agotado?: boolean | null
          articulo_id: string
          bodega_id?: string | null
          cantidad_disponible: number
          cantidad_inicial: number
          costo_unitario?: number | null
          created_at?: string | null
          fecha_ingreso?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_lote?: string | null
          proveedor?: string | null
          ubicacion?: string | null
        }
        Update: {
          activo?: boolean | null
          agotado?: boolean | null
          articulo_id?: string
          bodega_id?: string | null
          cantidad_disponible?: number
          cantidad_inicial?: number
          costo_unitario?: number | null
          created_at?: string | null
          fecha_ingreso?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_lote?: string | null
          proveedor?: string | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          anulado: boolean | null
          articulo_id: string
          bodega_id: string | null
          cantidad: number
          costo_unitario_peps: number | null
          created_at: string | null
          documento_referencia: string | null
          id: string
          lote_id: string | null
          motivo: string | null
          motivo_anulacion: string | null
          observaciones: string | null
          receptor_cedula: string | null
          receptor_nombre: string | null
          tipo: string
          unidad_medida: string | null
          unidad_receptora_id: string | null
          usuario_id: string | null
        }
        Insert: {
          anulado?: boolean | null
          articulo_id: string
          bodega_id?: string | null
          cantidad: number
          costo_unitario_peps?: number | null
          created_at?: string | null
          documento_referencia?: string | null
          id?: string
          lote_id?: string | null
          motivo?: string | null
          motivo_anulacion?: string | null
          observaciones?: string | null
          receptor_cedula?: string | null
          receptor_nombre?: string | null
          tipo: string
          unidad_medida?: string | null
          unidad_receptora_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          anulado?: boolean | null
          articulo_id?: string
          bodega_id?: string | null
          cantidad?: number
          costo_unitario_peps?: number | null
          created_at?: string | null
          documento_referencia?: string | null
          id?: string
          lote_id?: string | null
          motivo?: string | null
          motivo_anulacion?: string | null
          observaciones?: string | null
          receptor_cedula?: string | null
          receptor_nombre?: string | null
          tipo?: string
          unidad_medida?: string | null
          unidad_receptora_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_unidad_receptora_id_fkey"
            columns: ["unidad_receptora_id"]
            isOneToOne: false
            referencedRelation: "unidades_receptoras"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_pedido: {
        Row: {
          aceptado_por_id: string | null
          bodega_id: string | null
          created_at: string | null
          entregado_por_id: string | null
          estado: Database["public"]["Enums"]["estado_orden_pedido"]
          fecha_aceptacion: string | null
          fecha_entrega: string | null
          fecha_envio: string | null
          fecha_listo: string | null
          hash_firma: string | null
          id: string
          motivo_anulacion: string | null
          motivo_rechazo: string | null
          numero: string | null
          observaciones: string | null
          receptor_cedula: string | null
          receptor_nombre: string | null
          solicitante_id: string
          unidad_receptora_id: string | null
          updated_at: string | null
        }
        Insert: {
          aceptado_por_id?: string | null
          bodega_id?: string | null
          created_at?: string | null
          entregado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_orden_pedido"]
          fecha_aceptacion?: string | null
          fecha_entrega?: string | null
          fecha_envio?: string | null
          fecha_listo?: string | null
          hash_firma?: string | null
          id?: string
          motivo_anulacion?: string | null
          motivo_rechazo?: string | null
          numero?: string | null
          observaciones?: string | null
          receptor_cedula?: string | null
          receptor_nombre?: string | null
          solicitante_id: string
          unidad_receptora_id?: string | null
          updated_at?: string | null
        }
        Update: {
          aceptado_por_id?: string | null
          bodega_id?: string | null
          created_at?: string | null
          entregado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_orden_pedido"]
          fecha_aceptacion?: string | null
          fecha_entrega?: string | null
          fecha_envio?: string | null
          fecha_listo?: string | null
          hash_firma?: string | null
          id?: string
          motivo_anulacion?: string | null
          motivo_rechazo?: string | null
          numero?: string | null
          observaciones?: string | null
          receptor_cedula?: string | null
          receptor_nombre?: string | null
          solicitante_id?: string
          unidad_receptora_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_pedido_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_pedido_unidad_receptora_id_fkey"
            columns: ["unidad_receptora_id"]
            isOneToOne: false
            referencedRelation: "unidades_receptoras"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_pedido_lineas: {
        Row: {
          articulo_id: string
          cantidad_entregada: number | null
          cantidad_solicitada: number
          created_at: string | null
          id: string
          notas: string | null
          orden_id: string
        }
        Insert: {
          articulo_id: string
          cantidad_entregada?: number | null
          cantidad_solicitada: number
          created_at?: string | null
          id?: string
          notas?: string | null
          orden_id: string
        }
        Update: {
          articulo_id?: string
          cantidad_entregada?: number | null
          cantidad_solicitada?: number
          created_at?: string | null
          id?: string
          notas?: string | null
          orden_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_pedido_lineas_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_pedido_lineas_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string
          rol: string
          ultimo_acceso: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          id: string
          nombre: string
          rol?: string
          ultimo_acceso?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string
          rol?: string
          ultimo_acceso?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean | null
          codigo: string
          contacto: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          ruc: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          contacto?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          ruc?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          contacto?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          ruc?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades_receptoras: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          direccion: string | null
          id: string
          nombre: string
          responsable: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          responsable?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          responsable?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory: {
        Args: {
          p_cantidad_ajuste: number
          p_lote_id: string
          p_observaciones: string
          p_usuario_id: string
        }
        Returns: string
      }
      dispatch_peps:
        | {
            Args: {
              p_articulo_id: string
              p_cantidad: number
              p_documento?: string
              p_observaciones?: string
              p_receptor?: string
              p_usuario_id: string
            }
            Returns: {
              cantidad_consumida: number
              costo_unitario: number
              lote_id: string
            }[]
          }
        | {
            Args: {
              p_articulo_id: string
              p_bodega_id?: string
              p_cantidad: number
              p_documento?: string
              p_observaciones?: string
              p_receptor?: string
              p_usuario_id: string
            }
            Returns: {
              cantidad_consumida: number
              costo_unitario: number
              lote_id: string
            }[]
          }
      editar_orden_pedido: {
        Args: {
          p_bodega_id: string
          p_lineas: Json
          p_observaciones: string
          p_orden_id: string
          p_unidad_receptora_id: string
        }
        Returns: Json
      }
      entregar_orden_pedido: {
        Args: {
          p_cedula: string
          p_lineas?: Json
          p_orden_id: string
          p_receptor: string
          p_usuario_id: string
        }
        Returns: Json
      }
      receive_inventory:
        | {
            Args: {
              p_articulo_id: string
              p_bodega_id?: string
              p_cantidad: number
              p_costo_unitario?: number
              p_documento?: string
              p_fecha_vencimiento?: string
              p_numero_lote?: string
              p_proveedor?: string
              p_usuario_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_articulo_id: string
              p_cantidad: number
              p_costo_unitario: number
              p_documento?: string
              p_fecha_vencimiento: string
              p_numero_lote?: string
              p_proveedor?: string
              p_usuario_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_articulo_id: string
              p_bodega_id?: string
              p_cantidad: number
              p_costo_unitario: number
              p_documento?: string
              p_fecha_vencimiento: string
              p_numero_lote?: string
              p_proveedor?: string
              p_usuario_id: string
            }
            Returns: string
          }
      siguiente_consecutivo: {
        Args: { p_anio: number; p_tipo: string }
        Returns: number
      }
    }
    Enums: {
      estado_orden_pedido:
        | "BORRADOR"
        | "ENVIADO"
        | "EN_PREPARACION"
        | "LISTO_RETIRO"
        | "ENTREGADO"
        | "RECHAZADO"
        | "ANULADO"
      rol_usuario: "ADMINISTRADOR" | "OPERADOR" | "AUDITOR"
      tipo_movimiento: "ENTRADA" | "SALIDA" | "AJUSTE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_orden_pedido: [
        "BORRADOR",
        "ENVIADO",
        "EN_PREPARACION",
        "LISTO_RETIRO",
        "ENTREGADO",
        "RECHAZADO",
        "ANULADO",
      ],
      rol_usuario: ["ADMINISTRADOR", "OPERADOR", "AUDITOR"],
      tipo_movimiento: ["ENTRADA", "SALIDA", "AJUSTE"],
    },
  },
} as const

