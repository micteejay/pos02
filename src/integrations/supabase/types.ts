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
      app_settings: {
        Row: {
          company_id: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          company_id?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          company_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string
          current_workflow_step: number | null
          department: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["approval_priority"]
          requester: string | null
          required_role: string | null
          review_notes: string | null
          reviewed_by: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          type: string
          updated_at: string
          workflow_steps: Json | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          current_workflow_step?: number | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["approval_priority"]
          requester?: string | null
          required_role?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          type: string
          updated_at?: string
          workflow_steps?: Json | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          current_workflow_step?: number | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["approval_priority"]
          requester?: string | null
          required_role?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          type?: string
          updated_at?: string
          workflow_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          detail: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module: string
          severity: Database["public"]["Enums"]["audit_severity"]
          target: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module: string
          severity?: Database["public"]["Enums"]["audit_severity"]
          target?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string
          severity?: Database["public"]["Enums"]["audit_severity"]
          target?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          approved_by: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["category_status"]
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["category_status"]
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["category_status"]
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean | null
          role: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_document_links: {
        Row: {
          created_at: string
          document_id: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_document_links_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          deleted: boolean | null
          edited: boolean | null
          id: string
          is_pinned: boolean | null
          reactions: Json | null
          reply_to: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          deleted?: boolean | null
          edited?: boolean | null
          id?: string
          is_pinned?: boolean | null
          reactions?: Json | null
          reply_to?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          deleted?: boolean | null
          edited?: boolean | null
          id?: string
          is_pinned?: boolean | null
          reactions?: Json | null
          reply_to?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          email: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          rc_number: string | null
          state: string | null
          tax_id: string | null
          tax_rate: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          rc_number?: string | null
          state?: string | null
          tax_id?: string | null
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          rc_number?: string | null
          state?: string | null
          tax_id?: string | null
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          budget: number | null
          company_id: string | null
          created_at: string
          head_id: string | null
          id: string
          name: string
          teams: string[] | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          head_id?: string | null
          id?: string
          name: string
          teams?: string[] | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          head_id?: string | null
          id?: string
          name?: string
          teams?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_department_head"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          path: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          path?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          created_at: string
          document_id: string
          id: string
          permission: string | null
          shared_with: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          permission?: string | null
          shared_with: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          permission?: string | null
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          author: string | null
          company_id: string | null
          created_at: string
          folder_id: string | null
          folder_path: string | null
          id: string
          is_archived: boolean | null
          mime_type: string | null
          name: string
          size_bytes: number | null
          size_display: string | null
          source: string | null
          storage_bucket: string | null
          storage_path: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          version: number | null
        }
        Insert: {
          author?: string | null
          company_id?: string | null
          created_at?: string
          folder_id?: string | null
          folder_path?: string | null
          id?: string
          is_archived?: boolean | null
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          size_display?: string | null
          source?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          version?: number | null
        }
        Update: {
          author?: string | null
          company_id?: string | null
          created_at?: string
          folder_id?: string | null
          folder_path?: string | null
          id?: string
          is_archived?: boolean | null
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          size_display?: string | null
          source?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          next_due_date: string | null
          parent_id: string | null
          recurring: boolean | null
          recurring_interval: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          next_due_date?: string | null
          parent_id?: string | null
          recurring?: boolean | null
          recurring_interval?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          next_due_date?: string | null
          parent_id?: string | null
          recurring?: boolean | null
          recurring_interval?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_by: string | null
          company_id: string | null
          created_at: string
          data_snapshot: Json | null
          filters: Json | null
          generated_by: string | null
          generated_by_name: string | null
          id: string
          name: string
          notes: string | null
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          data_snapshot?: Json | null
          filters?: Json | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          name: string
          notes?: string | null
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          data_snapshot?: Json | null
          filters?: Json | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          name?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          category: Database["public"]["Enums"]["integration_category"]
          company_id: string | null
          config_fields: string[] | null
          config_values: Json | null
          connected: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["integration_category"]
          company_id?: string | null
          config_fields?: string[] | null
          config_values?: Json | null
          connected?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["integration_category"]
          company_id?: string | null
          config_fields?: string[] | null
          config_values?: Json | null
          connected?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: string | null
          category_id: string | null
          company_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          qty: number
          reorder_point: number
          sku: string
          status: Database["public"]["Enums"]["inventory_status"]
          unit: string | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          category_id?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          qty?: number
          reorder_point?: number
          sku: string
          status?: Database["public"]["Enums"]["inventory_status"]
          unit?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          category_id?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          qty?: number
          reorder_point?: number
          sku?: string
          status?: Database["public"]["Enums"]["inventory_status"]
          unit?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          inventory_item_id: string | null
          invoice_id: string
          qty: number
          rate: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          inventory_item_id?: string | null
          invoice_id: string
          qty?: number
          rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string
          qty?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_name: string
          date: string
          id: string
          notes: string | null
          number: string
          sale_id: string | null
          service_charge_percent: number | null
          status: Database["public"]["Enums"]["invoice_status"]
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_name: string
          date?: string
          id?: string
          notes?: string | null
          number: string
          sale_id?: string | null
          service_charge_percent?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string
          date?: string
          id?: string
          notes?: string | null
          number?: string
          sale_id?: string | null
          service_charge_percent?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          created_by_name: string | null
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean | null
          target_roles: string[] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by_name?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          target_roles?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by_name?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          target_roles?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          company_id: string | null
          created_at: string
          department_id: string | null
          email: string | null
          id: string
          last_active: string | null
          name: string | null
          status: Database["public"]["Enums"]["user_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          id: string
          last_active?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          id?: string
          last_active?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          inventory_item_id: string | null
          name: string
          purchase_order_id: string
          qty: number
          received_qty: number | null
          sku: string | null
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_item_id?: string | null
          name: string
          purchase_order_id: string
          qty?: number
          received_qty?: number | null
          sku?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          id?: string
          inventory_item_id?: string | null
          name?: string
          purchase_order_id?: string
          qty?: number
          received_qty?: number | null
          sku?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string
          received_date: string | null
          shipping: number | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          supplier_id: string | null
          tax: number | null
          total: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number: string
          received_date?: string | null
          shipping?: number | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string | null
          tax?: number | null
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          received_date?: string | null
          shipping?: number | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string | null
          tax?: number | null
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_templates: {
        Row: {
          company_id: string | null
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          is_default: boolean | null
          layout: Json
          name: string
          show_logo: boolean | null
          show_tax: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json
          name: string
          show_logo?: boolean | null
          show_tax?: boolean | null
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          layout?: Json
          name?: string
          show_logo?: boolean | null
          show_tax?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      sales_return_items: {
        Row: {
          id: string
          inventory_item_id: string | null
          name: string
          price: number
          qty: number
          restock: boolean | null
          return_id: string
        }
        Insert: {
          id?: string
          inventory_item_id?: string | null
          name: string
          price?: number
          qty?: number
          restock?: boolean | null
          return_id: string
        }
        Update: {
          id?: string
          inventory_item_id?: string | null
          name?: string
          price?: number
          qty?: number
          restock?: boolean | null
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string
          id: string
          processed_by: string | null
          reason: string | null
          refund_amount: number
          refund_method: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number
          refund_method?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transaction_items: {
        Row: {
          discount: number | null
          id: string
          inventory_item_id: string | null
          name: string
          price: number
          qty: number
          sku: string | null
          total: number
          transaction_id: string
        }
        Insert: {
          discount?: number | null
          id?: string
          inventory_item_id?: string | null
          name: string
          price?: number
          qty?: number
          sku?: string | null
          total?: number
          transaction_id: string
        }
        Update: {
          discount?: number | null
          id?: string
          inventory_item_id?: string | null
          name?: string
          price?: number
          qty?: number
          sku?: string | null
          total?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transaction_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          amount_tendered: number | null
          cashier_id: string | null
          change_given: number | null
          company_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          discount_percent: number | null
          id: string
          notes: string | null
          payment_method: string
          receipt_number: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          store_id: string | null
          subtotal: number
          tax: number
          total: number
          transaction_number: string
        }
        Insert: {
          amount_tendered?: number | null
          cashier_id?: string | null
          change_given?: number | null
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          store_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          transaction_number: string
        }
        Update: {
          amount_tendered?: number | null
          cashier_id?: string | null
          change_given?: number | null
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          store_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          transaction_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          columns: string[] | null
          company_id: string | null
          created_at: string
          created_by: string | null
          filters: Json | null
          id: string
          is_favorite: boolean | null
          last_generated_at: string | null
          name: string
          schedule: string | null
          type: string
          updated_at: string
        }
        Insert: {
          columns?: string[] | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          is_favorite?: boolean | null
          last_generated_at?: string | null
          name: string
          schedule?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          columns?: string[] | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          is_favorite?: boolean | null
          last_generated_at?: string | null
          name?: string
          schedule?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          created_at: string
          id: string
          inventory_item_id: string
          qty_after: number
          qty_before: number
          qty_change: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          created_at?: string
          id?: string
          inventory_item_id: string
          qty_after: number
          qty_before: number
          qty_change: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          qty_after?: number
          qty_before?: number
          qty_change?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          inventory_item_id: string | null
          name: string
          qty: number
          sku: string | null
          transfer_id: string
        }
        Insert: {
          id?: string
          inventory_item_id?: string | null
          name: string
          qty?: number
          sku?: string | null
          transfer_id: string
        }
        Update: {
          id?: string
          inventory_item_id?: string | null
          name?: string
          qty?: number
          sku?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          eta: string | null
          from_warehouse_id: string | null
          id: string
          notes: string | null
          requester: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_warehouse_id: string | null
          transfer_number: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          eta?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          requester?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_warehouse_id?: string | null
          transfer_number: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          eta?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          requester?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_warehouse_id?: string | null
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["store_status"]
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_store_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          categories: string[] | null
          company_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          on_time_rate: number | null
          phone: string | null
          rating: number | null
          status: Database["public"]["Enums"]["supplier_status"]
          total_orders: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          on_time_rate?: number | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["supplier_status"]
          total_orders?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          on_time_rate?: number | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["supplier_status"]
          total_orders?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_store_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_warehouse_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warehouse_assignments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          capacity: number | null
          company_id: string | null
          created_at: string
          id: string
          location: string | null
          manager_id: string | null
          name: string
          sqft: string | null
          status: Database["public"]["Enums"]["warehouse_status"]
          updated_at: string
          zones: number | null
        }
        Insert: {
          capacity?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          sqft?: string | null
          status?: Database["public"]["Enums"]["warehouse_status"]
          updated_at?: string
          zones?: number | null
        }
        Update: {
          capacity?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          sqft?: string | null
          status?: Database["public"]["Enums"]["warehouse_status"]
          updated_at?: string
          zones?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_warehouse_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_history: {
        Row: {
          acted_by: string | null
          action: string
          created_at: string
          id: string
          notes: string | null
          step_index: number
          step_name: string
          workflow_id: string
        }
        Insert: {
          acted_by?: string | null
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          step_index: number
          step_name: string
          workflow_id: string
        }
        Update: {
          acted_by?: string | null
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          step_index?: number
          step_name?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_history_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          auto_trigger: boolean | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          steps: Json
          trigger_conditions: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          auto_trigger?: boolean | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          steps?: Json
          trigger_conditions?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          auto_trigger?: boolean | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          steps?: Json
          trigger_conditions?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          assigned_role: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step: number | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          steps: Json | null
          template_id: string | null
          title: string
          trigger_type: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          steps?: Json | null
          template_id?: string | null
          title: string
          trigger_type?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: number | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          steps?: Json | null
          template_id?: string | null
          title?: string
          trigger_type?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_assigned_role_fkey"
            columns: ["assigned_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve_step: {
        Args: { _approval_id: string; _user_id: string }
        Returns: boolean
      }
      generate_po_number: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      generate_transfer_number: { Args: never; Returns: string }
      generate_txn_number: { Args: never; Returns: string }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_user_stores: {
        Args: { _user_id: string }
        Returns: {
          address: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["store_status"]
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "stores"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_warehouses: {
        Args: { _user_id: string }
        Returns: {
          capacity: number | null
          company_id: string | null
          created_at: string
          id: string
          location: string | null
          manager_id: string | null
          name: string
          sqft: string | null
          status: Database["public"]["Enums"]["warehouse_status"]
          updated_at: string
          zones: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "warehouses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _detail?: string
          _metadata?: Json
          _module: string
          _severity?: Database["public"]["Enums"]["audit_severity"]
          _target?: string
        }
        Returns: string
      }
      promote_to_super_admin: { Args: { _user_id: string }; Returns: undefined }
      send_notification: {
        Args: {
          _link?: string
          _message?: string
          _metadata?: Json
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
      send_role_notification: {
        Args: {
          _created_by?: string
          _link?: string
          _message?: string
          _target_roles: string[]
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "sales_rep"
        | "warehouse_staff"
        | "viewer"
      approval_priority: "low" | "medium" | "high" | "urgent"
      approval_status: "pending" | "approved" | "rejected"
      audit_severity: "info" | "warning" | "critical"
      category_status: "approved" | "pending" | "rejected"
      category_type: "inventory" | "expense" | "general"
      chat_channel_type: "channel" | "dm" | "group"
      document_type:
        | "pdf"
        | "xlsx"
        | "docx"
        | "png"
        | "jpg"
        | "folder"
        | "txt"
        | "csv"
        | "zip"
      integration_category: "payment" | "communication" | "accounting" | "other"
      inventory_status: "critical" | "low" | "ok"
      invoice_status: "draft" | "sent" | "paid" | "cancelled"
      invoice_type: "quote" | "invoice"
      notification_type:
        | "approval"
        | "inventory"
        | "workflow"
        | "chat"
        | "system"
        | "sales"
        | "supply"
        | "document"
        | "security"
      order_status: "pending" | "approved" | "rejected" | "cancelled"
      po_status:
        | "draft"
        | "submitted"
        | "approved"
        | "shipped"
        | "received"
        | "cancelled"
      report_type:
        | "overview"
        | "sales"
        | "inventory"
        | "gainloss"
        | "eod"
        | "operations"
      store_status: "active" | "maintenance" | "closed"
      supplier_status: "active" | "inactive" | "blacklisted"
      transaction_status: "completed" | "refunded" | "pending"
      transfer_status: "pending" | "in_transit" | "delivered" | "cancelled"
      user_status: "active" | "inactive" | "suspended"
      warehouse_status: "operational" | "maintenance"
      workflow_status: "active" | "completed" | "paused" | "cancelled"
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "sales_rep",
        "warehouse_staff",
        "viewer",
      ],
      approval_priority: ["low", "medium", "high", "urgent"],
      approval_status: ["pending", "approved", "rejected"],
      audit_severity: ["info", "warning", "critical"],
      category_status: ["approved", "pending", "rejected"],
      category_type: ["inventory", "expense", "general"],
      chat_channel_type: ["channel", "dm", "group"],
      document_type: [
        "pdf",
        "xlsx",
        "docx",
        "png",
        "jpg",
        "folder",
        "txt",
        "csv",
        "zip",
      ],
      integration_category: ["payment", "communication", "accounting", "other"],
      inventory_status: ["critical", "low", "ok"],
      invoice_status: ["draft", "sent", "paid", "cancelled"],
      invoice_type: ["quote", "invoice"],
      notification_type: [
        "approval",
        "inventory",
        "workflow",
        "chat",
        "system",
        "sales",
        "supply",
        "document",
        "security",
      ],
      order_status: ["pending", "approved", "rejected", "cancelled"],
      po_status: [
        "draft",
        "submitted",
        "approved",
        "shipped",
        "received",
        "cancelled",
      ],
      report_type: [
        "overview",
        "sales",
        "inventory",
        "gainloss",
        "eod",
        "operations",
      ],
      store_status: ["active", "maintenance", "closed"],
      supplier_status: ["active", "inactive", "blacklisted"],
      transaction_status: ["completed", "refunded", "pending"],
      transfer_status: ["pending", "in_transit", "delivered", "cancelled"],
      user_status: ["active", "inactive", "suspended"],
      warehouse_status: ["operational", "maintenance"],
      workflow_status: ["active", "completed", "paused", "cancelled"],
    },
  },
} as const
