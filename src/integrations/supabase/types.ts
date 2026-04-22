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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          journey_item_id: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          journey_item_id?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          journey_item_id?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          context_type: string
          created_at: string
          id: string
          initiative_id: string | null
          journey_id: string | null
          metadata: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          journey_id?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          journey_id?: string | null
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          structured_output: Json | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
          structured_output?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          structured_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_change_log: {
        Row: {
          after_state: Json | null
          approved_by: string | null
          before_state: Json | null
          change_type: string
          created_at: string
          id: string
          journey_id: string | null
          journey_item_id: string | null
          rationale: string | null
          recommendation_id: string | null
          rolled_back_at: string | null
        }
        Insert: {
          after_state?: Json | null
          approved_by?: string | null
          before_state?: Json | null
          change_type: string
          created_at?: string
          id?: string
          journey_id?: string | null
          journey_item_id?: string | null
          rationale?: string | null
          recommendation_id?: string | null
          rolled_back_at?: string | null
        }
        Update: {
          after_state?: Json | null
          approved_by?: string | null
          before_state?: Json | null
          change_type?: string
          created_at?: string
          id?: string
          journey_id?: string | null
          journey_item_id?: string | null
          rationale?: string | null
          recommendation_id?: string | null
          rolled_back_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_change_log_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_change_log_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_change_log_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_change_log_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean | null
          created_at: string
          customer_id: string | null
          date: string | null
          id: string
          message: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          customer_id?: string | null
          date?: string | null
          id?: string
          message?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          customer_id?: string | null
          date?: string | null
          id?: string
          message?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          journey_id: string
          status: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          journey_id: string
          status?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          journey_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          tier: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          tier?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          tier?: string | null
        }
        Relationships: []
      }
      behavioural_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          initiative_id: string | null
          journey_id: string | null
          journey_item_id: string | null
          occurred_at: string
          payload: Json
          pillar: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          initiative_id?: string | null
          journey_id?: string | null
          journey_item_id?: string | null
          occurred_at?: string
          payload?: Json
          pillar: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          initiative_id?: string | null
          journey_id?: string | null
          journey_item_id?: string | null
          occurred_at?: string
          payload?: Json
          pillar?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "behavioural_events_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioural_events_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioural_events_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioural_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioural_flags: {
        Row: {
          active: boolean
          details: Json
          flag_type: string
          id: string
          initiative_id: string | null
          pillar: string | null
          raised_at: string
          resolved_at: string | null
          severity: string
          user_id: string
        }
        Insert: {
          active?: boolean
          details?: Json
          flag_type: string
          id?: string
          initiative_id?: string | null
          pillar?: string | null
          raised_at?: string
          resolved_at?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          active?: boolean
          details?: Json
          flag_type?: string
          id?: string
          initiative_id?: string | null
          pillar?: string | null
          raised_at?: string
          resolved_at?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioural_flags_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioural_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content_body: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          initiative_id: string | null
          publish_date: string | null
          status: string
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content_body?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          initiative_id?: string | null
          publish_date?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content_body?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          initiative_id?: string | null
          publish_date?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          color_accent: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          rolling_window_days: number | null
          slogan: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          color_accent?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          rolling_window_days?: number | null
          slogan?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          color_accent?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          rolling_window_days?: number | null
          slogan?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      form_questions: {
        Row: {
          created_at: string
          extraction_confidence: number | null
          help_text: string | null
          id: string
          label: string
          mandatory: boolean
          needs_review: boolean
          options: Json | null
          order_index: number
          required: boolean
          scale: Json | null
          score_dimension: string | null
          scored: boolean
          section_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extraction_confidence?: number | null
          help_text?: string | null
          id?: string
          label?: string
          mandatory?: boolean
          needs_review?: boolean
          options?: Json | null
          order_index?: number
          required?: boolean
          scale?: Json | null
          score_dimension?: string | null
          scored?: boolean
          section_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extraction_confidence?: number | null
          help_text?: string | null
          id?: string
          label?: string
          mandatory?: boolean
          needs_review?: boolean
          options?: Json | null
          order_index?: number
          required?: boolean
          scale?: Json | null
          score_dimension?: string | null
          scored?: boolean
          section_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "form_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      form_sections: {
        Row: {
          created_at: string
          description: string | null
          form_id: string
          id: string
          order_index: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_id: string
          id?: string
          order_index?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          form_id?: string
          id?: string
          order_index?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_sections_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          activity_type: string | null
          completion_message: string | null
          content_item_id: string | null
          created_at: string
          created_by: string | null
          extraction_confidence: number | null
          focus: string | null
          id: string
          journey_item_id: string | null
          phase: string | null
          purpose: string | null
          source_document_name: string | null
          status: string
          title: string
          updated_at: string
          user_instruction: string | null
        }
        Insert: {
          activity_type?: string | null
          completion_message?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          extraction_confidence?: number | null
          focus?: string | null
          id?: string
          journey_item_id?: string | null
          phase?: string | null
          purpose?: string | null
          source_document_name?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_instruction?: string | null
        }
        Update: {
          activity_type?: string | null
          completion_message?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          extraction_confidence?: number | null
          focus?: string | null
          id?: string
          journey_item_id?: string | null
          phase?: string | null
          purpose?: string | null
          source_document_name?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_instruction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          phase: string
          progress: number | null
          start_date: string | null
          status: string
          updated_at: string
          user_count: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          phase?: string
          progress?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_count?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          phase?: string
          progress?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_records: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          inferred_dimension: string | null
          inferred_issue: string | null
          initiative_id: string | null
          insight_type: string
          is_sample: boolean | null
          journey_id: string | null
          journey_item_id: string | null
          milestone_id: string | null
          persona: string | null
          severity: string
          source_type: string
          status: string
          suggested_intervention: string | null
          summary: string
          supporting_evidence_summary: string | null
          team: string | null
          topic: string | null
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          inferred_dimension?: string | null
          inferred_issue?: string | null
          initiative_id?: string | null
          insight_type: string
          is_sample?: boolean | null
          journey_id?: string | null
          journey_item_id?: string | null
          milestone_id?: string | null
          persona?: string | null
          severity?: string
          source_type?: string
          status?: string
          suggested_intervention?: string | null
          summary: string
          supporting_evidence_summary?: string | null
          team?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          inferred_dimension?: string | null
          inferred_issue?: string | null
          initiative_id?: string | null
          insight_type?: string
          is_sample?: boolean | null
          journey_id?: string | null
          journey_item_id?: string | null
          milestone_id?: string | null
          persona?: string | null
          severity?: string
          source_type?: string
          status?: string
          suggested_intervention?: string | null
          summary?: string
          supporting_evidence_summary?: string | null
          team?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_records_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_records_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_records_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_records_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_items: {
        Row: {
          completed_date: string | null
          content_item_id: string | null
          contributes_to: string[] | null
          created_at: string
          description: string | null
          due_date: string | null
          duration: string | null
          execution_mode: string
          id: string
          journey_id: string
          mandatory: boolean | null
          order_index: number | null
          phase_id: string | null
          predecessor_id: string | null
          reminder_enabled: boolean | null
          status: string
          title: string
          type: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          completed_date?: string | null
          content_item_id?: string | null
          contributes_to?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration?: string | null
          execution_mode?: string
          id?: string
          journey_id: string
          mandatory?: boolean | null
          order_index?: number | null
          phase_id?: string | null
          predecessor_id?: string | null
          reminder_enabled?: boolean | null
          status?: string
          title: string
          type: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          completed_date?: string | null
          content_item_id?: string | null
          contributes_to?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration?: string | null
          execution_mode?: string
          id?: string
          journey_id?: string
          mandatory?: boolean | null
          order_index?: number | null
          phase_id?: string | null
          predecessor_id?: string | null
          reminder_enabled?: boolean | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_items_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_items_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_items_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_phases: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          journey_id: string
          name: string
          order_index: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          journey_id: string
          name: string
          order_index?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          journey_id?: string
          name?: string
          order_index?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_phases_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          initiative_id: string | null
          milestone_id: string | null
          name: string
          parent_journey_id: string | null
          phase_id: string | null
          progress: number | null
          status: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          initiative_id?: string | null
          milestone_id?: string | null
          name: string
          parent_journey_id?: string | null
          phase_id?: string | null
          progress?: number | null
          status?: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          initiative_id?: string | null
          milestone_id?: string | null
          name?: string
          parent_journey_id?: string | null
          phase_id?: string | null
          progress?: number | null
          status?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journeys_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journeys_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journeys_parent_journey_id_fkey"
            columns: ["parent_journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journeys_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          initiative_id: string
          name: string
          progress: number | null
          start_date: string | null
          status: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          initiative_id: string
          name: string
          progress?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          initiative_id?: string
          name?: string
          progress?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          id: string
          journey_item_id: string | null
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_item_id?: string | null
          points: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_item_id?: string | null
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          customer_id: string | null
          display_name: string
          email: string
          id: string
          persona: string | null
          points: number | null
          role: Database["public"]["Enums"]["app_role"]
          streak: number | null
          team: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          customer_id?: string | null
          display_name: string
          email: string
          id?: string
          persona?: string | null
          points?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          streak?: number | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string
          email?: string
          id?: string
          persona?: string | null
          points?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          streak?: number | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          template_key: string
          template_text: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          template_key: string
          template_text?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          template_key?: string
          template_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_records: {
        Row: {
          applied_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          expected_impact: string | null
          id: string
          impacted_items: string[] | null
          impacted_personas: string[] | null
          initiative_id: string | null
          is_sample: boolean | null
          journey_id: string | null
          linked_insight_ids: string[] | null
          milestone_id: string | null
          priority: number | null
          proposed_change_json: Json | null
          rationale: string | null
          recommendation_type: string
          review_status: string
          severity: string
          title: string
        }
        Insert: {
          applied_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          expected_impact?: string | null
          id?: string
          impacted_items?: string[] | null
          impacted_personas?: string[] | null
          initiative_id?: string | null
          is_sample?: boolean | null
          journey_id?: string | null
          linked_insight_ids?: string[] | null
          milestone_id?: string | null
          priority?: number | null
          proposed_change_json?: Json | null
          rationale?: string | null
          recommendation_type: string
          review_status?: string
          severity?: string
          title: string
        }
        Update: {
          applied_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          expected_impact?: string | null
          id?: string
          impacted_items?: string[] | null
          impacted_personas?: string[] | null
          initiative_id?: string | null
          is_sample?: boolean | null
          journey_id?: string | null
          linked_insight_ids?: string[] | null
          milestone_id?: string | null
          priority?: number | null
          proposed_change_json?: Json | null
          rationale?: string | null
          recommendation_type?: string
          review_status?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_records_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_records_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_records_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          id: string
          journey_item_id: string | null
          responded_at: string | null
          sent_at: string
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          journey_item_id?: string | null
          responded_at?: string | null
          sent_at?: string
          type: string
          user_id: string
        }
        Update: {
          id?: string
          journey_item_id?: string | null
          responded_at?: string | null
          sent_at?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_journey_item_id_fkey"
            columns: ["journey_item_id"]
            isOneToOne: false
            referencedRelation: "journey_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          recommendation: string | null
          resolved: boolean | null
          severity: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          recommendation?: string | null
          resolved?: boolean | null
          severity: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          recommendation?: string | null
          resolved?: boolean | null
          severity?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          adoption: number | null
          adoption_dashboard: number | null
          adoption_ideal: number | null
          confidence: number | null
          id: string
          initiative_id: string | null
          ownership: number | null
          participation: number | null
          recorded_at: string
          time_progress: number | null
          user_id: string
          week_label: string | null
        }
        Insert: {
          adoption?: number | null
          adoption_dashboard?: number | null
          adoption_ideal?: number | null
          confidence?: number | null
          id?: string
          initiative_id?: string | null
          ownership?: number | null
          participation?: number | null
          recorded_at?: string
          time_progress?: number | null
          user_id: string
          week_label?: string | null
        }
        Update: {
          adoption?: number | null
          adoption_dashboard?: number | null
          adoption_ideal?: number | null
          confidence?: number | null
          id?: string
          initiative_id?: string | null
          ownership?: number | null
          participation?: number | null
          recorded_at?: string
          time_progress?: number | null
          user_id?: string
          week_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_history_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          adoption: number | null
          adoption_dashboard: number | null
          adoption_gap: number | null
          adoption_ideal: number | null
          adoption_score_100: number | null
          calculated_at: string
          confidence: number | null
          confidence_dashboard: number | null
          half_life_days: number | null
          id: string
          initiative_id: string | null
          ownership: number | null
          ownership_dashboard: number | null
          participation: number | null
          participation_dashboard: number | null
          phase_used: string | null
          rolling_window_days: number | null
          time_progress: number | null
          user_id: string
        }
        Insert: {
          adoption?: number | null
          adoption_dashboard?: number | null
          adoption_gap?: number | null
          adoption_ideal?: number | null
          adoption_score_100?: number | null
          calculated_at?: string
          confidence?: number | null
          confidence_dashboard?: number | null
          half_life_days?: number | null
          id?: string
          initiative_id?: string | null
          ownership?: number | null
          ownership_dashboard?: number | null
          participation?: number | null
          participation_dashboard?: number | null
          phase_used?: string | null
          rolling_window_days?: number | null
          time_progress?: number | null
          user_id: string
        }
        Update: {
          adoption?: number | null
          adoption_dashboard?: number | null
          adoption_gap?: number | null
          adoption_ideal?: number | null
          adoption_score_100?: number | null
          calculated_at?: string
          confidence?: number | null
          confidence_dashboard?: number | null
          half_life_days?: number | null
          id?: string
          initiative_id?: string | null
          ownership?: number | null
          ownership_dashboard?: number | null
          participation?: number | null
          participation_dashboard?: number | null
          phase_used?: string | null
          rolling_window_days?: number | null
          time_progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_config: {
        Row: {
          category: string
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          config_key: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_observations: {
        Row: {
          baseline_mean: number
          baseline_sd: number
          calculated_at: string
          event_count: number
          half_life_days: number
          id: string
          initiative_id: string | null
          observed_value: number
          pillar: string
          rolling_window_days: number
          scaled_value: number
          trait_key: string
          user_id: string
          weight: number
        }
        Insert: {
          baseline_mean: number
          baseline_sd: number
          calculated_at?: string
          event_count?: number
          half_life_days: number
          id?: string
          initiative_id?: string | null
          observed_value: number
          pillar: string
          rolling_window_days: number
          scaled_value: number
          trait_key: string
          user_id: string
          weight: number
        }
        Update: {
          baseline_mean?: number
          baseline_sd?: number
          calculated_at?: string
          event_count?: number
          half_life_days?: number
          id?: string
          initiative_id?: string | null
          observed_value?: number
          pillar?: string
          rolling_window_days?: number
          scaled_value?: number
          trait_key?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "trait_observations_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_observations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_capacity: {
        Row: {
          h_bau: number
          h_journey: number
          id: string
          updated_at: string
          user_id: string
          week_start: string
          weekly_limit: number
        }
        Insert: {
          h_bau?: number
          h_journey?: number
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
          weekly_limit?: number
        }
        Update: {
          h_bau?: number
          h_journey?: number
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_capacity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "change_manager" | "team_lead" | "end_user"
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
      app_role: ["super_admin", "change_manager", "team_lead", "end_user"],
    },
  },
} as const
