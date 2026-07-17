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
      catalog_price_cache: {
        Row: {
          calculated_at: string | null
          created_at: string
          currency: string
          id: string
          id_interno: string | null
          min_price_before_tax_mxn: number | null
          price_status: string
          pricing_rule_set_id: string | null
          pricing_warning: string | null
          producto_b2b_id: string | null
          provider_code: string | null
          source_oferta_id: string | null
          tax_included: boolean
          updated_at: string
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          id_interno?: string | null
          min_price_before_tax_mxn?: number | null
          price_status?: string
          pricing_rule_set_id?: string | null
          pricing_warning?: string | null
          producto_b2b_id?: string | null
          provider_code?: string | null
          source_oferta_id?: string | null
          tax_included?: boolean
          updated_at?: string
        }
        Update: {
          calculated_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          id_interno?: string | null
          min_price_before_tax_mxn?: number | null
          price_status?: string
          pricing_rule_set_id?: string | null
          pricing_warning?: string | null
          producto_b2b_id?: string | null
          provider_code?: string | null
          source_oferta_id?: string | null
          tax_included?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_price_cache_pricing_rule_set_id_fkey"
            columns: ["pricing_rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_price_cache_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_price_cache_source_oferta_id_fkey"
            columns: ["source_oferta_id"]
            isOneToOne: false
            referencedRelation: "producto_proveedor_ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      company_bank_accounts: {
        Row: {
          account_holder: string
          account_number: string | null
          bank_name: string
          branch: string | null
          clabe: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          is_default: boolean
          reference_instructions: string | null
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number?: string | null
          bank_name: string
          branch?: string | null
          clabe?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          reference_instructions?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string | null
          bank_name?: string
          branch?: string | null
          clabe?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          reference_instructions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          direccion: string | null
          email_general: string | null
          firma_default: string | null
          id: string
          is_default: boolean
          logo_url: string | null
          nombre_empresa: string | null
          telefono: string | null
          updated_at: string
          whatsapp_general: string | null
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email_general?: string | null
          firma_default?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          nombre_empresa?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp_general?: string | null
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email_general?: string | null
          firma_default?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          nombre_empresa?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp_general?: string | null
        }
        Relationships: []
      }
      cotizacion_lead_notes: {
        Row: {
          cotizacion_lead_id: string
          created_at: string
          id: string
          note: string
          user_id: string | null
        }
        Insert: {
          cotizacion_lead_id: string
          created_at?: string
          id?: string
          note: string
          user_id?: string | null
        }
        Update: {
          cotizacion_lead_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_lead_notes_cotizacion_lead_id_fkey"
            columns: ["cotizacion_lead_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_status_history: {
        Row: {
          changed_by: string | null
          cotizacion_lead_id: string
          created_at: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          cotizacion_lead_id: string
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          cotizacion_lead_id?: string
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_status_history_cotizacion_lead_id_fkey"
            columns: ["cotizacion_lead_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones_leads: {
        Row: {
          articulos_cotizados: Json
          assigned_to: string | null
          created_at: string | null
          datos_cliente: Json
          estado_cotizacion: string | null
          id: string
          last_contacted_at: string | null
          lost_reason: string | null
          total_estimado: number | null
          updated_at: string | null
        }
        Insert: {
          articulos_cotizados?: Json
          assigned_to?: string | null
          created_at?: string | null
          datos_cliente?: Json
          estado_cotizacion?: string | null
          id?: string
          last_contacted_at?: string | null
          lost_reason?: string | null
          total_estimado?: number | null
          updated_at?: string | null
        }
        Update: {
          articulos_cotizados?: Json
          assigned_to?: string | null
          created_at?: string | null
          datos_cliente?: Json
          estado_cotizacion?: string | null
          id?: string
          last_contacted_at?: string | null
          lost_reason?: string | null
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
      discount_rules: {
        Row: {
          active_from: string | null
          active_until: string | null
          applies_to: string
          created_at: string
          id: string
          is_active: boolean
          max_discount_percent: number | null
          min_margin_percent: number | null
          name: string
          notes: string | null
          requires_approval: boolean
          role_required: string | null
          rule_type: string
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          applies_to: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_discount_percent?: number | null
          min_margin_percent?: number | null
          name: string
          notes?: string | null
          requires_approval?: boolean
          role_required?: string | null
          rule_type: string
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          applies_to?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_discount_percent?: number | null
          min_margin_percent?: number | null
          name?: string
          notes?: string | null
          requires_approval?: boolean
          role_required?: string | null
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      formal_quote_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          formal_quote_id: string
          id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          formal_quote_id: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          formal_quote_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "formal_quote_events_formal_quote_id_fkey"
            columns: ["formal_quote_id"]
            isOneToOne: false
            referencedRelation: "formal_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_quote_files: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string
          formal_quote_id: string
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name: string
          formal_quote_id: string
          id?: string
          kind: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string
          formal_quote_id?: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "formal_quote_files_formal_quote_id_fkey"
            columns: ["formal_quote_id"]
            isOneToOne: false
            referencedRelation: "formal_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_quote_items: {
        Row: {
          cantidad: number
          clave_producto: string | null
          color: string | null
          created_at: string
          descripcion: string | null
          descuento_pct: number
          formal_quote_id: string
          id: string
          imagen_url: string | null
          is_kit_parent: boolean
          modelo_comercial: string
          notes: string | null
          notes_customer: string | null
          notes_internal: string | null
          parent_item_id: string | null
          personalizacion: Json
          position: number
          precio_unitario: number
          print_colors: number | null
          print_method: string | null
          print_status: string
          print_unit_price: number
          product_ref_id: string | null
          setup_fee: number
          source: string
          subtotal: number
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          clave_producto?: string | null
          color?: string | null
          created_at?: string
          descripcion?: string | null
          descuento_pct?: number
          formal_quote_id: string
          id?: string
          imagen_url?: string | null
          is_kit_parent?: boolean
          modelo_comercial: string
          notes?: string | null
          notes_customer?: string | null
          notes_internal?: string | null
          parent_item_id?: string | null
          personalizacion?: Json
          position?: number
          precio_unitario?: number
          print_colors?: number | null
          print_method?: string | null
          print_status?: string
          print_unit_price?: number
          product_ref_id?: string | null
          setup_fee?: number
          source?: string
          subtotal?: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          clave_producto?: string | null
          color?: string | null
          created_at?: string
          descripcion?: string | null
          descuento_pct?: number
          formal_quote_id?: string
          id?: string
          imagen_url?: string | null
          is_kit_parent?: boolean
          modelo_comercial?: string
          notes?: string | null
          notes_customer?: string | null
          notes_internal?: string | null
          parent_item_id?: string | null
          personalizacion?: Json
          position?: number
          precio_unitario?: number
          print_colors?: number | null
          print_method?: string | null
          print_status?: string
          print_unit_price?: number
          product_ref_id?: string | null
          setup_fee?: number
          source?: string
          subtotal?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formal_quote_items_formal_quote_id_fkey"
            columns: ["formal_quote_id"]
            isOneToOne: false
            referencedRelation: "formal_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_quote_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "formal_quote_items"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_quote_print_job_components: {
        Row: {
          amount_mxn: number
          applies: boolean
          component_type: string
          condition_note: string | null
          created_at: string
          description: string | null
          id: string
          include_in_customer_price: boolean
          is_conditional: boolean
          is_manual: boolean
          is_visible_to_client: boolean
          label: string
          print_job_id: string
          quantity: number | null
          sort_order: number
          unit_cost_mxn: number | null
          updated_at: string
        }
        Insert: {
          amount_mxn?: number
          applies?: boolean
          component_type: string
          condition_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          include_in_customer_price?: boolean
          is_conditional?: boolean
          is_manual?: boolean
          is_visible_to_client?: boolean
          label: string
          print_job_id: string
          quantity?: number | null
          sort_order?: number
          unit_cost_mxn?: number | null
          updated_at?: string
        }
        Update: {
          amount_mxn?: number
          applies?: boolean
          component_type?: string
          condition_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          include_in_customer_price?: boolean
          is_conditional?: boolean
          is_manual?: boolean
          is_visible_to_client?: boolean
          label?: string
          print_job_id?: string
          quantity?: number | null
          sort_order?: number
          unit_cost_mxn?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formal_quote_print_job_components_print_job_id_fkey"
            columns: ["print_job_id"]
            isOneToOne: false
            referencedRelation: "formal_quote_print_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_quote_print_job_items: {
        Row: {
          allocation_amount_mxn: number | null
          allocation_mode: string
          formal_quote_item_id: string
          id: string
          print_job_id: string
          quantity: number
        }
        Insert: {
          allocation_amount_mxn?: number | null
          allocation_mode?: string
          formal_quote_item_id: string
          id?: string
          print_job_id: string
          quantity: number
        }
        Update: {
          allocation_amount_mxn?: number | null
          allocation_mode?: string
          formal_quote_item_id?: string
          id?: string
          print_job_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "formal_quote_print_job_items_formal_quote_item_id_fkey"
            columns: ["formal_quote_item_id"]
            isOneToOne: false
            referencedRelation: "formal_quote_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_quote_print_job_items_print_job_id_fkey"
            columns: ["print_job_id"]
            isOneToOne: false
            referencedRelation: "formal_quote_print_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_quote_print_jobs: {
        Row: {
          calculation_snapshot: Json
          created_at: string
          customer_print_price_mxn: number | null
          customer_unit_price_mxn: number | null
          formal_quote_id: string
          id: string
          internal_print_cost_mxn: number | null
          job_label: string
          logistics_fee_default_mxn: number
          logistics_fee_mxn: number
          logistics_override_reason: string | null
          override_reason: string | null
          position: number
          pricing_status: string
          print_colors: number | null
          print_method_id: string | null
          print_method_name_snapshot: string | null
          print_positions: number | null
          updated_at: string
        }
        Insert: {
          calculation_snapshot?: Json
          created_at?: string
          customer_print_price_mxn?: number | null
          customer_unit_price_mxn?: number | null
          formal_quote_id: string
          id?: string
          internal_print_cost_mxn?: number | null
          job_label?: string
          logistics_fee_default_mxn?: number
          logistics_fee_mxn?: number
          logistics_override_reason?: string | null
          override_reason?: string | null
          position?: number
          pricing_status?: string
          print_colors?: number | null
          print_method_id?: string | null
          print_method_name_snapshot?: string | null
          print_positions?: number | null
          updated_at?: string
        }
        Update: {
          calculation_snapshot?: Json
          created_at?: string
          customer_print_price_mxn?: number | null
          customer_unit_price_mxn?: number | null
          formal_quote_id?: string
          id?: string
          internal_print_cost_mxn?: number | null
          job_label?: string
          logistics_fee_default_mxn?: number
          logistics_fee_mxn?: number
          logistics_override_reason?: string | null
          override_reason?: string | null
          position?: number
          pricing_status?: string
          print_colors?: number | null
          print_method_id?: string | null
          print_method_name_snapshot?: string | null
          print_positions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formal_quote_print_jobs_formal_quote_id_fkey"
            columns: ["formal_quote_id"]
            isOneToOne: false
            referencedRelation: "formal_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_quote_print_jobs_print_method_id_fkey"
            columns: ["print_method_id"]
            isOneToOne: false
            referencedRelation: "print_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_quotes: {
        Row: {
          accepted_at: string | null
          advisor_snapshot: Json | null
          assigned_to: string | null
          bank_account_snapshot: Json | null
          cliente: Json
          company_snapshot: Json | null
          condiciones_entrega: string | null
          condiciones_pago: string | null
          cotizacion_lead_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          folio: string
          id: string
          issued_at: string | null
          logistics_fee_mxn: number | null
          logistics_job_count: number | null
          notas_internas: string | null
          notas_publicas: string | null
          price_override_mxn: number | null
          price_override_reason: string | null
          print_engine_snapshot: Json | null
          rejected_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          valid_until: string
        }
        Insert: {
          accepted_at?: string | null
          advisor_snapshot?: Json | null
          assigned_to?: string | null
          bank_account_snapshot?: Json | null
          cliente?: Json
          company_snapshot?: Json | null
          condiciones_entrega?: string | null
          condiciones_pago?: string | null
          cotizacion_lead_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          folio?: string
          id?: string
          issued_at?: string | null
          logistics_fee_mxn?: number | null
          logistics_job_count?: number | null
          notas_internas?: string | null
          notas_publicas?: string | null
          price_override_mxn?: number | null
          price_override_reason?: string | null
          print_engine_snapshot?: Json | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string
        }
        Update: {
          accepted_at?: string | null
          advisor_snapshot?: Json | null
          assigned_to?: string | null
          bank_account_snapshot?: Json | null
          cliente?: Json
          company_snapshot?: Json | null
          condiciones_entrega?: string | null
          condiciones_pago?: string | null
          cotizacion_lead_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          folio?: string
          id?: string
          issued_at?: string | null
          logistics_fee_mxn?: number | null
          logistics_job_count?: number | null
          notas_internas?: string | null
          notas_publicas?: string | null
          price_override_mxn?: number | null
          price_override_reason?: string | null
          print_engine_snapshot?: Json | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "formal_quotes_cotizacion_lead_id_fkey"
            columns: ["cotizacion_lead_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      margin_tiers: {
        Row: {
          applies_to: string
          created_at: string
          id: string
          level_number: number
          multiplier: number
          notes: string | null
          provider_code: string | null
          rule_set_id: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          id?: string
          level_number: number
          multiplier: number
          notes?: string | null
          provider_code?: string | null
          rule_set_id: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          id?: string
          level_number?: number
          multiplier?: number
          notes?: string | null
          provider_code?: string | null
          rule_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "margin_tiers_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_term_rules: {
        Row: {
          condition_type: string
          created_at: string
          deposit_percent: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_due_stage: string
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          condition_type: string
          created_at?: string
          deposit_percent: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_due_stage?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          condition_type?: string
          created_at?: string
          deposit_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_due_stage?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rule_sets: {
        Row: {
          active_from: string
          active_until: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      print_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          material_keywords: string[] | null
          name: string
          product_keywords: string[] | null
          technique_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          material_keywords?: string[] | null
          name: string
          product_keywords?: string[] | null
          technique_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          material_keywords?: string[] | null
          name?: string
          product_keywords?: string[] | null
          technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_categories_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "print_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      print_extra_charges: {
        Row: {
          amount: number
          applies_by_default: boolean
          category_id: string | null
          charge_unit: string
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          requires_manual_review: boolean
          trigger_condition: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          applies_by_default?: boolean
          category_id?: string | null
          charge_unit: string
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          requires_manual_review?: boolean
          trigger_condition?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          applies_by_default?: boolean
          category_id?: string | null
          charge_unit?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          requires_manual_review?: boolean
          trigger_condition?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_extra_charges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "print_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      print_import_batches: {
        Row: {
          created_at: string
          id: string
          imported_by: string | null
          notes: string | null
          provider_code: string | null
          source_file: string | null
          source_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_by?: string | null
          notes?: string | null
          provider_code?: string | null
          source_file?: string | null
          source_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_by?: string | null
          notes?: string | null
          provider_code?: string | null
          source_file?: string | null
          source_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_import_raw_rules: {
        Row: {
          additional_color_fixed_cost: number | null
          additional_color_unit_cost: number | null
          batch_id: string
          colors_max: number | null
          colors_min: number | null
          compatibility_status: string | null
          cost_model: string | null
          created_at: string
          extra_fixed_cost: number | null
          extra_unit_cost: number | null
          first_color_fixed_cost: number | null
          first_color_unit_cost: number | null
          fixed_cost: number | null
          id: string
          material: string | null
          max_qty: number | null
          method_code: string | null
          method_name: string | null
          min_qty: number | null
          minimum_billable_qty: number | null
          minimum_charge: number | null
          mold_cost: number | null
          negative_positive_cost: number | null
          negative_positive_cost_scope: string | null
          normalization_status: string
          notes_internal: string | null
          plate_cost: number | null
          plate_cost_scope: string | null
          positions_max: number | null
          positions_min: number | null
          print_area_max_cm2: number | null
          print_area_min_cm2: number | null
          product_category: string | null
          provider_code: string | null
          repack_unit_cost: number | null
          requires_manual_validation: boolean | null
          requires_negative_positive: boolean | null
          requires_plate: boolean | null
          requires_repack: boolean | null
          requires_setup: boolean | null
          setup_cost: number | null
          setup_cost_scope: string | null
          shape_type: string | null
          source_row: string | null
          source_section: string | null
          unit_cost: number | null
          validation_notes: string | null
        }
        Insert: {
          additional_color_fixed_cost?: number | null
          additional_color_unit_cost?: number | null
          batch_id: string
          colors_max?: number | null
          colors_min?: number | null
          compatibility_status?: string | null
          cost_model?: string | null
          created_at?: string
          extra_fixed_cost?: number | null
          extra_unit_cost?: number | null
          first_color_fixed_cost?: number | null
          first_color_unit_cost?: number | null
          fixed_cost?: number | null
          id?: string
          material?: string | null
          max_qty?: number | null
          method_code?: string | null
          method_name?: string | null
          min_qty?: number | null
          minimum_billable_qty?: number | null
          minimum_charge?: number | null
          mold_cost?: number | null
          negative_positive_cost?: number | null
          negative_positive_cost_scope?: string | null
          normalization_status?: string
          notes_internal?: string | null
          plate_cost?: number | null
          plate_cost_scope?: string | null
          positions_max?: number | null
          positions_min?: number | null
          print_area_max_cm2?: number | null
          print_area_min_cm2?: number | null
          product_category?: string | null
          provider_code?: string | null
          repack_unit_cost?: number | null
          requires_manual_validation?: boolean | null
          requires_negative_positive?: boolean | null
          requires_plate?: boolean | null
          requires_repack?: boolean | null
          requires_setup?: boolean | null
          setup_cost?: number | null
          setup_cost_scope?: string | null
          shape_type?: string | null
          source_row?: string | null
          source_section?: string | null
          unit_cost?: number | null
          validation_notes?: string | null
        }
        Update: {
          additional_color_fixed_cost?: number | null
          additional_color_unit_cost?: number | null
          batch_id?: string
          colors_max?: number | null
          colors_min?: number | null
          compatibility_status?: string | null
          cost_model?: string | null
          created_at?: string
          extra_fixed_cost?: number | null
          extra_unit_cost?: number | null
          first_color_fixed_cost?: number | null
          first_color_unit_cost?: number | null
          fixed_cost?: number | null
          id?: string
          material?: string | null
          max_qty?: number | null
          method_code?: string | null
          method_name?: string | null
          min_qty?: number | null
          minimum_billable_qty?: number | null
          minimum_charge?: number | null
          mold_cost?: number | null
          negative_positive_cost?: number | null
          negative_positive_cost_scope?: string | null
          normalization_status?: string
          notes_internal?: string | null
          plate_cost?: number | null
          plate_cost_scope?: string | null
          positions_max?: number | null
          positions_min?: number | null
          print_area_max_cm2?: number | null
          print_area_min_cm2?: number | null
          product_category?: string | null
          provider_code?: string | null
          repack_unit_cost?: number | null
          requires_manual_validation?: boolean | null
          requires_negative_positive?: boolean | null
          requires_plate?: boolean | null
          requires_repack?: boolean | null
          requires_setup?: boolean | null
          setup_cost?: number | null
          setup_cost_scope?: string | null
          shape_type?: string | null
          source_row?: string | null
          source_section?: string | null
          unit_cost?: number | null
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_import_raw_rules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "print_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      print_methods: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      print_operational_rules: {
        Row: {
          change_ink_same_logo_cost: number | null
          created_at: string
          id: string
          manual_review_threshold: Json
          normal_lead_time_days: number | null
          notes: string | null
          price_book_id: string | null
          rush_lead_time_days: number | null
          rush_multiplier: number | null
          sample_cost: number | null
          sample_required: boolean
          technique_id: string | null
          updated_at: string
        }
        Insert: {
          change_ink_same_logo_cost?: number | null
          created_at?: string
          id?: string
          manual_review_threshold?: Json
          normal_lead_time_days?: number | null
          notes?: string | null
          price_book_id?: string | null
          rush_lead_time_days?: number | null
          rush_multiplier?: number | null
          sample_cost?: number | null
          sample_required?: boolean
          technique_id?: string | null
          updated_at?: string
        }
        Update: {
          change_ink_same_logo_cost?: number | null
          created_at?: string
          id?: string
          manual_review_threshold?: Json
          normal_lead_time_days?: number | null
          notes?: string | null
          price_book_id?: string | null
          rush_lead_time_days?: number | null
          rush_multiplier?: number | null
          sample_cost?: number | null
          sample_required?: boolean
          technique_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_operational_rules_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "print_price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_operational_rules_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "print_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      print_price_books: {
        Row: {
          active_from: string
          active_until: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          supplier_name: string | null
          updated_at: string
          version: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          supplier_name?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          supplier_name?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      print_pricing_rules: {
        Row: {
          active: boolean
          additional_color_fixed_cost: number
          additional_color_unit_cost: number | null
          colors_max: number | null
          colors_min: number
          cost_model: string
          created_at: string
          currency: string
          extra_fixed_cost: number
          extra_unit_cost: number
          first_color_fixed_cost: number
          first_color_unit_cost: number | null
          fixed_cost: number
          id: string
          includes_negative_positive: boolean
          includes_plate: boolean
          includes_setup: boolean
          material: string | null
          max_qty: number | null
          min_qty: number
          minimum_billable_qty: number | null
          minimum_charge: number
          mold_cost: number
          negative_positive_cost: number
          negative_positive_cost_scope: string
          notes_internal: string | null
          plate_cost: number
          plate_cost_scope: string
          positions_max: number | null
          positions_min: number
          print_method_id: string
          product_category: string | null
          provider_id: string
          repack_unit_cost: number
          rule_name: string | null
          setup_cost: number
          setup_cost_scope: string
          source_name: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          additional_color_fixed_cost?: number
          additional_color_unit_cost?: number | null
          colors_max?: number | null
          colors_min?: number
          cost_model?: string
          created_at?: string
          currency?: string
          extra_fixed_cost?: number
          extra_unit_cost?: number
          first_color_fixed_cost?: number
          first_color_unit_cost?: number | null
          fixed_cost?: number
          id?: string
          includes_negative_positive?: boolean
          includes_plate?: boolean
          includes_setup?: boolean
          material?: string | null
          max_qty?: number | null
          min_qty?: number
          minimum_billable_qty?: number | null
          minimum_charge?: number
          mold_cost?: number
          negative_positive_cost?: number
          negative_positive_cost_scope?: string
          notes_internal?: string | null
          plate_cost?: number
          plate_cost_scope?: string
          positions_max?: number | null
          positions_min?: number
          print_method_id: string
          product_category?: string | null
          provider_id: string
          repack_unit_cost?: number
          rule_name?: string | null
          setup_cost?: number
          setup_cost_scope?: string
          source_name?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          additional_color_fixed_cost?: number
          additional_color_unit_cost?: number | null
          colors_max?: number | null
          colors_min?: number
          cost_model?: string
          created_at?: string
          currency?: string
          extra_fixed_cost?: number
          extra_unit_cost?: number
          first_color_fixed_cost?: number
          first_color_unit_cost?: number | null
          fixed_cost?: number
          id?: string
          includes_negative_positive?: boolean
          includes_plate?: boolean
          includes_setup?: boolean
          material?: string | null
          max_qty?: number | null
          min_qty?: number
          minimum_billable_qty?: number | null
          minimum_charge?: number
          mold_cost?: number
          negative_positive_cost?: number
          negative_positive_cost_scope?: string
          notes_internal?: string | null
          plate_cost?: number
          plate_cost_scope?: string
          positions_max?: number | null
          positions_min?: number
          print_method_id?: string
          product_category?: string | null
          provider_id?: string
          repack_unit_cost?: number
          rule_name?: string | null
          setup_cost?: number
          setup_cost_scope?: string
          source_name?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_pricing_rules_print_method_id_fkey"
            columns: ["print_method_id"]
            isOneToOne: false
            referencedRelation: "print_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_pricing_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "print_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      print_product_compatibility_rules: {
        Row: {
          active: boolean
          colors_max: number | null
          compatibility_status: string
          created_at: string
          extra_fixed_cost: number
          extra_unit_cost: number
          id: string
          material: string | null
          notes_internal: string | null
          positions_max: number | null
          print_area_max_cm2: number | null
          print_area_min_cm2: number | null
          print_method_id: string
          product_category: string | null
          requires_manual_validation: boolean
          requires_negative_positive: boolean
          requires_plate: boolean
          requires_repack: boolean
          requires_setup: boolean
          shape_type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          colors_max?: number | null
          compatibility_status?: string
          created_at?: string
          extra_fixed_cost?: number
          extra_unit_cost?: number
          id?: string
          material?: string | null
          notes_internal?: string | null
          positions_max?: number | null
          print_area_max_cm2?: number | null
          print_area_min_cm2?: number | null
          print_method_id: string
          product_category?: string | null
          requires_manual_validation?: boolean
          requires_negative_positive?: boolean
          requires_plate?: boolean
          requires_repack?: boolean
          requires_setup?: boolean
          shape_type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          colors_max?: number | null
          compatibility_status?: string
          created_at?: string
          extra_fixed_cost?: number
          extra_unit_cost?: number
          id?: string
          material?: string | null
          notes_internal?: string | null
          positions_max?: number | null
          print_area_max_cm2?: number | null
          print_area_min_cm2?: number | null
          print_method_id?: string
          product_category?: string | null
          requires_manual_validation?: boolean
          requires_negative_positive?: boolean
          requires_plate?: boolean
          requires_repack?: boolean
          requires_setup?: boolean
          shape_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_product_compatibility_rules_print_method_id_fkey"
            columns: ["print_method_id"]
            isOneToOne: false
            referencedRelation: "print_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      print_providers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      print_required_inputs: {
        Row: {
          created_at: string
          id: string
          input_key: string
          input_type: string
          is_required: boolean
          label: string
          technique_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_key: string
          input_type: string
          is_required?: boolean
          label: string
          technique_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_key?: string
          input_type?: string
          is_required?: boolean
          label?: string
          technique_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_required_inputs_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "print_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      print_settings: {
        Row: {
          created_at: string
          default_logistics_fee_mxn: number
          default_logistics_job_count: number
          default_margin_pct: number
          default_sample_fee_mxn: number
          default_urgency_pct: number
          id: string
          minimum_profit_mxn: number
          notes: string | null
          operational_buffer_pct: number
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          default_logistics_fee_mxn?: number
          default_logistics_job_count?: number
          default_margin_pct?: number
          default_sample_fee_mxn?: number
          default_urgency_pct?: number
          id?: string
          minimum_profit_mxn?: number
          notes?: string | null
          operational_buffer_pct?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          default_logistics_fee_mxn?: number
          default_logistics_job_count?: number
          default_margin_pct?: number
          default_sample_fee_mxn?: number
          default_urgency_pct?: number
          id?: string
          minimum_profit_mxn?: number
          notes?: string | null
          operational_buffer_pct?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      print_setup_charges: {
        Row: {
          amount: number
          applies_by_default: boolean
          category_id: string | null
          charge_unit: string
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          requires_manual_review: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          applies_by_default?: boolean
          category_id?: string | null
          charge_unit: string
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          requires_manual_review?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          applies_by_default?: boolean
          category_id?: string | null
          charge_unit?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          requires_manual_review?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_setup_charges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "print_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      print_tariff_ranges: {
        Row: {
          additional_ink_mode: string
          additional_ink_price: number | null
          calculation_model: string
          category_id: string | null
          created_at: string
          first_ink_price: number | null
          id: string
          max_qty: number | null
          min_qty: number
          min_service_price: number | null
          notes: string | null
          requires_manual_review: boolean
          unit_price: number | null
          updated_at: string
          urgency_multiplier: number | null
        }
        Insert: {
          additional_ink_mode?: string
          additional_ink_price?: number | null
          calculation_model?: string
          category_id?: string | null
          created_at?: string
          first_ink_price?: number | null
          id?: string
          max_qty?: number | null
          min_qty: number
          min_service_price?: number | null
          notes?: string | null
          requires_manual_review?: boolean
          unit_price?: number | null
          updated_at?: string
          urgency_multiplier?: number | null
        }
        Update: {
          additional_ink_mode?: string
          additional_ink_price?: number | null
          calculation_model?: string
          category_id?: string | null
          created_at?: string
          first_ink_price?: number | null
          id?: string
          max_qty?: number | null
          min_qty?: number
          min_service_price?: number | null
          notes?: string | null
          requires_manual_review?: boolean
          unit_price?: number | null
          updated_at?: string
          urgency_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "print_tariff_ranges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "print_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      print_techniques: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          price_book_id: string | null
          pricing_mode: string
          requires_manual_review: boolean
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          price_book_id?: string | null
          pricing_mode?: string
          requires_manual_review?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          price_book_id?: string | null
          pricing_mode?: string
          requires_manual_review?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_techniques_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "print_price_books"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_category_aliases: {
        Row: {
          category_id: string
          confidence: number
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          provider_code: string
          source_category: string
          source_subcategory: string
          updated_at: string
        }
        Insert: {
          category_id: string
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          provider_code?: string
          source_category: string
          source_subcategory?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          provider_code?: string
          source_category?: string
          source_subcategory?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_aliases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_assignments: {
        Row: {
          category_id: string
          confidence: number
          created_at: string
          id: string
          notes: string | null
          producto_b2b_id: string
          source: string
          updated_at: string
        }
        Insert: {
          category_id: string
          confidence?: number
          created_at?: string
          id?: string
          notes?: string | null
          producto_b2b_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          confidence?: number
          created_at?: string
          id?: string
          notes?: string | null
          producto_b2b_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_assignments_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: true
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_review_queue: {
        Row: {
          created_at: string
          current_category: string | null
          current_subcategory: string | null
          id: string
          producto_b2b_id: string
          reason: string
          reviewer_notes: string | null
          status: string
          suggested_category_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_category?: string | null
          current_subcategory?: string | null
          id?: string
          producto_b2b_id: string
          reason: string
          reviewer_notes?: string | null
          status?: string
          suggested_category_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_category?: string | null
          current_subcategory?: string | null
          id?: string
          producto_b2b_id?: string
          reason?: string
          reviewer_notes?: string | null
          status?: string
          suggested_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_review_queue_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_review_queue_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collection_assignments: {
        Row: {
          collection_id: string
          confidence: number
          created_at: string
          id: string
          notes: string | null
          producto_b2b_id: string
          source: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          confidence?: number
          created_at?: string
          id?: string
          notes?: string | null
          producto_b2b_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          confidence?: number
          created_at?: string
          id?: string
          notes?: string | null
          producto_b2b_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collection_assignments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "product_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collection_assignments_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_personalization_capabilities: {
        Row: {
          active: boolean
          can_engrave: boolean
          can_full_color: boolean
          can_personalize: boolean
          can_print_1_ink: boolean
          can_print_2_ink: boolean
          can_print_3_plus_ink: boolean
          clave_producto: string | null
          compatibility_rules: Json
          created_at: string
          economy_recommendation: string
          id: string
          internal_note: string | null
          max_recommended_inks: number
          producto_b2b_id: string
          public_note: string | null
          requires_manual_review: boolean
          restriction_note: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          can_engrave?: boolean
          can_full_color?: boolean
          can_personalize?: boolean
          can_print_1_ink?: boolean
          can_print_2_ink?: boolean
          can_print_3_plus_ink?: boolean
          clave_producto?: string | null
          compatibility_rules?: Json
          created_at?: string
          economy_recommendation?: string
          id?: string
          internal_note?: string | null
          max_recommended_inks?: number
          producto_b2b_id: string
          public_note?: string | null
          requires_manual_review?: boolean
          restriction_note?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          can_engrave?: boolean
          can_full_color?: boolean
          can_personalize?: boolean
          can_print_1_ink?: boolean
          can_print_2_ink?: boolean
          can_print_3_plus_ink?: boolean
          clave_producto?: string | null
          compatibility_rules?: Json
          created_at?: string
          economy_recommendation?: string
          id?: string
          internal_note?: string | null
          max_recommended_inks?: number
          producto_b2b_id?: string
          public_note?: string | null
          requires_manual_review?: boolean
          restriction_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_personalization_capabilities_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: true
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
        ]
      }
      product_print_profiles: {
        Row: {
          active: boolean
          blocked_method_codes: string[]
          created_at: string
          default_positions: number
          id: string
          material_normalized: string | null
          notes_internal: string | null
          print_area_cm2: number | null
          print_area_height_cm: number | null
          print_area_width_cm: number | null
          product_category_normalized: string | null
          product_key: string | null
          product_name: string | null
          producto_b2b_id: string | null
          producto_publico_id: string | null
          recommended_method_codes: string[]
          requires_manual_validation: boolean
          shape_type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          blocked_method_codes?: string[]
          created_at?: string
          default_positions?: number
          id?: string
          material_normalized?: string | null
          notes_internal?: string | null
          print_area_cm2?: number | null
          print_area_height_cm?: number | null
          print_area_width_cm?: number | null
          product_category_normalized?: string | null
          product_key?: string | null
          product_name?: string | null
          producto_b2b_id?: string | null
          producto_publico_id?: string | null
          recommended_method_codes?: string[]
          requires_manual_validation?: boolean
          shape_type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          blocked_method_codes?: string[]
          created_at?: string
          default_positions?: number
          id?: string
          material_normalized?: string | null
          notes_internal?: string | null
          print_area_cm2?: number | null
          print_area_height_cm?: number | null
          print_area_width_cm?: number | null
          product_category_normalized?: string | null
          product_key?: string | null
          product_name?: string | null
          producto_b2b_id?: string | null
          producto_publico_id?: string | null
          recommended_method_codes?: string[]
          requires_manual_validation?: boolean
          shape_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      producto_b2b_oferta_map: {
        Row: {
          created_at: string
          id: string
          id_interno: string | null
          is_primary: boolean
          match_reason: string | null
          match_score: number | null
          oferta_id: string
          producto_b2b_id: string | null
          proveedor_id: string | null
          provider_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_interno?: string | null
          is_primary?: boolean
          match_reason?: string | null
          match_score?: number | null
          oferta_id: string
          producto_b2b_id?: string | null
          proveedor_id?: string | null
          provider_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_interno?: string | null
          is_primary?: boolean
          match_reason?: string | null
          match_score?: number | null
          oferta_id?: string
          producto_b2b_id?: string | null
          proveedor_id?: string | null
          provider_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_b2b_oferta_map_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: true
            referencedRelation: "producto_proveedor_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_b2b_oferta_map_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_b2b_oferta_map_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_b2b_status: {
        Row: {
          created_at: string
          id: string
          id_interno: string | null
          image_available: boolean
          kit_eligible: boolean
          last_stock_sync_at: string | null
          price_valid: boolean
          producto_b2b_id: string | null
          public_visible: boolean
          quote_mode: string
          stock_qty: number | null
          stock_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_interno?: string | null
          image_available?: boolean
          kit_eligible?: boolean
          last_stock_sync_at?: string | null
          price_valid?: boolean
          producto_b2b_id?: string | null
          public_visible?: boolean
          quote_mode?: string
          stock_qty?: number | null
          stock_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_interno?: string | null
          image_available?: boolean
          kit_eligible?: boolean
          last_stock_sync_at?: string | null
          price_valid?: boolean
          producto_b2b_id?: string | null
          public_visible?: boolean
          quote_mode?: string
          stock_qty?: number | null
          stock_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_b2b_status_producto_b2b_id_fkey"
            columns: ["producto_b2b_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_precio_escalas: {
        Row: {
          created_at: string
          currency: string
          id: string
          max_qty: number | null
          min_qty: number
          oferta_id: string
          proveedor_id: string
          source_field: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          oferta_id: string
          proveedor_id: string
          source_field?: string | null
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          oferta_id?: string
          proveedor_id?: string
          source_field?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_precio_escalas_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "producto_proveedor_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_precio_escalas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_proveedor_ofertas: {
        Row: {
          activo: boolean
          atributos: Json
          color_code: string
          color_nombre: string | null
          created_at: string
          id: string
          imagen_url: string | null
          material: string | null
          modelo: string | null
          proveedor_id: string
          provider_raw_product_id: string
          talla: string
          updated_at: string
          variant_sku: string
        }
        Insert: {
          activo?: boolean
          atributos?: Json
          color_code?: string
          color_nombre?: string | null
          created_at?: string
          id?: string
          imagen_url?: string | null
          material?: string | null
          modelo?: string | null
          proveedor_id: string
          provider_raw_product_id: string
          talla?: string
          updated_at?: string
          variant_sku?: string
        }
        Update: {
          activo?: boolean
          atributos?: Json
          color_code?: string
          color_nombre?: string | null
          created_at?: string
          id?: string
          imagen_url?: string | null
          material?: string | null
          modelo?: string | null
          proveedor_id?: string
          provider_raw_product_id?: string
          talla?: string
          updated_at?: string
          variant_sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_proveedor_ofertas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_proveedor_ofertas_provider_raw_product_id_fkey"
            columns: ["provider_raw_product_id"]
            isOneToOne: false
            referencedRelation: "provider_raw_products"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_proveedor_stock: {
        Row: {
          cantidad: number
          disponibilidad: string
          id: string
          oferta_id: string
          proveedor_id: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          disponibilidad?: string
          id?: string
          oferta_id: string
          proveedor_id: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          disponibilidad?: string
          id?: string
          oferta_id?: string
          proveedor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_proveedor_stock_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: true
            referencedRelation: "producto_proveedor_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_proveedor_stock_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
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
          cargo: string | null
          created_at: string
          email_comercial: string | null
          firma: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email_comercial?: string | null
          firma?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email_comercial?: string | null
          firma?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      proposal_email_events: {
        Row: {
          cotizacion_lead_id: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
        }
        Insert: {
          cotizacion_lead_id?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status: string
        }
        Update: {
          cotizacion_lead_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_email_events_cotizacion_lead_id_fkey"
            columns: ["cotizacion_lead_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          code: string
          config: Json
          created_at: string
          id: string
          last_sync_at: string | null
          markup_pct: number
          moneda: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          code: string
          config?: Json
          created_at?: string
          id?: string
          last_sync_at?: string | null
          markup_pct?: number
          moneda?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          code?: string
          config?: Json
          created_at?: string
          id?: string
          last_sync_at?: string | null
          markup_pct?: number
          moneda?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_import_batches: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          items_failed: number
          items_received: number
          items_upserted: number
          mode: string
          proveedor_id: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_failed?: number
          items_received?: number
          items_upserted?: number
          mode?: string
          proveedor_id: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_failed?: number
          items_received?: number
          items_upserted?: number
          mode?: string
          proveedor_id?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_import_batches_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_pricing_rules: {
        Row: {
          base_cost_strategy: string
          cost_factor: number
          created_at: string
          fallback_strategy: string
          id: string
          notes: string | null
          provider_code: string
          provider_tier_number: number | null
          requires_manual_review_on_fallback: boolean
          rule_set_id: string
          updated_at: string
        }
        Insert: {
          base_cost_strategy: string
          cost_factor?: number
          created_at?: string
          fallback_strategy?: string
          id?: string
          notes?: string | null
          provider_code: string
          provider_tier_number?: number | null
          requires_manual_review_on_fallback?: boolean
          rule_set_id: string
          updated_at?: string
        }
        Update: {
          base_cost_strategy?: string
          cost_factor?: number
          created_at?: string
          fallback_strategy?: string
          id?: string
          notes?: string | null
          provider_code?: string
          provider_tier_number?: number | null
          requires_manual_review_on_fallback?: boolean
          rule_set_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_pricing_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_raw_products: {
        Row: {
          activo: boolean
          batch_id: string | null
          categoria: string | null
          created_at: string
          descripcion: string | null
          id: string
          last_seen_at: string
          nombre: string | null
          productos_b2b_id: string | null
          proveedor_id: string
          provider_sku: string
          raw_payload: Json
          subcategoria: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          batch_id?: string | null
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          last_seen_at?: string
          nombre?: string | null
          productos_b2b_id?: string | null
          proveedor_id: string
          provider_sku: string
          raw_payload: Json
          subcategoria?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          batch_id?: string | null
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          last_seen_at?: string
          nombre?: string | null
          productos_b2b_id?: string | null
          proveedor_id?: string
          provider_sku?: string
          raw_payload?: Json
          subcategoria?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_raw_products_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "provider_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_raw_products_productos_b2b_id_fkey"
            columns: ["productos_b2b_id"]
            isOneToOne: false
            referencedRelation: "productos_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_raw_products_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_levels: {
        Row: {
          created_at: string
          id: string
          level_number: number
          rule_set_id: string
          threshold_amount_mxn: number
        }
        Insert: {
          created_at?: string
          id?: string
          level_number: number
          rule_set_id: string
          threshold_amount_mxn: number
        }
        Update: {
          created_at?: string
          id?: string
          level_number?: number
          rule_set_id?: string
          threshold_amount_mxn?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_levels_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_approval_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          request_type: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          snapshot_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          request_type: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          request_type?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_approval_requests_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "quote_calculation_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_calculation_snapshots: {
        Row: {
          balance_amount: number | null
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          deposit_percent: number | null
          discounts_total: number | null
          id: string
          internal_margin_percent: number | null
          internal_profit: number | null
          lead_id: string | null
          pricing_rule_set_id: string | null
          print_price_book_id: string | null
          print_subtotal_before_tax: number | null
          product_subtotal_before_tax: number | null
          quote_id: string | null
          snapshot: Json
          subtotal_before_tax: number | null
          tax_amount: number | null
          tax_rate: number
          total_with_tax: number | null
        }
        Insert: {
          balance_amount?: number | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_percent?: number | null
          discounts_total?: number | null
          id?: string
          internal_margin_percent?: number | null
          internal_profit?: number | null
          lead_id?: string | null
          pricing_rule_set_id?: string | null
          print_price_book_id?: string | null
          print_subtotal_before_tax?: number | null
          product_subtotal_before_tax?: number | null
          quote_id?: string | null
          snapshot: Json
          subtotal_before_tax?: number | null
          tax_amount?: number | null
          tax_rate?: number
          total_with_tax?: number | null
        }
        Update: {
          balance_amount?: number | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_percent?: number | null
          discounts_total?: number | null
          id?: string
          internal_margin_percent?: number | null
          internal_profit?: number | null
          lead_id?: string | null
          pricing_rule_set_id?: string | null
          print_price_book_id?: string | null
          print_subtotal_before_tax?: number | null
          product_subtotal_before_tax?: number | null
          quote_id?: string | null
          snapshot?: Json
          subtotal_before_tax?: number | null
          tax_amount?: number | null
          tax_rate?: number
          total_with_tax?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_calculation_snapshots_pricing_rule_set_id_fkey"
            columns: ["pricing_rule_set_id"]
            isOneToOne: false
            referencedRelation: "pricing_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_calculation_snapshots_print_price_book_id_fkey"
            columns: ["print_price_book_id"]
            isOneToOne: false
            referencedRelation: "print_price_books"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_discounts: {
        Row: {
          amount: number | null
          applies_to: string
          approved_by: string | null
          created_at: string
          created_by: string | null
          discount_rule_id: string | null
          discount_type: string
          id: string
          percent: number | null
          reason: string
          snapshot_id: string
        }
        Insert: {
          amount?: number | null
          applies_to: string
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          discount_rule_id?: string | null
          discount_type: string
          id?: string
          percent?: number | null
          reason: string
          snapshot_id: string
        }
        Update: {
          amount?: number | null
          applies_to?: string
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          discount_rule_id?: string | null
          discount_type?: string
          id?: string
          percent?: number | null
          reason?: string
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_discounts_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_discounts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "quote_calculation_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_payment_terms: {
        Row: {
          approved_by: string | null
          balance_amount: number | null
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          deposit_percent: number | null
          id: string
          manual_override: boolean
          override_reason: string | null
          payment_due_stage: string | null
          payment_term_rule_id: string | null
          snapshot_id: string
        }
        Insert: {
          approved_by?: string | null
          balance_amount?: number | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_percent?: number | null
          id?: string
          manual_override?: boolean
          override_reason?: string | null
          payment_due_stage?: string | null
          payment_term_rule_id?: string | null
          snapshot_id: string
        }
        Update: {
          approved_by?: string | null
          balance_amount?: number | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_percent?: number | null
          id?: string
          manual_override?: boolean
          override_reason?: string | null
          payment_due_stage?: string | null
          payment_term_rule_id?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_payment_terms_payment_term_rule_id_fkey"
            columns: ["payment_term_rule_id"]
            isOneToOne: false
            referencedRelation: "payment_term_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_payment_terms_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "quote_calculation_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          role: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_refresh_cursors: {
        Row: {
          cycle_count: number
          last_completed_cycle_at: string | null
          last_run_at: string | null
          next_offset: number
          next_page: number
          provider: string
          updated_at: string
        }
        Insert: {
          cycle_count?: number
          last_completed_cycle_at?: string | null
          last_run_at?: string | null
          next_offset?: number
          next_page?: number
          provider: string
          updated_at?: string
        }
        Update: {
          cycle_count?: number
          last_completed_cycle_at?: string | null
          last_run_at?: string | null
          next_offset?: number
          next_page?: number
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_refresh_run_items: {
        Row: {
          batch_number: number
          created_at: string
          error: string | null
          id: string
          items_seen: number
          offset_used: number | null
          page_used: number | null
          provider: string
          response: Json
          run_id: string
          status: string
          stock_updated: number
        }
        Insert: {
          batch_number: number
          created_at?: string
          error?: string | null
          id?: string
          items_seen?: number
          offset_used?: number | null
          page_used?: number | null
          provider: string
          response?: Json
          run_id: string
          status: string
          stock_updated?: number
        }
        Update: {
          batch_number?: number
          created_at?: string
          error?: string | null
          id?: string
          items_seen?: number
          offset_used?: number | null
          page_used?: number | null
          provider?: string
          response?: Json
          run_id?: string
          status?: string
          stock_updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_refresh_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "stock_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_refresh_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          mode: string
          params: Json
          provider: string
          result: Json
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          mode: string
          params?: Json
          provider: string
          result?: Json
          started_at?: string
          status: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          params?: Json
          provider?: string
          result?: Json
          started_at?: string
          status?: string
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
      can_manage_formal_quote: { Args: { _quote_id: string }; Returns: boolean }
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
      next_formal_quote_folio: { Args: never; Returns: string }
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
