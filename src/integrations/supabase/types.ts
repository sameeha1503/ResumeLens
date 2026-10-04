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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      candidates: {
        Row: {
          created_at: string
          error: string | null
          excluded_text: string | null
          extracted: Json | null
          extraction_confidence: number | null
          extraction_warnings: Json
          field_confidence: Json
          file_name: string
          file_path: string | null
          id: string
          job_id: string
          raw_text: string | null
          security_findings: Json
          skill_matches: Json | null
          status: string
          text_meta: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          excluded_text?: string | null
          extracted?: Json | null
          extraction_confidence?: number | null
          extraction_warnings?: Json
          field_confidence?: Json
          file_name: string
          file_path?: string | null
          id?: string
          job_id: string
          raw_text?: string | null
          security_findings?: Json
          skill_matches?: Json | null
          status?: string
          text_meta?: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          excluded_text?: string | null
          extracted?: Json | null
          extraction_confidence?: number | null
          extraction_warnings?: Json
          field_confidence?: Json
          file_name?: string
          file_path?: string | null
          id?: string
          job_id?: string
          raw_text?: string | null
          security_findings?: Json
          skill_matches?: Json | null
          status?: string
          text_meta?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      corrections: {
        Row: {
          candidate_id: string
          created_at: string
          field_path: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          field_path: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          field_path?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrections_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_labels: {
        Row: {
          candidate_id: string
          ground_truth_label: string | null
          id: string
          job_id: string
          planted_issues: Json
          user_id: string
        }
        Insert: {
          candidate_id: string
          ground_truth_label?: string | null
          id?: string
          job_id: string
          planted_issues?: Json
          user_id?: string
        }
        Update: {
          candidate_id?: string
          ground_truth_label?: string | null
          id?: string
          job_id?: string
          planted_issues?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eval_labels_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eval_labels_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          generated_at: string
          hash: string
          id: string
          job_id: string | null
          payload_snapshot: Json
          user_id: string
        }
        Insert: {
          generated_at?: string
          hash: string
          id?: string
          job_id?: string | null
          payload_snapshot: Json
          user_id?: string
        }
        Update: {
          generated_at?: string
          hash?: string
          id?: string
          job_id?: string | null
          payload_snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          blind_mode: boolean
          created_at: string
          description: string
          id: string
          is_demo: boolean
          jd_warnings: Json
          requirements: Json
          title: string
          user_id: string
          weights: Json
        }
        Insert: {
          blind_mode?: boolean
          created_at?: string
          description?: string
          id?: string
          is_demo?: boolean
          jd_warnings?: Json
          requirements?: Json
          title: string
          user_id?: string
          weights?: Json
        }
        Update: {
          blind_mode?: boolean
          created_at?: string
          description?: string
          id?: string
          is_demo?: boolean
          jd_warnings?: Json
          requirements?: Json
          title?: string
          user_id?: string
          weights?: Json
        }
        Relationships: []
      }
      scores: {
        Row: {
          candidate_id: string
          counterfactuals: Json | null
          created_at: string
          education_score: number | null
          evidence_score: number | null
          experience_score: number | null
          explanation: string | null
          flags: Json | null
          id: string
          interview_questions: Json | null
          score_high: number | null
          score_low: number | null
          skill_breakdown: Json | null
          skills_score: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          candidate_id: string
          counterfactuals?: Json | null
          created_at?: string
          education_score?: number | null
          evidence_score?: number | null
          experience_score?: number | null
          explanation?: string | null
          flags?: Json | null
          id?: string
          interview_questions?: Json | null
          score_high?: number | null
          score_low?: number | null
          skill_breakdown?: Json | null
          skills_score?: number | null
          total_score?: number | null
          user_id?: string
        }
        Update: {
          candidate_id?: string
          counterfactuals?: Json | null
          created_at?: string
          education_score?: number | null
          evidence_score?: number | null
          experience_score?: number | null
          explanation?: string | null
          flags?: Json | null
          id?: string
          interview_questions?: Json | null
          score_high?: number | null
          score_low?: number | null
          skill_breakdown?: Json | null
          skills_score?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_embeddings: {
        Row: {
          candidate_id: string | null
          embedding: string | null
          id: string
          job_id: string | null
          skill: string
          user_id: string
        }
        Insert: {
          candidate_id?: string | null
          embedding?: string | null
          id?: string
          job_id?: string | null
          skill: string
          user_id?: string
        }
        Update: {
          candidate_id?: string | null
          embedding?: string | null
          id?: string
          job_id?: string | null
          skill?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_embeddings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_embeddings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
