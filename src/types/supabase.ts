export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          preferences: Json | null
          writing_goals: string[]
          improvement_tracking: Json | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json | null
          writing_goals?: string[]
          improvement_tracking?: Json | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json | null
          writing_goals?: string[]
          improvement_tracking?: Json | null
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          writing_goal: string
          word_count: number
          readability_score: number | null
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string
          writing_goal?: string
          word_count?: number
          readability_score?: number | null
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          writing_goal?: string
          word_count?: number
          readability_score?: number | null
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      suggestions: {
        Row: {
          id: string
          document_id: string
          user_id: string
          type: string
          text: string
          replacement: string
          explanation: string
          position_start: number
          position_end: number
          confidence: number
          accepted: boolean
          dismissed: boolean
          feedback: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          type: string
          text: string
          replacement: string
          explanation: string
          position_start: number
          position_end: number
          confidence?: number
          accepted?: boolean
          dismissed?: boolean
          feedback?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          type?: string
          text?: string
          replacement?: string
          explanation?: string
          position_start?: number
          position_end?: number
          confidence?: number
          accepted?: boolean
          dismissed?: boolean
          feedback?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      analysis_results: {
        Row: {
          id: string
          document_id: string
          user_id: string
          type: string
          results: Json
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          type: string
          results: Json
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          type?: string
          results?: Json
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          document_id: string | null
          suggestion_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data: Json
          document_id?: string | null
          suggestion_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          document_id?: string | null
          suggestion_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_text: {
        Args: {
          content: string
          writing_goal: string
          user_preferences: Json
        }
        Returns: Json
      }
      get_user_analytics: {
        Args: {
          user_id: string
          start_date: string
          end_date: string
        }
        Returns: Json
      }
    }
    Enums: {
      writing_goal: 'personal-statement' | 'essay' | 'cover-letter' | 'email' | 'other'
      suggestion_type: 'grammar' | 'style' | 'vocabulary' | 'tone' | 'conciseness' | 'goal-alignment'
      document_status: 'draft' | 'reviewing' | 'complete' | 'archived'
      analysis_type: 'grammar' | 'tone' | 'readability' | 'style' | 'goal-alignment'
    }
  }
}

// Application-specific types
export interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
    autoSave: boolean
    suggestionFrequency: 'high' | 'medium' | 'low'
  }
  writingGoals: string[]
  improvementTracking: {
    grammarScore: number
    styleScore: number
    vocabularyScore: number
    overallProgress: number
    weeklyGoals: string[]
    achievements: string[]
  }
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  userId: string
  title: string
  content: string
  writingGoal: Database['public']['Enums']['writing_goal']
  wordCount: number
  readabilityScore?: number
  status: Database['public']['Enums']['document_status']
  metadata?: {
    wordLimit?: number
    targetAudience?: string
    dueDate?: string
    tags?: string[]
  }
  createdAt: string
  updatedAt: string
}

export interface Suggestion {
  id: string
  documentId: string
  userId: string
  type: Database['public']['Enums']['suggestion_type']
  text: string
  replacement: string
  explanation: string
  position: { start: number; end: number }
  confidence: number
  accepted: boolean
  dismissed: boolean
  feedback?: {
    helpful: boolean
    comments?: string
  }
  createdAt: string
  updatedAt: string
}

export interface AnalysisResult {
  id: string
  documentId: string
  userId: string
  type: Database['public']['Enums']['analysis_type']
  results: {
    score: number
    suggestions: Suggestion[]
    insights: string[]
    improvements: string[]
  }
  metadata?: {
    processingTime: number
    modelVersion: string
    confidence: number
  }
  createdAt: string
  updatedAt: string
}

export interface Analytics {
  id: string
  userId: string
  eventType: string
  eventData: {
    action: string
    context: Record<string, any>
    timestamp: string
  }
  documentId?: string
  suggestionId?: string
  createdAt: string
}

// Real-time subscription types
export interface RealtimePayload<T> {
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: T
  old?: T
  schema: string
  table: string
}

// API response types
export interface APIResponse<T> {
  data: T | null
  error: Error | null
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  totalPages: number
  hasMore: boolean
} 