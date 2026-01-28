export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      articulos: {
        Row: {
          id: string
          sku: string
          nombre: string
          descripcion: string | null
          descripcion_sigaf: string | null
          unidad_medida: string
          iva_percent: number
          activo: boolean
          stock_minimo: number | null
          marca: string | null
          proveedor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          nombre: string
          descripcion?: string | null
          descripcion_sigaf?: string | null
          unidad_medida: string
          iva_percent?: number
          activo?: boolean
          stock_minimo?: number | null
          marca?: string | null
          proveedor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          nombre?: string
          descripcion?: string | null
          descripcion_sigaf?: string | null
          unidad_medida?: string
          iva_percent?: number
          activo?: boolean
          stock_minimo?: number | null
          marca?: string | null
          proveedor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articulos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          }
        ]
      }
      lotes: {
        Row: {
          id: string
          articulo_id: string
          cantidad_inicial: number
          cantidad_disponible: number
          fecha_ingreso: string
          fecha_vencimiento: string
          numero_lote: string | null
          proveedor: string | null
          costo_unitario: number | null
          ubicacion: string | null
          activo: boolean
          agotado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          articulo_id: string
          cantidad_inicial: number
          cantidad_disponible: number
          fecha_ingreso?: string
          fecha_vencimiento: string
          numero_lote?: string | null
          proveedor?: string | null
          costo_unitario?: number | null
          ubicacion?: string | null
          activo?: boolean
          agotado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          articulo_id?: string
          cantidad_inicial?: number
          cantidad_disponible?: number
          fecha_ingreso?: string
          fecha_vencimiento?: string
          numero_lote?: string | null
          proveedor?: string | null
          costo_unitario?: number | null
          ubicacion?: string | null
          activo?: boolean
          agotado?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          }
        ]
      }
      movimientos: {
        Row: {
          id: string
          tipo: string
          articulo_id: string
          lote_id: string | null
          cantidad: number
          unidad_medida: string | null
          costo_unitario_peps: number | null
          usuario_id: string | null
          receptor_nombre: string | null
          receptor_cedula: string | null
          unidad_receptora_id: string | null
          documento_referencia: string | null
          observaciones: string | null
          motivo: string | null
          motivo_anulacion: string | null
          anulado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tipo: string
          articulo_id: string
          lote_id?: string | null
          cantidad: number
          unidad_medida?: string | null
          costo_unitario_peps?: number | null
          usuario_id?: string | null
          receptor_nombre?: string | null
          receptor_cedula?: string | null
          unidad_receptora_id?: string | null
          documento_referencia?: string | null
          observaciones?: string | null
          motivo?: string | null
          motivo_anulacion?: string | null
          anulado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: string
          articulo_id?: string
          lote_id?: string | null
          cantidad?: number
          unidad_medida?: string | null
          costo_unitario_peps?: number | null
          usuario_id?: string | null
          receptor_nombre?: string | null
          receptor_cedula?: string | null
          unidad_receptora_id?: string | null
          documento_referencia?: string | null
          observaciones?: string | null
          motivo?: string | null
          motivo_anulacion?: string | null
          anulado?: boolean
          created_at?: string
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
            foreignKeyName: "movimientos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          }
        ]
      }
      perfiles: {
        Row: {
          id: string
          email: string | null
          nombre: string
          rol: string
          activo: boolean
          ultimo_acceso: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          nombre: string
          rol: string
          activo?: boolean
          ultimo_acceso?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          nombre?: string
          rol?: string
          activo?: boolean
          ultimo_acceso?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          id: string
          codigo: string
          nombre: string
          ruc: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          contacto: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo: string
          nombre: string
          ruc?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          contacto?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          nombre?: string
          ruc?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          contacto?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades_receptoras: {
        Row: {
          id: string
          codigo: string
          nombre: string
          direccion: string | null
          telefono: string | null
          responsable: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo: string
          nombre: string
          direccion?: string | null
          telefono?: string | null
          responsable?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          nombre?: string
          direccion?: string | null
          telefono?: string | null
          responsable?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          clave: string
          valor: string
          tipo: string
          descripcion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          clave: string
          valor: string
          tipo: string
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          clave?: string
          valor?: string
          tipo?: string
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_recepcion: {
        Row: {
          id: string
          numero: string
          proveedor_id: string | null
          documento_externo: string | null
          fecha_documento: string | null
          observaciones: string | null
          estado: string
          usuario_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero: string
          proveedor_id?: string | null
          documento_externo?: string | null
          fecha_documento?: string | null
          observaciones?: string | null
          estado?: string
          usuario_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: string
          proveedor_id?: string | null
          documento_externo?: string | null
          fecha_documento?: string | null
          observaciones?: string | null
          estado?: string
          usuario_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      detalles_recepcion: {
        Row: {
          id: string
          documento_id: string
          articulo_id: string
          cantidad: number
          costo_unitario: number | null
          fecha_vencimiento: string | null
          numero_lote_proveedor: string | null
          ubicacion: string | null
          lote_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          documento_id: string
          articulo_id: string
          cantidad: number
          costo_unitario?: number | null
          fecha_vencimiento?: string | null
          numero_lote_proveedor?: string | null
          ubicacion?: string | null
          lote_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          documento_id?: string
          articulo_id?: string
          cantidad?: number
          costo_unitario?: number | null
          fecha_vencimiento?: string | null
          numero_lote_proveedor?: string | null
          ubicacion?: string | null
          lote_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      informes: {
        Row: {
          id: string
          tipo: string
          periodo_inicio: string | null
          periodo_fin: string | null
          datos: Json | null
          hash_firma: string | null
          generado_por_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo: string
          periodo_inicio?: string | null
          periodo_fin?: string | null
          datos?: Json | null
          hash_firma?: string | null
          generado_por_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: string
          periodo_inicio?: string | null
          periodo_fin?: string | null
          datos?: Json | null
          hash_firma?: string | null
          generado_por_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cortes: {
        Row: {
          id: string
          tipo: string | null
          motivo: string | null
          hash_snapshot: string | null
          total_articulos: number | null
          total_lotes: number | null
          periodo_inicio: string | null
          periodo_fin: string | null
          completado: boolean
          solicitado_por_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo?: string | null
          motivo?: string | null
          hash_snapshot?: string | null
          total_articulos?: number | null
          total_lotes?: number | null
          periodo_inicio?: string | null
          periodo_fin?: string | null
          completado?: boolean
          solicitado_por_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: string | null
          motivo?: string | null
          hash_snapshot?: string | null
          total_articulos?: number | null
          total_lotes?: number | null
          periodo_inicio?: string | null
          periodo_fin?: string | null
          completado?: boolean
          solicitado_por_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      detalles_corte: {
        Row: {
          id: string
          corte_id: string
          articulo_id: string
          lote_id: string | null
          cantidad: number
          fecha_vencimiento: string | null
          ubicacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          corte_id: string
          articulo_id: string
          lote_id?: string | null
          cantidad: number
          fecha_vencimiento?: string | null
          ubicacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          corte_id?: string
          articulo_id?: string
          lote_id?: string | null
          cantidad?: number
          fecha_vencimiento?: string | null
          ubicacion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          usuario_id: string | null
          accion: string
          entidad: string
          entidad_id: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          ip: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          accion: string
          entidad: string
          entidad_id?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          ip?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string | null
          accion?: string
          entidad?: string
          entidad_id?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          ip?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispatch_peps: {
        Args: {
          p_articulo_id: string
          p_cantidad: number
          p_usuario_id: string
          p_receptor?: string | null
          p_documento?: string | null
          p_observaciones?: string | null
        }
        Returns: {
          lote_id: string
          cantidad_consumida: number
          costo_unitario: number
        }[]
      }
      receive_inventory: {
        Args: {
          p_articulo_id: string
          p_cantidad: number
          p_fecha_vencimiento: string
          p_costo_unitario: number
          p_usuario_id: string
          p_proveedor?: string | null
          p_numero_lote?: string | null
          p_documento?: string | null
        }
        Returns: string
      }
    }
    Enums: {
      rol_usuario: 'ADMINISTRADOR' | 'OPERADOR' | 'AUDITOR'
      tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
