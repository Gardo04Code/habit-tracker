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
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          lifecycle_status: Database["public"]["Enums"]["category_lifecycle_status"]
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["category_lifecycle_status"]
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["category_lifecycle_status"]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          description: string | null
          end_date: string
          goal_lifecycle_status: Database["public"]["Enums"]["goal_lifecycle_status"]
          habit_id: string | null
          id: string
          progress_source: Database["public"]["Enums"]["goal_progress_source"]
          start_date: string
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number
          title: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          description?: string | null
          end_date: string
          goal_lifecycle_status?: Database["public"]["Enums"]["goal_lifecycle_status"]
          habit_id?: string | null
          id?: string
          progress_source: Database["public"]["Enums"]["goal_progress_source"]
          start_date: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value: number
          title: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string | null
          end_date?: string
          goal_lifecycle_status?: Database["public"]["Enums"]["goal_lifecycle_status"]
          habit_id?: string | null
          id?: string
          progress_source?: Database["public"]["Enums"]["goal_progress_source"]
          start_date?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_categories: {
        Row: {
          category_id: string
          habit_id: string
        }
        Insert: {
          category_id: string
          habit_id: string
        }
        Update: {
          category_id?: string
          habit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_categories_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          deadline_time_snapshot: string | null
          goal_type_snapshot: Database["public"]["Enums"]["goal_type"]
          habit_id: string
          id: string
          note: string | null
          recorded_time: string | null
          status: Database["public"]["Enums"]["habit_status"]
          target_unit_snapshot: string | null
          target_value_snapshot: number | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          date: string
          deadline_time_snapshot?: string | null
          goal_type_snapshot: Database["public"]["Enums"]["goal_type"]
          habit_id: string
          id?: string
          note?: string | null
          recorded_time?: string | null
          status?: Database["public"]["Enums"]["habit_status"]
          target_unit_snapshot?: string | null
          target_value_snapshot?: number | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          deadline_time_snapshot?: string | null
          goal_type_snapshot?: Database["public"]["Enums"]["goal_type"]
          habit_id?: string
          id?: string
          note?: string | null
          recorded_time?: string | null
          status?: Database["public"]["Enums"]["habit_status"]
          target_unit_snapshot?: string | null
          target_value_snapshot?: number | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_schedules: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          frequency_target: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          habit_id: string
          id: string
          interval_days: number | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          frequency_target?: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          habit_id: string
          id?: string
          interval_days?: number | null
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          frequency_target?: number | null
          frequency_type?: Database["public"]["Enums"]["frequency_type"]
          habit_id?: string
          id?: string
          interval_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_schedules_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          allow_partial: boolean
          color: string
          created_at: string
          deadline_time: string | null
          description: string | null
          end_date: string | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          icon: string
          id: string
          lifecycle_status: Database["public"]["Enums"]["habit_lifecycle_status"]
          name: string
          start_date: string
          target_unit: string | null
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_partial?: boolean
          color: string
          created_at?: string
          deadline_time?: string | null
          description?: string | null
          end_date?: string | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          icon: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["habit_lifecycle_status"]
          name: string
          start_date: string
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_partial?: boolean
          color?: string
          created_at?: string
          deadline_time?: string | null
          description?: string | null
          end_date?: string | null
          goal_type?: Database["public"]["Enums"]["goal_type"]
          icon?: string
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["habit_lifecycle_status"]
          name?: string
          start_date?: string
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          language: string
          name: string
          notify_abandoned_habit: boolean
          notify_reminders: boolean
          notify_streak_at_risk: boolean
          notify_weekly_summary: boolean
          time_format: Database["public"]["Enums"]["time_format"]
          timezone: string
          updated_at: string
          week_starts_on: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          language?: string
          name?: string
          notify_abandoned_habit?: boolean
          notify_reminders?: boolean
          notify_streak_at_risk?: boolean
          notify_weekly_summary?: boolean
          time_format?: Database["public"]["Enums"]["time_format"]
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          language?: string
          name?: string
          notify_abandoned_habit?: boolean
          notify_reminders?: boolean
          notify_streak_at_risk?: boolean
          notify_weekly_summary?: boolean
          time_format?: Database["public"]["Enums"]["time_format"]
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_habit_schedule: {
        Args: {
          p_days_of_week: number[]
          p_effective_date: string
          p_frequency_target: number
          p_frequency_type: Database["public"]["Enums"]["frequency_type"]
          p_habit_id: string
          p_interval_days: number
        }
        Returns: {
          created_at: string
          days_of_week: number[] | null
          frequency_target: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          habit_id: string
          id: string
          interval_days: number | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        SetofOptions: {
          from: "*"
          to: "habit_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_goal_habit_logs_progress: {
        Args: { p_end_date: string; p_habit_id: string; p_start_date: string }
        Returns: number
      }
      create_habit_schedule: {
        Args: {
          p_days_of_week: number[]
          p_frequency_target: number
          p_frequency_type: Database["public"]["Enums"]["frequency_type"]
          p_habit_id: string
          p_interval_days: number
        }
        Returns: {
          created_at: string
          days_of_week: number[] | null
          frequency_target: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          habit_id: string
          id: string
          interval_days: number | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        SetofOptions: {
          from: "*"
          to: "habit_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      days_of_week_is_valid: { Args: { days: number[] }; Returns: boolean }
      get_habit_local_date: { Args: { p_habit_id: string }; Returns: string }
      recalculate_goal_current_value: {
        Args: { p_goal_id: string }
        Returns: undefined
      }
    }
    Enums: {
      category_lifecycle_status: "active" | "deleted"
      frequency_type:
        | "daily"
        | "specific_days"
        | "times_per_week"
        | "times_per_month"
        | "one_time"
        | "custom_interval"
      goal_lifecycle_status: "active" | "paused" | "deleted"
      goal_progress_source: "habit_logs" | "calculated" | "manual"
      goal_status: "active" | "completed" | "expired"
      goal_type:
        | "boolean"
        | "quantity"
        | "duration"
        | "repetitions"
        | "deadline"
        | "accumulated_days"
      habit_lifecycle_status: "active" | "paused" | "archived" | "deleted"
      habit_status:
        | "pending"
        | "completed"
        | "partial"
        | "not_completed"
        | "not_applicable"
      time_format: "12h" | "24h"
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
      category_lifecycle_status: ["active", "deleted"],
      frequency_type: [
        "daily",
        "specific_days",
        "times_per_week",
        "times_per_month",
        "one_time",
        "custom_interval",
      ],
      goal_lifecycle_status: ["active", "paused", "deleted"],
      goal_progress_source: ["habit_logs", "calculated", "manual"],
      goal_status: ["active", "completed", "expired"],
      goal_type: [
        "boolean",
        "quantity",
        "duration",
        "repetitions",
        "deadline",
        "accumulated_days",
      ],
      habit_lifecycle_status: ["active", "paused", "archived", "deleted"],
      habit_status: [
        "pending",
        "completed",
        "partial",
        "not_completed",
        "not_applicable",
      ],
      time_format: ["12h", "24h"],
    },
  },
} as const

