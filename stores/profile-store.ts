import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
  photo_score: number;
  created_at: string;
  updated_at: string;
}

interface ProfileStore {
  profile: Profile | null;
  loading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
  incrementPhotoScore: (userId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  loading: false,
  
  fetchProfile: async (userId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      set({ profile: data });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      set({ profile: data });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  },

  incrementPhotoScore: async (userId: string) => {
    try {
      const currentProfile = get().profile;
      if (!currentProfile) return;

      const newScore = currentProfile.photo_score + 1;
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          photo_score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error incrementing snap score:', error);
        return;
      }

      set({ profile: data });
    } catch (error) {
      console.error('Error incrementing snap score:', error);
    }
  },
}));