import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ypumvyhwtpscevoqgcat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdW12eWh3dHBzY2V2b3FnY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTAwNTYsImV4cCI6MjA3MzY4NjA1Nn0.oiKFbAhKLmdjZ72rPJ_ExeZLk6-b3CEyduUfSRZl9z8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          phone_number: string | null;
          is_online: boolean;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          is_online?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          is_online?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          message_type: 'text' | 'image' | 'snap' | 'audio';
          media_url: string | null;
          is_read: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'image' | 'snap' | 'audio';
          media_url?: string | null;
          is_read?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: 'text' | 'image' | 'snap' | 'audio';
          media_url?: string | null;
          is_read?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          last_message: string | null;
          last_message_time: string | null;
          last_message_type: 'text' | 'photo' | 'snap' | 'audio' | null;
          message_status: 'sent' | 'delivered' | 'opened' | null;
          status_timestamp: string | null;
          unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          last_message?: string | null;
          last_message_time?: string | null;
          last_message_type?: 'text' | 'photo' | 'snap' | 'audio' | null;
          message_status?: 'sent' | 'delivered' | 'opened' | null;
          status_timestamp?: string | null;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          last_message?: string | null;
          last_message_time?: string | null;
          last_message_type?: 'text' | 'photo' | 'snap' | 'audio' | null;
          message_status?: 'sent' | 'delivered' | 'opened' | null;
          status_timestamp?: string | null;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      friend_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
          updated_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          created_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          caller_id: string;
          receiver_id: string;
          call_type: 'voice' | 'video';
          status: 'calling' | 'answered' | 'declined' | 'ended' | 'missed';
          started_at: string;
          ended_at: string | null;
          duration: number | null;
        };
        Insert: {
          id?: string;
          caller_id: string;
          receiver_id: string;
          call_type: 'voice' | 'video';
          status?: 'calling' | 'answered' | 'declined' | 'ended' | 'missed';
          started_at?: string;
          ended_at?: string | null;
          duration?: number | null;
        };
        Update: {
          id?: string;
          caller_id?: string;
          receiver_id?: string;
          call_type?: 'voice' | 'video';
          status?: 'calling' | 'answered' | 'declined' | 'ended' | 'missed';
          started_at?: string;
          ended_at?: string | null;
          duration?: number | null;
        };
      };
    };
  };
};