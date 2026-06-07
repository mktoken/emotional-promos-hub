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
      crm_activities: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          outcome: Database["public"]["Enums"]["activity_outcome"] | null
          priority: Database["public"]["Enums"]["activity_priority"]
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          priority?: Database["public"]["Enums"]["activity_priority"]
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          priority?: Database["public"]["Enums"]["activity_priority"]
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      crm_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          objective: string | null
          owner_id: string | null
          start_date: string | null
          target_segment: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          objective?: string | null
          owner_id?: string | null
          start_date?: string | null
          target_segment?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          objective?: string | null
          owner_id?: string | null
          start_date?: string | null
          target_segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          role: Database["public"]["Enums"]["chat_message_role"]
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          role: Database["public"]["Enums"]["chat_message_role"]
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          role?: Database["public"]["Enums"]["chat_message_role"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "crm_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_chat_sessions: {
        Row: {
          assigned_to: string | null
          captured_data: Json
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          intent: string | null
          lead_id: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: string
          summary: string | null
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          captured_data?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          intent?: string | null
          lead_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: string
          summary?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          captured_data?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          intent?: string | null
          lead_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: string
          summary?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_chat_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_clients: {
        Row: {
          address: string | null
          assigned_to: string | null
          billing_email: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company_name: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_city: string | null
          delivery_state: string | null
          email: string | null
          id: string
          industry: string | null
          lead_source: Database["public"]["Enums"]["lead_source"] | null
          notes: string | null
          origin_lead_id: string | null
          phone: string | null
          rfc: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          billing_email?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          notes?: string | null
          origin_lead_id?: string | null
          phone?: string | null
          rfc?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          billing_email?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_city?: string | null
          delivery_state?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          lead_source?: Database["public"]["Enums"]["lead_source"] | null
          notes?: string | null
          origin_lead_id?: string | null
          phone?: string | null
          rfc?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_clients_origin_lead_id_fkey"
            columns: ["origin_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          notes: string | null
          phone: string | null
          position: string | null
          preferred_channel:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          position?: string | null
          preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          position?: string | null
          preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_products: {
        Row: {
          created_at: string
          created_by: string | null
          customization_method: Database["public"]["Enums"]["customization_method"]
          deal_id: string
          deleted_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          target_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customization_method?: Database["public"]["Enums"]["customization_method"]
          deal_id: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customization_method?: Database["public"]["Enums"]["customization_method"]
          deal_id?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          target_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "productos_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          assigned_to: string | null
          branding_goal: Database["public"]["Enums"]["branding_goal"] | null
          budget_range: Database["public"]["Enums"]["budget_range"] | null
          client_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_city: string | null
          delivery_deadline: string | null
          estimated_value: number | null
          event_date: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_at: string | null
          lost_reason: string | null
          probability: number
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          urgency_level: Database["public"]["Enums"]["urgency_level"]
          won_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          branding_goal?: Database["public"]["Enums"]["branding_goal"] | null
          budget_range?: Database["public"]["Enums"]["budget_range"] | null
          client_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_city?: string | null
          delivery_deadline?: string | null
          estimated_value?: number | null
          event_date?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          probability?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          urgency_level?: Database["public"]["Enums"]["urgency_level"]
          won_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          branding_goal?: Database["public"]["Enums"]["branding_goal"] | null
          budget_range?: Database["public"]["Enums"]["budget_range"] | null
          client_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_city?: string | null
          delivery_deadline?: string | null
          estimated_value?: number | null
          event_date?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          probability?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          urgency_level?: Database["public"]["Enums"]["urgency_level"]
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_import_batches: {
        Row: {
          assigned_to_default: string | null
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duplicate_rows: number
          errors: Json
          filename: string
          id: string
          inserted_rows: number
          invalid_rows: number
          mapping: Json
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["import_batch_status"]
          total_rows: number
        }
        Insert: {
          assigned_to_default?: string | null
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_rows?: number
          errors?: Json
          filename: string
          id?: string
          inserted_rows?: number
          invalid_rows?: number
          mapping?: Json
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["import_batch_status"]
          total_rows?: number
        }
        Update: {
          assigned_to_default?: string | null
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_rows?: number
          errors?: Json
          filename?: string
          id?: string
          inserted_rows?: number
          invalid_rows?: number
          mapping?: Json
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["import_batch_status"]
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_import_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          budget_range: Database["public"]["Enums"]["budget_range"] | null
          campaign_id: string | null
          city: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company_name: string
          contact_name: string | null
          converted_at: string | null
          converted_client_id: string | null
          converted_deal_id: string | null
          created_at: string
          created_by: string | null
          dedupe_hash: string | null
          deleted_at: string | null
          email: string | null
          event_date: string | null
          id: string
          import_batch_id: string | null
          industry: string | null
          last_contacted_at: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          product_interest: string | null
          source: Database["public"]["Enums"]["lead_source"]
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          web_lead_id: string | null
          whatsapp: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: Database["public"]["Enums"]["budget_range"] | null
          campaign_id?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name: string
          contact_name?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          converted_deal_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_hash?: string | null
          deleted_at?: string | null
          email?: string | null
          event_date?: string | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          product_interest?: string | null
          source: Database["public"]["Enums"]["lead_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          web_lead_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_range?: Database["public"]["Enums"]["budget_range"] | null
          campaign_id?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name?: string
          contact_name?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          converted_deal_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_hash?: string | null
          deleted_at?: string | null
          email?: string | null
          event_date?: string | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          product_interest?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          web_lead_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_converted_deal_id_fkey"
            columns: ["converted_deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_web_lead_id_fkey"
            columns: ["web_lead_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          id: string
          lead_id: string | null
          note: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          note: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      productos_publicos: {
        Row: {
          activo: boolean | null
          categoria_principal: string | null
          datos_generales: Json | null
          id: string | null
          id_interno: string | null
          imagenes: Json | null
          motor_de_personalizacion: Json | null
          precio_desde_mxn: number | null
          sku_base: string | null
          updated_at: string | null
          variantes: Json | null
        }
        Insert: {
          activo?: boolean | null
          categoria_principal?: string | null
          datos_generales?: Json | null
          id?: string | null
          id_interno?: string | null
          imagenes?: Json | null
          motor_de_personalizacion?: Json | null
          precio_desde_mxn?: never
          sku_base?: string | null
          updated_at?: string | null
          variantes?: Json | null
        }
        Update: {
          activo?: boolean | null
          categoria_principal?: string | null
          datos_generales?: Json | null
          id?: string | null
          id_interno?: string | null
          imagenes?: Json | null
          motor_de_personalizacion?: Json | null
          precio_desde_mxn?: never
          sku_base?: string | null
          updated_at?: string | null
          variantes?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_campaign: { Args: { _campaign_id: string }; Returns: boolean }
      can_access_chat_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      can_access_client: { Args: { _client_id: string }; Returns: boolean }
      can_access_deal: { Args: { _deal_id: string }; Returns: boolean }
      can_access_lead: { Args: { _lead_id: string }; Returns: boolean }
      crm_make_lead_dedupe_hash: {
        Args: {
          p_company: string
          p_email: string
          p_phone: string
          p_whatsapp: string
        }
        Returns: string
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _uid: string }
        Returns: boolean
      }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      activity_outcome:
        | "sin_respuesta"
        | "interesado"
        | "no_interesado"
        | "solicita_cotizacion"
        | "solicita_muestra"
        | "solicita_ajuste"
        | "aprobado"
        | "pospuesto"
        | "perdido"
        | "ganado"
        | "no_contesto"
        | "pidio_informacion"
        | "pidio_cotizacion"
        | "llamar_despues"
      activity_priority: "baja" | "media" | "alta" | "urgente"
      activity_type:
        | "llamada"
        | "whatsapp"
        | "email"
        | "reunion"
        | "seguimiento_cotizacion"
        | "envio_catalogo"
        | "envio_mockup"
        | "revision_arte"
        | "seguimiento_pago"
        | "seguimiento_produccion"
        | "seguimiento_entrega"
        | "recompra"
      app_role: "admin" | "sales_manager" | "sales_agent" | "viewer"
      branding_goal:
        | "reconocimiento_marca"
        | "fidelizacion_clientes"
        | "regalo_corporativo"
        | "evento_feria"
        | "campana_publicitaria"
        | "onboarding_colaboradores"
        | "lanzamiento_producto"
        | "comunicacion_interna"
      budget_range:
        | "menos_10000"
        | "10000_30000"
        | "30000_75000"
        | "75000_150000"
        | "mas_150000"
        | "por_definir"
      chat_message_role: "visitor" | "assistant" | "system" | "agent"
      client_status:
        | "prospecto"
        | "activo"
        | "inactivo"
        | "perdido"
        | "recompra_futura"
      client_type:
        | "corporativo"
        | "agencia_marketing"
        | "pyme"
        | "evento_feria"
        | "gobierno"
        | "educacion"
        | "cliente_recurrente"
        | "prospecto_frio"
      contact_channel: "whatsapp" | "llamada" | "email" | "reunion"
      customization_method:
        | "serigrafia"
        | "tampografia"
        | "sublimacion"
        | "grabado_laser"
        | "bordado"
        | "full_color"
        | "sin_personalizacion"
        | "por_definir"
      deal_stage:
        | "nuevo_lead"
        | "calificado"
        | "necesidades_detectadas"
        | "productos_sugeridos"
        | "cotizacion_enviada"
        | "seguimiento"
        | "mockup_solicitado"
        | "arte_en_aprobacion"
        | "negociacion"
        | "orden_compra_recibida"
        | "produccion"
        | "entrega"
        | "ganado"
        | "perdido"
        | "recompra_futura"
      import_batch_status:
        | "pendiente"
        | "procesando"
        | "completado"
        | "parcial"
        | "fallido"
      lead_source:
        | "cotizacion_web"
        | "whatsapp"
        | "formulario"
        | "google_ads"
        | "facebook"
        | "llamada_manual"
        | "csv_import"
        | "referido"
        | "evento"
        | "directorio"
        | "base_propia"
        | "chat_web"
        | "asistente_virtual"
      lead_status:
        | "nuevo"
        | "asignado"
        | "contactado"
        | "interesado"
        | "no_contesta"
        | "llamar_despues"
        | "no_interesado"
        | "convertido"
        | "descartado"
      urgency_level: "normal" | "urgente" | "express"
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
    Enums: {
      activity_outcome: [
        "sin_respuesta",
        "interesado",
        "no_interesado",
        "solicita_cotizacion",
        "solicita_muestra",
        "solicita_ajuste",
        "aprobado",
        "pospuesto",
        "perdido",
        "ganado",
        "no_contesto",
        "pidio_informacion",
        "pidio_cotizacion",
        "llamar_despues",
      ],
      activity_priority: ["baja", "media", "alta", "urgente"],
      activity_type: [
        "llamada",
        "whatsapp",
        "email",
        "reunion",
        "seguimiento_cotizacion",
        "envio_catalogo",
        "envio_mockup",
        "revision_arte",
        "seguimiento_pago",
        "seguimiento_produccion",
        "seguimiento_entrega",
        "recompra",
      ],
      app_role: ["admin", "sales_manager", "sales_agent", "viewer"],
      branding_goal: [
        "reconocimiento_marca",
        "fidelizacion_clientes",
        "regalo_corporativo",
        "evento_feria",
        "campana_publicitaria",
        "onboarding_colaboradores",
        "lanzamiento_producto",
        "comunicacion_interna",
      ],
      budget_range: [
        "menos_10000",
        "10000_30000",
        "30000_75000",
        "75000_150000",
        "mas_150000",
        "por_definir",
      ],
      chat_message_role: ["visitor", "assistant", "system", "agent"],
      client_status: [
        "prospecto",
        "activo",
        "inactivo",
        "perdido",
        "recompra_futura",
      ],
      client_type: [
        "corporativo",
        "agencia_marketing",
        "pyme",
        "evento_feria",
        "gobierno",
        "educacion",
        "cliente_recurrente",
        "prospecto_frio",
      ],
      contact_channel: ["whatsapp", "llamada", "email", "reunion"],
      customization_method: [
        "serigrafia",
        "tampografia",
        "sublimacion",
        "grabado_laser",
        "bordado",
        "full_color",
        "sin_personalizacion",
        "por_definir",
      ],
      deal_stage: [
        "nuevo_lead",
        "calificado",
        "necesidades_detectadas",
        "productos_sugeridos",
        "cotizacion_enviada",
        "seguimiento",
        "mockup_solicitado",
        "arte_en_aprobacion",
        "negociacion",
        "orden_compra_recibida",
        "produccion",
        "entrega",
        "ganado",
        "perdido",
        "recompra_futura",
      ],
      import_batch_status: [
        "pendiente",
        "procesando",
        "completado",
        "parcial",
        "fallido",
      ],
      lead_source: [
        "cotizacion_web",
        "whatsapp",
        "formulario",
        "google_ads",
        "facebook",
        "llamada_manual",
        "csv_import",
        "referido",
        "evento",
        "directorio",
        "base_propia",
        "chat_web",
        "asistente_virtual",
      ],
      lead_status: [
        "nuevo",
        "asignado",
        "contactado",
        "interesado",
        "no_contesta",
        "llamar_despues",
        "no_interesado",
        "convertido",
        "descartado",
      ],
      urgency_level: ["normal", "urgente", "express"],
    },
  },
} as const
