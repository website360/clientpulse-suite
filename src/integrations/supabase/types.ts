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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          due_date: string
          due_day: number | null
          id: string
          installment_number: number | null
          installments: number | null
          issue_date: string | null
          notes: string | null
          occurrence_type: string | null
          parent_payable_id: string | null
          payment_date: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          due_date: string
          due_day?: number | null
          id?: string
          installment_number?: number | null
          installments?: number | null
          issue_date?: string | null
          notes?: string | null
          occurrence_type?: string | null
          parent_payable_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          due_day?: number | null
          id?: string
          installment_number?: number | null
          installments?: number | null
          issue_date?: string | null
          notes?: string | null
          occurrence_type?: string | null
          parent_payable_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id?: string
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_parent_payable_id_fkey"
            columns: ["parent_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          amount: number
          asaas_billing_type: string | null
          asaas_customer_id: string | null
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          asaas_status: string | null
          attachment_url: string | null
          category: string
          client_id: string
          created_at: string
          created_by: string
          description: string
          due_date: string
          due_day: number | null
          id: string
          installment_number: number | null
          installments: number | null
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          occurrence_type: string | null
          parent_receivable_id: string | null
          payment_confirmation_date: string | null
          payment_date: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"]
          sync_with_asaas: boolean | null
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_billing_type?: string | null
          asaas_customer_id?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          attachment_url?: string | null
          category: string
          client_id: string
          created_at?: string
          created_by: string
          description: string
          due_date: string
          due_day?: number | null
          id?: string
          installment_number?: number | null
          installments?: number | null
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          occurrence_type?: string | null
          parent_receivable_id?: string | null
          payment_confirmation_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          sync_with_asaas?: boolean | null
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_billing_type?: string | null
          asaas_customer_id?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          attachment_url?: string | null
          category?: string
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          due_day?: number | null
          id?: string
          installment_number?: number | null
          installments?: number | null
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          occurrence_type?: string | null
          parent_receivable_id?: string | null
          payment_confirmation_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          sync_with_asaas?: boolean | null
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_parent_receivable_id_fkey"
            columns: ["parent_receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_receivable"
            columns: ["parent_receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_settings: {
        Row: {
          created_at: string
          days_before_notification: number
          email_enabled: boolean
          id: string
          notification_frequency_days: number
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          days_before_notification?: number
          email_enabled?: boolean
          id?: string
          notification_frequency_days?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          days_before_notification?: number
          email_enabled?: boolean
          id?: string
          notification_frequency_days?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      asaas_customers: {
        Row: {
          asaas_customer_id: string
          client_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          asaas_customer_id: string
          client_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string
          client_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_settings: {
        Row: {
          auto_create_on_receivable: boolean
          auto_sync_payments: boolean
          created_at: string
          default_billing_type: string
          environment: string
          id: string
          is_active: boolean
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          auto_create_on_receivable?: boolean
          auto_sync_payments?: boolean
          created_at?: string
          default_billing_type?: string
          environment?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          auto_create_on_receivable?: boolean
          auto_sync_payments?: boolean
          created_at?: string
          default_billing_type?: string
          environment?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      asaas_webhooks: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          payment_id: string
          processed: boolean
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          payment_id: string
          processed?: boolean
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          payment_id?: string
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          device_info: Json | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clicksign_settings: {
        Row: {
          api_token: string | null
          created_at: string
          environment: string
          id: string
          is_active: boolean
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          api_token?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          api_token?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          birth_date: string | null
          client_id: string
          cpf: string | null
          created_at: string
          department: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          client_id: string
          cpf?: string | null
          created_at?: string
          department: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          client_id?: string
          cpf?: string | null
          created_at?: string
          department?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_maintenance_plans: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          domain_id: string | null
          id: string
          is_active: boolean
          monthly_day: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          domain_id?: string | null
          id?: string
          is_active?: boolean
          monthly_day?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          domain_id?: string | null
          id?: string
          is_active?: boolean
          monthly_day?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_maintenance_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_maintenance_plans_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          birth_date: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          company_name: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_active: boolean | null
          nickname: string | null
          phone: string
          responsible_cpf: string | null
          responsible_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birth_date?: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          nickname?: string | null
          phone: string
          responsible_cpf?: string | null
          responsible_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birth_date?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          company_name?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          nickname?: string | null
          phone?: string
          responsible_cpf?: string | null
          responsible_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          amount: number
          attachment_url: string | null
          client_id: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          payment_method_id: string | null
          payment_terms: string | null
          service_id: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          client_id: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          payment_method_id?: string | null
          payment_terms?: string | null
          service_id: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          payment_method_id?: string | null
          payment_terms?: string | null
          service_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          layout: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          layout?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          layout?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          footer_image_url: string | null
          header_image_url: string | null
          id: string
          is_active: boolean
          name: string
          orientation: string | null
          page_backgrounds: Json | null
          page_count: number | null
          page_layouts: Json | null
          paper_size: string | null
          service_id: string | null
          styles: string | null
          template_html: string
          updated_at: string
          variables: Json
          watermark_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          footer_image_url?: string | null
          header_image_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          orientation?: string | null
          page_backgrounds?: Json | null
          page_count?: number | null
          page_layouts?: Json | null
          paper_size?: string | null
          service_id?: string | null
          styles?: string | null
          template_html: string
          updated_at?: string
          variables?: Json
          watermark_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          footer_image_url?: string | null
          header_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          orientation?: string | null
          page_backgrounds?: Json | null
          page_count?: number | null
          page_layouts?: Json | null
          paper_size?: string | null
          service_id?: string | null
          styles?: string | null
          template_html?: string
          updated_at?: string
          variables?: Json
          watermark_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          domain: string
          expires_at: string
          id: string
          is_cloudflare: boolean
          owner: Database["public"]["Enums"]["domain_owner"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          domain: string
          expires_at: string
          id?: string
          is_cloudflare?: boolean
          owner?: Database["public"]["Enums"]["domain_owner"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          domain?: string
          expires_at?: string
          id?: string
          is_cloudflare?: boolean
          owner?: Database["public"]["Enums"]["domain_owner"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          asaas_payment_id: string | null
          clicksign_document_id: string | null
          clicksign_signed_url: string | null
          clicksign_status:
            | Database["public"]["Enums"]["clicksign_status"]
            | null
          client_id: string
          contract_id: string | null
          created_at: string
          created_by: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          generated_pdf_url: string | null
          id: string
          payment_status: string | null
          signed_at: string | null
          template_id: string | null
          updated_at: string
          variables_data: Json
          whatsapp_message_id: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          asaas_payment_id?: string | null
          clicksign_document_id?: string | null
          clicksign_signed_url?: string | null
          clicksign_status?:
            | Database["public"]["Enums"]["clicksign_status"]
            | null
          client_id: string
          contract_id?: string | null
          created_at?: string
          created_by: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          generated_pdf_url?: string | null
          id?: string
          payment_status?: string | null
          signed_at?: string | null
          template_id?: string | null
          updated_at?: string
          variables_data?: Json
          whatsapp_message_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          asaas_payment_id?: string | null
          clicksign_document_id?: string | null
          clicksign_signed_url?: string | null
          clicksign_status?:
            | Database["public"]["Enums"]["clicksign_status"]
            | null
          client_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          document_name?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          generated_pdf_url?: string | null
          id?: string
          payment_status?: string | null
          signed_at?: string | null
          template_id?: string | null
          updated_at?: string
          variables_data?: Json
          whatsapp_message_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      knowledge_base_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_base_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_approved: boolean
          post_id: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_approved?: boolean
          post_id: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          post_id?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_posts: {
        Row: {
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_ratings: {
        Row: {
          created_at: string
          id: string
          is_helpful: boolean
          post_id: string
          user_ip: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_helpful: boolean
          post_id: string
          user_ip: string
        }
        Update: {
          created_at?: string
          id?: string
          is_helpful?: boolean
          post_id?: string
          user_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_execution_items: {
        Row: {
          checklist_item_id: string
          created_at: string
          id: string
          maintenance_execution_id: string
          notes: string | null
          status: Database["public"]["Enums"]["maintenance_item_status"]
          updated_at: string
        }
        Insert: {
          checklist_item_id: string
          created_at?: string
          id?: string
          maintenance_execution_id: string
          notes?: string | null
          status: Database["public"]["Enums"]["maintenance_item_status"]
          updated_at?: string
        }
        Update: {
          checklist_item_id?: string
          created_at?: string
          id?: string
          maintenance_execution_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["maintenance_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_execution_items_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "maintenance_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_execution_items_maintenance_execution_id_fkey"
            columns: ["maintenance_execution_id"]
            isOneToOne: false
            referencedRelation: "maintenance_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_executions: {
        Row: {
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          maintenance_plan_id: string
          next_scheduled_date: string | null
          notes: string | null
          updated_at: string
          whatsapp_sent: boolean
          whatsapp_sent_at: string | null
        }
        Insert: {
          created_at?: string
          executed_at?: string
          executed_by: string
          id?: string
          maintenance_plan_id: string
          next_scheduled_date?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
        }
        Update: {
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          maintenance_plan_id?: string
          next_scheduled_date?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_executions_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "client_maintenance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_settings: {
        Row: {
          created_at: string
          default_monthly_day: number
          id: string
          message_signature: string
          notification_days_advance: number
          updated_at: string
          whatsapp_template: string
        }
        Insert: {
          created_at?: string
          default_monthly_day?: number
          id?: string
          message_signature?: string
          notification_days_advance?: number
          updated_at?: string
          whatsapp_template?: string
        }
        Update: {
          created_at?: string
          default_monthly_day?: number
          id?: string
          message_signature?: string
          notification_days_advance?: number
          updated_at?: string
          whatsapp_template?: string
        }
        Relationships: []
      }
      note_tag_relationships: {
        Row: {
          created_at: string
          id: string
          note_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_tag_relationships_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tag_relationships_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "note_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string
          content: string
          created_at: string
          height: number | null
          id: string
          image_urls: Json | null
          link_url: string | null
          position_x: number | null
          position_y: number | null
          title: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          color?: string
          content: string
          created_at?: string
          height?: number | null
          id?: string
          image_urls?: Json | null
          link_url?: string | null
          position_x?: number | null
          position_y?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          height?: number | null
          id?: string
          image_urls?: Json | null
          link_url?: string | null
          position_x?: number | null
          position_y?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error_message: string | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          message: string
          recipient: string
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          message: string
          recipient: string
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          message?: string
          recipient?: string
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          event_type: string
          id: string
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_type: string
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_type?: string
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          channels: Database["public"]["Enums"]["notification_channel"][]
          created_at: string
          created_by: string
          description: string | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          is_active: boolean | null
          name: string
          send_to_admins: boolean | null
          send_to_assigned: boolean | null
          send_to_client: boolean | null
          template_body: string
          template_html: string | null
          template_subject: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          created_by: string
          description?: string | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          is_active?: boolean | null
          name: string
          send_to_admins?: boolean | null
          send_to_assigned?: boolean | null
          send_to_client?: boolean | null
          template_body: string
          template_html?: string | null
          template_subject?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          created_by?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          is_active?: boolean | null
          name?: string
          send_to_admins?: boolean | null
          send_to_assigned?: boolean | null
          send_to_client?: boolean | null
          template_body?: string
          template_html?: string | null
          template_subject?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_reminder_logs: {
        Row: {
          channel: string
          created_at: string
          days_overdue: number
          error_message: string | null
          id: string
          payment_link: string | null
          receivable_id: string
          recipient: string
          sent_at: string
          status: string
          template_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          days_overdue: number
          error_message?: string | null
          id?: string
          payment_link?: string | null
          receivable_id: string
          recipient: string
          sent_at?: string
          status?: string
          template_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          days_overdue?: number
          error_message?: string | null
          id?: string
          payment_link?: string | null
          receivable_id?: string
          recipient?: string
          sent_at?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_logs_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminder_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payment_reminder_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_templates: {
        Row: {
          channels: string[]
          created_at: string
          days_overdue: number
          description: string | null
          id: string
          include_payment_link: boolean
          is_active: boolean
          name: string
          send_to_client: boolean
          send_to_contacts: boolean
          template_body: string
          template_html: string | null
          template_subject: string | null
          tone: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          days_overdue: number
          description?: string | null
          id?: string
          include_payment_link?: boolean
          is_active?: boolean
          name: string
          send_to_client?: boolean
          send_to_contacts?: boolean
          template_body: string
          template_html?: string | null
          template_subject?: string | null
          tone?: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          days_overdue?: number
          description?: string | null
          id?: string
          include_payment_link?: boolean
          is_active?: boolean
          name?: string
          send_to_client?: boolean
          send_to_contacts?: boolean
          template_body?: string
          template_html?: string | null
          template_subject?: string | null
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_approvals: {
        Row: {
          action: string
          action_data: Json
          id: string
          record_id: string | null
          requested_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          action_data: Json
          id?: string
          record_id?: string | null
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          action_data?: Json
          id?: string
          record_id?: string | null
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module_id: string
          requires_approval: boolean
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          requires_approval?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          requires_approval?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          nickname: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          nickname?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          nickname?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_approval_changes: {
        Row: {
          approval_id: string
          change_description: string
          created_at: string | null
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          approval_id: string
          change_description: string
          created_at?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          approval_id?: string
          change_description?: string
          created_at?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_approval_changes_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "project_stage_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          approval_link: string | null
          approval_sent_at: string | null
          approval_type: string | null
          approved_at: string | null
          approved_by: string | null
          checklist_template_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          depends_on_item_id: string | null
          description: string
          id: string
          is_completed: boolean | null
          notes: string | null
          order: number
          project_stage_id: string
          requires_approval: boolean | null
          updated_at: string
        }
        Insert: {
          approval_link?: string | null
          approval_sent_at?: string | null
          approval_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          checklist_template_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          depends_on_item_id?: string | null
          description: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          order?: number
          project_stage_id: string
          requires_approval?: boolean | null
          updated_at?: string
        }
        Update: {
          approval_link?: string | null
          approval_sent_at?: string | null
          approval_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          checklist_template_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          depends_on_item_id?: string | null
          description?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          order?: number
          project_stage_id?: string
          requires_approval?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_items_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "project_checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_items_depends_on_item_id_fkey"
            columns: ["depends_on_item_id"]
            isOneToOne: false
            referencedRelation: "project_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_items_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_templates: {
        Row: {
          approval_type: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          order: number
          requires_approval: boolean | null
          stage_template_id: string
          updated_at: string
        }
        Insert: {
          approval_type?: string | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          order?: number
          requires_approval?: boolean | null
          stage_template_id: string
          updated_at?: string
        }
        Update: {
          approval_type?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          order?: number
          requires_approval?: boolean | null
          stage_template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_templates_stage_template_id_fkey"
            columns: ["stage_template_id"]
            isOneToOne: false
            referencedRelation: "project_stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "project_stage_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_credential_templates: {
        Row: {
          category: Database["public"]["Enums"]["project_credential_category"]
          created_at: string
          id: string
          is_active: boolean
          service_name: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["project_credential_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          service_name: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["project_credential_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          service_name?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      project_credentials: {
        Row: {
          category: Database["public"]["Enums"]["project_credential_category"]
          created_at: string
          created_by: string
          id: string
          notes: string | null
          password_encrypted: string
          project_id: string
          service_name: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["project_credential_category"]
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          password_encrypted: string
          project_id: string
          service_name: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["project_credential_category"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          password_encrypted?: string
          project_id?: string
          service_name?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_link_templates: {
        Row: {
          category: Database["public"]["Enums"]["project_link_category"]
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["project_link_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["project_link_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      project_links: {
        Row: {
          category: Database["public"]["Enums"]["project_link_category"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          order: number | null
          project_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category: Database["public"]["Enums"]["project_link_category"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          order?: number | null
          project_id: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: Database["public"]["Enums"]["project_link_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          order?: number | null
          project_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_approvals: {
        Row: {
          approval_token: string | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          client_message: string | null
          created_at: string | null
          id: string
          last_notification_sent_at: string | null
          notes: string | null
          notification_count: number | null
          project_stage_id: string
          requested_by: string
          signature_data: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approval_token?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          client_message?: string | null
          created_at?: string | null
          id?: string
          last_notification_sent_at?: string | null
          notes?: string | null
          notification_count?: number | null
          project_stage_id: string
          requested_by: string
          signature_data?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_token?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          client_message?: string | null
          created_at?: string | null
          id?: string
          last_notification_sent_at?: string | null
          notes?: string | null
          notification_count?: number | null
          project_stage_id?: string
          requested_by?: string
          signature_data?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_approvals_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_attachments: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_stage_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          project_stage_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_stage_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_attachments_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          parent_comment_id: string | null
          project_stage_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          parent_comment_id?: string | null
          project_stage_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          parent_comment_id?: string | null
          project_stage_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "project_stage_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stage_comments_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number
          project_type_id: string
          requires_client_approval: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number
          project_type_id: string
          requires_client_approval?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number
          project_type_id?: string
          requires_client_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_templates_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "project_types"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order: number
          project_id: string
          requires_client_approval: boolean
          stage_template_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["project_stage_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order?: number
          project_id: string
          requires_client_approval?: boolean
          stage_template_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_stage_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order?: number
          project_id?: string
          requires_client_approval?: boolean
          stage_template_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_stage_template_id_fkey"
            columns: ["stage_template_id"]
            isOneToOne: false
            referencedRelation: "project_stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_types: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_whatsapp_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_key: string
          template_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_key: string
          template_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_key?: string
          template_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string
          completion_date: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          notes: string | null
          project_type_id: string
          project_value: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          completion_date?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          project_type_id: string
          project_value?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_type_id?: string
          project_value?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "project_types"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_pages: {
        Row: {
          background_type: string
          background_value: string
          created_at: string | null
          elements: Json
          id: string
          page_order: number
          proposal_id: string
          updated_at: string | null
        }
        Insert: {
          background_type?: string
          background_value?: string
          created_at?: string | null
          elements?: Json
          id?: string
          page_order: number
          proposal_id: string
          updated_at?: string | null
        }
        Update: {
          background_type?: string
          background_value?: string
          created_at?: string | null
          elements?: Json
          id?: string
          page_order?: number
          proposal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_pages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_services: {
        Row: {
          created_at: string | null
          custom_name: string
          description: string | null
          id: string
          price: number
          proposal_id: string
          service_id: string | null
          service_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_name: string
          description?: string | null
          id?: string
          price: number
          proposal_id: string
          service_id?: string | null
          service_order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_name?: string
          description?: string | null
          id?: string
          price?: number
          proposal_id?: string
          service_id?: string | null
          service_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_services_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_id: string
          company_data: Json
          created_at: string | null
          created_by: string
          email_sent_at: string | null
          generated_pdf_url: string | null
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string | null
          validity_days: number | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          client_id: string
          company_data?: Json
          created_at?: string | null
          created_by: string
          email_sent_at?: string | null
          generated_pdf_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string | null
          validity_days?: number | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          client_id?: string
          company_data?: Json
          created_at?: string | null
          created_by?: string
          email_sent_at?: string | null
          generated_pdf_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          validity_days?: number | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          link: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          link?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          link?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          end_time: string | null
          id: string
          priority: string | null
          start_time: string | null
          status: string
          ticket_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          end_time?: string | null
          id?: string
          priority?: string | null
          start_time?: string | null
          status?: string
          ticket_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          end_time?: string | null
          id?: string
          priority?: string | null
          start_time?: string | null
          status?: string
          ticket_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_auto_close_config: {
        Row: {
          created_at: string | null
          days_after_resolved: number
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_after_resolved?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_after_resolved?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_escalation_rules: {
        Row: {
          created_at: string | null
          department_id: string | null
          escalate_to_user_id: string | null
          hours_without_response: number
          id: string
          is_active: boolean | null
          priority: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          escalate_to_user_id?: string | null
          hours_without_response: number
          id?: string
          is_active?: boolean | null
          priority: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          escalate_to_user_id?: string | null
          hours_without_response?: number
          id?: string
          is_active?: boolean | null
          priority?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_escalation_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_macros: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          department_id: string | null
          id: string
          is_active: boolean | null
          name: string
          shortcut: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          shortcut?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          shortcut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_macros_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_important: boolean | null
          is_internal: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_important?: boolean | null
          is_internal?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_important?: boolean | null
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rated_by: string
          rating: number
          ticket_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_by: string
          rating: number
          ticket_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_by?: string
          rating?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sla_configs: {
        Row: {
          created_at: string | null
          department_id: string | null
          first_response_minutes: number
          id: string
          is_active: boolean | null
          priority: string
          resolution_minutes: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          first_response_minutes: number
          id?: string
          is_active?: boolean | null
          priority: string
          resolution_minutes: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          first_response_minutes?: number
          id?: string
          is_active?: boolean | null
          priority?: string
          resolution_minutes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sla_configs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sla_tracking: {
        Row: {
          created_at: string | null
          first_response_at: string | null
          first_response_breached: boolean | null
          first_response_due_at: string | null
          id: string
          resolution_at: string | null
          resolution_breached: boolean | null
          resolution_due_at: string | null
          sla_config_id: string | null
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_response_at?: string | null
          first_response_breached?: boolean | null
          first_response_due_at?: string | null
          id?: string
          resolution_at?: string | null
          resolution_breached?: boolean | null
          resolution_due_at?: string | null
          sla_config_id?: string | null
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_response_at?: string | null
          first_response_breached?: boolean | null
          first_response_due_at?: string | null
          id?: string
          resolution_at?: string | null
          resolution_breached?: boolean | null
          resolution_due_at?: string | null
          sla_config_id?: string | null
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sla_tracking_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "ticket_sla_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sla_tracking_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_views: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_views_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_whatsapp_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          template_key: string
          template_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_key: string
          template_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_key?: string
          template_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string
          description: string
          id: string
          last_response_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          requester_email: string | null
          requester_name: string | null
          requester_phone: string | null
          resolution_time_minutes: number | null
          resolved_at: string | null
          response_time_minutes: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          description: string
          id?: string
          last_response_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string
          id?: string
          last_response_at?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester_email?: string | null
          requester_name?: string | null
          requester_phone?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_roles: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_notification_log: {
        Row: {
          bucket_5min: string | null
          created_at: string | null
          event_type: string
          id: string
          sent_at: string | null
          ticket_id: string
        }
        Insert: {
          bucket_5min?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          sent_at?: string | null
          ticket_id: string
        }
        Update: {
          bucket_5min?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          sent_at?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_5min_bucket: { Args: { ts: string }; Returns: string }
      calculate_project_progress: {
        Args: { project_id_param: string }
        Returns: number
      }
      calculate_stage_progress: {
        Args: { stage_id_param: string }
        Returns: number
      }
      check_expiring_contracts: { Args: never; Returns: undefined }
      check_expiring_domains: { Args: never; Returns: undefined }
      close_ticket: { Args: { p_ticket_id: string }; Returns: undefined }
      create_maintenance_execution:
        | {
            Args: {
              p_executed_by: string
              p_items?: Json
              p_notes?: string
              p_plan_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_items: Json
              p_next_date: string
              p_notes: string
              p_plan_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_items: Json
              p_next_date: string
              p_notes: string
              p_plan_id: string
              p_send_whatsapp?: boolean
            }
            Returns: string
          }
      format_timestamp_br: { Args: { ts: string }; Returns: string }
      get_receivable_parent_id: {
        Args: { receivable_id: string }
        Returns: string
      }
      has_permission: {
        Args: { _action: string; _module_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_contact_of_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      notify_event: {
        Args: {
          p_data: Json
          p_event_type: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: undefined
      }
      set_ticket_status: {
        Args: { p_new_status: string; p_ticket_id: string }
        Returns: {
          assigned_to: string | null
          client_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string
          description: string
          id: string
          last_response_at: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          requester_email: string | null
          requester_name: string | null
          requester_phone: string | null
          resolution_time_minutes: number | null
          resolved_at: string | null
          response_time_minutes: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "client" | "contato"
      clicksign_status: "draft" | "pending" | "signed" | "cancelled" | "expired"
      client_type: "person" | "company"
      document_type: "contract" | "proposal"
      domain_owner: "agency" | "client"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      maintenance_item_status: "done" | "not_needed" | "skipped"
      note_type: "text" | "link" | "image"
      notification_channel: "email" | "telegram" | "sms" | "whatsapp"
      notification_event_type:
        | "ticket_created"
        | "ticket_assigned"
        | "ticket_status_changed"
        | "ticket_message"
        | "payment_due"
        | "payment_overdue"
        | "payment_received"
        | "contract_expiring"
        | "contract_expired"
        | "domain_expiring"
        | "domain_expired"
        | "maintenance_scheduled"
        | "maintenance_completed"
        | "task_assigned"
        | "task_due"
        | "custom"
        | "ticket_closed"
        | "ticket_resolved"
        | "ticket_reopened"
        | "ticket_response_admin"
        | "ticket_response_client"
        | "ticket_response_contact"
        | "approval_reminder_normal"
        | "approval_reminder_medium"
        | "approval_reminder_high"
        | "project_approval_requested"
        | "project_approval_confirmed"
        | "project_mention"
      payment_status: "pending" | "paid" | "received" | "overdue" | "canceled"
      project_credential_category:
        | "hosting"
        | "cloudflare"
        | "domain_registry"
        | "cms"
        | "ftp"
        | "database"
        | "api"
        | "email"
        | "other"
      project_link_category:
        | "google_drive"
        | "images"
        | "identity"
        | "copy"
        | "prototype"
        | "documentation"
        | "other"
      project_stage_status: "pendente" | "em_andamento" | "concluida"
      project_status:
        | "planejamento"
        | "em_andamento"
        | "aguardando_aprovacao"
        | "concluido"
        | "cancelado"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "waiting" | "in_progress" | "resolved" | "closed"
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
      app_role: ["admin", "client", "contato"],
      clicksign_status: ["draft", "pending", "signed", "cancelled", "expired"],
      client_type: ["person", "company"],
      document_type: ["contract", "proposal"],
      domain_owner: ["agency", "client"],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      maintenance_item_status: ["done", "not_needed", "skipped"],
      note_type: ["text", "link", "image"],
      notification_channel: ["email", "telegram", "sms", "whatsapp"],
      notification_event_type: [
        "ticket_created",
        "ticket_assigned",
        "ticket_status_changed",
        "ticket_message",
        "payment_due",
        "payment_overdue",
        "payment_received",
        "contract_expiring",
        "contract_expired",
        "domain_expiring",
        "domain_expired",
        "maintenance_scheduled",
        "maintenance_completed",
        "task_assigned",
        "task_due",
        "custom",
        "ticket_closed",
        "ticket_resolved",
        "ticket_reopened",
        "ticket_response_admin",
        "ticket_response_client",
        "ticket_response_contact",
        "approval_reminder_normal",
        "approval_reminder_medium",
        "approval_reminder_high",
        "project_approval_requested",
        "project_approval_confirmed",
        "project_mention",
      ],
      payment_status: ["pending", "paid", "received", "overdue", "canceled"],
      project_credential_category: [
        "hosting",
        "cloudflare",
        "domain_registry",
        "cms",
        "ftp",
        "database",
        "api",
        "email",
        "other",
      ],
      project_link_category: [
        "google_drive",
        "images",
        "identity",
        "copy",
        "prototype",
        "documentation",
        "other",
      ],
      project_stage_status: ["pendente", "em_andamento", "concluida"],
      project_status: [
        "planejamento",
        "em_andamento",
        "aguardando_aprovacao",
        "concluido",
        "cancelado",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["waiting", "in_progress", "resolved", "closed"],
    },
  },
} as const
