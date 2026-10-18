/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          email: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          email?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      anonymous_usage: {
        Row: {
          anonymous_id: string
          updated_at: string
          words_used: number
        }
        Insert: {
          anonymous_id: string
          updated_at?: string
          words_used?: number
        }
        Update: {
          anonymous_id?: string
          updated_at?: string
          words_used?: number
        }
        Relationships: []
      }
      backend_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      blocked_clients: {
        Row: {
          created_at: string
          kind: string
          note: string
          value: string
        }
        Insert: {
          created_at?: string
          kind?: string
          note?: string
          value: string
        }
        Update: {
          created_at?: string
          kind?: string
          note?: string
          value?: string
        }
        Relationships: []
      }
      dictionary_dataset: {
        Row: {
          count: number
          file_name: string | null
          id: string
          note: string | null
          payload: Json | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          count?: number
          file_name?: string | null
          id: string
          note?: string | null
          payload?: Json | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Update: {
          count?: number
          file_name?: string | null
          id?: string
          note?: string | null
          payload?: Json | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: []
      }
      dictionary_imports: {
        Row: {
          created_at: string
          created_by: string
          file_name: string
          id: string
          kind: string
          note: string
          status: string
          total_rows: number
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          kind?: string
          note?: string
          status?: string
          total_rows?: number
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          kind?: string
          note?: string
          status?: string
          total_rows?: number
          version?: number
        }
        Relationships: []
      }
      feedback: {
        Row: {
          app_version: string | null
          content: string
          created_at: string
          device_info: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          content: string
          created_at?: string
          device_info?: string | null
          id?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          content?: string
          created_at?: string
          device_info?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gemini_usage_daily: {
        Row: {
          by_model: Json
          day: string
          errors: number
          output_tokens: number
          prompt_tokens: number
          requests: number
          updated_at: string
        }
        Insert: {
          by_model?: Json
          day: string
          errors?: number
          output_tokens?: number
          prompt_tokens?: number
          requests?: number
          updated_at?: string
        }
        Update: {
          by_model?: Json
          day?: string
          errors?: number
          output_tokens?: number
          prompt_tokens?: number
          requests?: number
          updated_at?: string
        }
        Relationships: []
      }
      moderation_action: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      portal_users: {
        Row: {
          created_at: string
          email: string
          name: string | null
          requested_at: string | null
          role: string
          user_id: string
          verification_reason: string
          verification_status: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email?: string
          name?: string | null
          requested_at?: string | null
          role?: string
          user_id: string
          verification_reason?: string
          verification_status?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          name?: string | null
          requested_at?: string | null
          role?: string
          user_id?: string
          verification_reason?: string
          verification_status?: string
          verified?: boolean
        }
        Relationships: []
      }
      shared_translations: {
        Row: {
          confidence: number
          created_at: string
          id: string
          model: string | null
          share_id: string
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          model?: string | null
          share_id: string
          source_language?: string
          source_text: string
          target_language?: string
          translated_text: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          model?: string | null
          share_id?: string
          source_language?: string
          source_text?: string
          target_language?: string
          translated_text?: string
        }
        Relationships: []
      }
      translation_history: {
        Row: {
          created_at: string
          file_name: string | null
          file_thumbnail: string | null
          id: string
          is_favorite: boolean
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
          translation_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_thumbnail?: string | null
          id?: string
          is_favorite?: boolean
          source_language?: string
          source_text: string
          target_language?: string
          translated_text: string
          translation_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_thumbnail?: string | null
          id?: string
          is_favorite?: boolean
          source_language?: string
          source_text?: string
          target_language?: string
          translated_text?: string
          translation_type?: string
          user_id?: string
        }
        Relationships: []
      }
      translation_logs: {
        Row: {
          confidence: number
          created_at: string
          id: string
          model: string | null
          source_text: string
          target_language: string
          translated_text: string
          user_id: string
          word_count: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          model?: string | null
          source_text: string
          target_language?: string
          translated_text: string
          user_id: string
          word_count?: number
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          model?: string | null
          source_text?: string
          target_language?: string
          translated_text?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          contributions_count: number
          points: number
          posts_count: number
          replies_count: number
          translations_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contributions_count?: number
          points?: number
          posts_count?: number
          replies_count?: number
          translations_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contributions_count?: number
          points?: number
          posts_count?: number
          replies_count?: number
          translations_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sync: {
        Row: {
          glossary: Json
          translations: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          glossary?: Json
          translations?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          glossary?: Json
          translations?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      word_contribution: {
        Row: {
          category: string | null
          created_at: string
          dialect_specific: string | null
          english: string
          example: string | null
          id: string
          moderator_id: string | null
          moderator_note: string | null
          part_of_speech: string | null
          pronunciation: string | null
          status: string
          updated_at: string
          user_id: string
          votes: number
          zomi: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dialect_specific?: string | null
          english: string
          example?: string | null
          id?: string
          moderator_id?: string | null
          moderator_note?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          status?: string
          updated_at?: string
          user_id: string
          votes?: number
          zomi: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dialect_specific?: string | null
          english?: string
          example?: string | null
          id?: string
          moderator_id?: string | null
          moderator_note?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          votes?: number
          zomi?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_audit_log: {
        Args: { p_admin_user_id: string; p_secret: string }
        Returns: Json
      }
      admin_block_client: {
        Args: {
          p_admin_user_id: string
          p_kind: string
          p_note: string
          p_secret: string
          p_value: string
        }
        Returns: undefined
      }
      admin_dictionary_history: {
        Args: { p_admin_user_id: string; p_secret: string }
        Returns: Json
      }
      admin_gemini_usage: {
        Args: { p_admin_user_id: string; p_days?: number; p_secret: string }
        Returns: Json
      }
      admin_log_dictionary_export: {
        Args: {
          p_admin_user_id: string
          p_count: number
          p_file_name: string
          p_format: string
          p_scope: string
          p_secret: string
        }
        Returns: undefined
      }
      admin_overview: {
        Args: { p_admin_user_id: string; p_secret: string }
        Returns: Json
      }
      admin_publish_dictionary: {
        Args: {
          p_admin_user_id: string
          p_entries: Json
          p_file_name: string
          p_kind: string
          p_note: string
          p_secret: string
        }
        Returns: Json
      }
      admin_set_role: {
        Args: {
          p_admin_user_id: string
          p_role: string
          p_secret: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_set_verification: {
        Args: {
          p_admin_user_id: string
          p_approve: boolean
          p_secret: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_unblock_client: {
        Args: { p_admin_user_id: string; p_secret: string; p_value: string }
        Returns: undefined
      }
      admin_users: {
        Args: { p_admin_user_id: string; p_secret: string }
        Returns: Json
      }
      bump_user_stats: {
        Args: {
          p_contributions: number
          p_points: number
          p_secret: string
          p_translations: number
          p_user_id: string
        }
        Returns: undefined
      }
      count_user_translations: {
        Args: { p_secret: string; p_user_id: string }
        Returns: number
      }
      create_share: {
        Args: {
          p_confidence: number
          p_model: string
          p_secret: string
          p_source_language: string
          p_source_text: string
          p_target_language: string
          p_translated_text: string
        }
        Returns: string
      }
      delete_user_data: {
        Args: { p_secret: string; p_user_id: string }
        Returns: undefined
      }
      ensure_portal_user: {
        Args: {
          p_email: string
          p_name: string
          p_secret: string
          p_user_id: string
        }
        Returns: Json
      }
      get_anonymous_words: {
        Args: { p_anonymous_id: string; p_secret: string }
        Returns: number
      }
      get_user_sync: {
        Args: { p_secret: string; p_user_id: string }
        Returns: Json
      }
      increment_anonymous_words: {
        Args: { p_anonymous_id: string; p_secret: string; p_words: number }
        Returns: number
      }
      list_blocked_clients: { Args: { p_secret: string }; Returns: Json }
      log_translation: {
        Args: {
          p_confidence: number
          p_email: string
          p_model: string
          p_name: string
          p_secret: string
          p_source_text: string
          p_target_language: string
          p_translated_text: string
          p_user_id: string
          p_word_count: number
        }
        Returns: undefined
      }
      record_gemini_usage: {
        Args: {
          p_by_model: Json
          p_day: string
          p_errors: number
          p_output_tokens: number
          p_prompt_tokens: number
          p_requests: number
          p_secret: string
        }
        Returns: undefined
      }
      request_verification: {
        Args: { p_reason: string; p_secret: string; p_user_id: string }
        Returns: Json
      }
      upsert_user_sync: {
        Args: {
          p_glossary: Json
          p_secret: string
          p_translations: Json
          p_user_id: string
        }
        Returns: Json
      }
      user_id: { Args: never; Returns: string }
      zomi_is_admin: { Args: { p_user_id: string }; Returns: boolean }
      zomi_verify: { Args: { p_secret: string }; Returns: undefined }
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
