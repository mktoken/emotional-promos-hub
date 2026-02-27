export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cotizaciones_leads: {
        Row: {
          articulos_cotizados: Json
          created_at: string | null
          datos_cliente: Json
          estado_cotizacion: string | null
          id: string
          total_estimado: number | null
          updated_at: string | null
        }
        Insert: {
          articulos_cotizados?: Json
          created_at?: string | null
          datos_cliente?: Json
          estado_cotizacion?: string | null
          id?: string
          total_estimado?: number | null
          updated_at?: string | null
        }
        Update: {
          articulos_cotizados?: Json
          created_at?: string | null
          datos_cliente?: Json
          estado_cotizacion?: string | null
          id?: string
          total_estimado?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      productos_b2b: {
        Row: {
          activo: boolean | null
          categoria_principal: string | null
          costeo: Json | null
          created_at: string | null
          datos_generales: Json | null
          datos_logistica_b2b: Json | null
          especificaciones_tecnicas: Json | null
          id: string
          id_interno: string
          imagenes: Json | null
          motor_de_personalizacion: Json | null
          proveedor_nombre: string
          sku_base: string | null
          updated_at: string | null
          variantes: Json | null
        }
        Insert: {
          activo?: boolean | null
          categoria_principal?: string | null
          costeo?: Json | null
          created_at?: string | null
          datos_generales?: Json | null
          datos_logistica_b2b?: Json | null
          especificaciones_tecnicas?: Json | null
          id?: string
          id_interno: string
          imagenes?: Json | null
          motor_de_personalizacion?: Json | null
          proveedor_nombre: string
          sku_base?: string | null
          updated_at?: string | null
          variantes?: Json | null
        }
        Update: {
          activo?: boolean | null
          categoria_principal?: string | null
          costeo?: Json | null
          created_at?: string | null
          datos_generales?: Json | null
          datos_logistica_b2b?: Json | null
          especificaciones_tecnicas?: Json | null
          id?: string
          id_interno?: string
          imagenes?: Json | null
          motor_de_personalizacion?: Json | null
          proveedor_nombre?: string
          sku_base?: string | null
          updated_at?: string | null
          variantes?: Json | null
        }
        Relationships: []
      }
      tabuladores_impresion: {
        Row: {
          activo: boolean | null
          costo_setup_fijo: number | null
          id: string
          tarifas_por_volumen: Json | null
          tecnica_nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          costo_setup_fijo?: number | null
          id?: string
          tarifas_por_volumen?: Json | null
          tecnica_nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          costo_setup_fijo?: number | null
          id?: string
          tarifas_por_volumen?: Json | null
          tecnica_nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
