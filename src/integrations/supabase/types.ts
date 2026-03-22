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
      announcements: {
        Row: {
          author_id: string
          author_name: string | null
          community_id: string | null
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          community_id?: string | null
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          community_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          area: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          id: string
          latitude: number | null
          longitude: number | null
          member_count: number | null
          moderator_id: string
          name: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_count?: number | null
          moderator_id?: string
          name: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_count?: number | null
          moderator_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_requests: {
        Row: {
          additional_notes: string | null
          area: string
          city: string
          created_at: string
          id: string
          name: string
          request_count: number
          requested_by: string
        }
        Insert: {
          additional_notes?: string | null
          area: string
          city: string
          created_at?: string
          id?: string
          name: string
          request_count?: number
          requested_by: string
        }
        Update: {
          additional_notes?: string | null
          area?: string
          city?: string
          created_at?: string
          id?: string
          name?: string
          request_count?: number
          requested_by?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_name: string | null
          community_id: string | null
          content: string
          created_at: string | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          removed: boolean | null
          type: string | null
          user_id: string
        }
        Insert: {
          author_name?: string | null
          community_id?: string | null
          content: string
          created_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          removed?: boolean | null
          type?: string | null
          user_id: string
        }
        Update: {
          author_name?: string | null
          community_id?: string | null
          content?: string
          created_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          removed?: boolean | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checked_in_at: string
          id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          context_id: string
          context_type: string
          created_at: string | null
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          context_id: string
          context_type: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          context_id?: string
          context_type?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          contact_name: string
          created_at: string
          email: string | null
          id: string
          phone: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          phone: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string | null
          display_name: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendee_count: number | null
          community_id: string | null
          created_at: string | null
          description: string | null
          event_date: string
          event_time: string | null
          host_id: string
          host_name: string | null
          id: string
          link: string | null
          location: string | null
          removed: boolean | null
          title: string
        }
        Insert: {
          attendee_count?: number | null
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          host_id: string
          host_name?: string | null
          id?: string
          link?: string | null
          location?: string | null
          removed?: boolean | null
          title: string
        }
        Update: {
          attendee_count?: number | null
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          host_id?: string
          host_name?: string | null
          id?: string
          link?: string | null
          location?: string | null
          removed?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      family_connections: {
        Row: {
          created_at: string
          family_user_id: string
          id: string
          senior_user_id: string
        }
        Insert: {
          created_at?: string
          family_user_id: string
          id?: string
          senior_user_id: string
        }
        Update: {
          created_at?: string
          family_user_id?: string
          id?: string
          senior_user_id?: string
        }
        Relationships: []
      }
      help_requests: {
        Row: {
          assigned_volunteer_id: string | null
          assigned_volunteer_name: string | null
          author_name: string | null
          category: string
          community_id: string | null
          created_at: string | null
          description: string
          id: string
          location: string | null
          on_behalf_of_name: string | null
          status: string
          updated_at: string | null
          urgency: string
          user_id: string
        }
        Insert: {
          assigned_volunteer_id?: string | null
          assigned_volunteer_name?: string | null
          author_name?: string | null
          category?: string
          community_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          location?: string | null
          on_behalf_of_name?: string | null
          status?: string
          updated_at?: string | null
          urgency?: string
          user_id: string
        }
        Update: {
          assigned_volunteer_id?: string | null
          assigned_volunteer_name?: string | null
          author_name?: string | null
          category?: string
          community_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          location?: string | null
          on_behalf_of_name?: string | null
          status?: string
          updated_at?: string | null
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      help_volunteers: {
        Row: {
          created_at: string | null
          display_name: string | null
          help_request_id: string
          id: string
          skills: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          help_request_id: string
          id?: string
          skills?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          help_request_id?: string
          id?: string
          skills?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_volunteers_help_request_id_fkey"
            columns: ["help_request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_family_view: boolean | null
          avatar_url: string | null
          community: string | null
          community_id: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_family_view?: boolean | null
          avatar_url?: string | null
          community?: string | null
          community_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_family_view?: boolean | null
          avatar_url?: string | null
          community?: string | null
          community_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_comments: {
        Row: {
          content: string
          created_at: string | null
          display_name: string | null
          id: string
          skill_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          skill_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_comments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_learners: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          skill_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          skill_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_learners_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          community_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_online: boolean | null
          learner_count: number | null
          link: string | null
          location: string | null
          removed: boolean | null
          teacher_name: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_online?: boolean | null
          learner_count?: number | null
          link?: string | null
          location?: string | null
          removed?: boolean | null
          teacher_name?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_online?: boolean | null
          learner_count?: number | null
          link?: string | null
          location?: string | null
          removed?: boolean | null
          teacher_name?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
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
      admin_delete_community: {
        Args: {
          _community_id: string
        }
        Returns: {
          deleted_community_id: string
          deleted_community_name: string
          retired_moderator_email: string | null
        }[]
      }
      admin_create_moderator_for_community: {
        Args: {
          _community_id: string
          _email?: string
          _password?: string
        }
        Returns: {
          moderator_email: string
          moderator_user_id: string
        }[]
      }
      admin_replace_community_moderator: {
        Args: {
          _community_id: string
          _password?: string
        }
        Returns: {
          moderator_email: string
          moderator_user_id: string
        }[]
      }
      approve_community_request: {
        Args: {
          _request_id: string
        }
        Returns: {
          community_id: string
          moderator_email: string
          moderator_user_id: string
        }[]
      }
      get_admin_community_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          area: string | null
          city: string | null
          id: string
          member_count: number
          moderator_email: string | null
          moderator_id: string
          name: string
        }[]
      }
      get_admin_community_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          area: string
          city: string
          created_at: string
          id: string
          name: string
          request_count: number
        }[]
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          pending_requests: number
          total_communities: number
          total_users: number
        }[]
      }
      get_moderator_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          community_id: string | null
          community_name: string | null
          display_name: string | null
          email: string
          user_id: string
        }[]
      }
      get_senior_call_contacts: {
        Args: {
          _senior_user_id: string
        }
        Returns: {
          id: string
          contact_name: string
          phone: string
          relationship: string | null
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reassign_community_moderator: {
        Args: {
          _community_id: string
          _moderator_user_id: string
        }
        Returns: undefined
      }
      reject_community_request: {
        Args: {
          _request_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "senior" | "family_member" | "moderator" | "admin"
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
      app_role: ["senior", "family_member", "moderator", "admin"],
    },
  },
} as const
