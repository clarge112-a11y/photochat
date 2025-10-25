import createContextHook from '@nkzw/create-context-hook';
import { User, Session } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { trpcClient } from '@/lib/trpc';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      return { error: { message: 'Email and password are required' } };
    }
    
    try {
      console.log('🔐 Attempting sign in for:', email.trim());
      console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          return { 
            error: { 
              message: 'Cannot connect to authentication server. Please check your internet connection and try again.' 
            } 
          };
        }
        
        return { error };
      }
      
      console.log('✅ Sign in successful:', data);
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign in exception:', error);
      
      if (error.name === 'AuthRetryableFetchError' || error.message?.includes('Failed to fetch')) {
        return { 
          error: { 
            message: 'Cannot connect to authentication server. Please verify:\n1. Your internet connection is active\n2. Supabase URL is correct\n3. No firewall is blocking the connection' 
          } 
        };
      }
      
      return { 
        error: { 
          message: error.message || 'An unexpected error occurred. Please try again.' 
        } 
      };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string, displayName: string) => {
    if (!email.trim() || !password.trim() || !username.trim() || !displayName.trim()) {
      return { error: { message: 'All fields are required' } };
    }
    if (username.length > 50 || displayName.length > 100) {
      return { error: { message: 'Username or display name too long' } };
    }
    
    try {
      // Use the backend tRPC route to handle user creation
      const result = await trpcClient.auth.signup.mutate({
        email: email.trim(),
        password,
        username: username.trim(),
        displayName: displayName.trim(),
      });
      
      if (result.success) {
        // Now sign in the user to establish the session
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (signInError) {
          console.error('Sign in after signup failed:', signInError);
          return { error: { message: 'Account created but sign in failed. Please try signing in manually.' } };
        }
        
        return { error: null };
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      return { error: { message: error.message || 'Failed to create account' } };
    }
    
    return { error: { message: 'Unknown error occurred' } };
  }, []);

  const signOut = useCallback(async () => {
    console.log('Auth context: Starting sign out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Auth context: Sign out error:', error);
        throw error;
      }
      console.log('Auth context: Sign out successful');
      // Clear local state immediately
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Auth context: Sign out failed:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, session, loading, signIn, signUp, signOut]);
});