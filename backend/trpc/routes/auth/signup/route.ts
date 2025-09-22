import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypumvyhwtpscevoqgcat.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdW12eWh3dHBzY2V2b3FnY2F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExMDA1NiwiZXhwIjoyMDczNjg2MDU2fQ.eIyKeguIgQVZcZmsKg_pD0cWbA7-9FjWw2xJkjXY-Ow';

// Create client for backend operations with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const signupProcedure = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(1).max(50),
    displayName: z.string().min(1).max(100),
  }))
  .mutation(async ({ input }) => {
    const { email, password, username, displayName } = input;
    
    try {
      console.log('Starting signup process for email:', email);
      
      // First, create the auth user using admin API to bypass email confirmation
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: username.trim(),
          display_name: displayName.trim()
        }
      });

      if (authError || !authData.user) {
        console.error('Auth creation error:', authError);
        throw new Error(authError?.message || 'Failed to create user account');
      }

      console.log('Auth user created successfully:', authData.user.id);

      // Use the database function to create the profile
      console.log('Creating profile with username:', username.trim(), 'displayName:', displayName.trim());
      
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        user_id: authData.user.id,
        username_param: username.trim(),
        display_name_param: displayName.trim(),
      });

      if (profileError) {
        console.error('Profile creation error details:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        });
        
        // Try to clean up the auth user if profile creation failed
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('Cleaned up auth user after profile creation failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        throw new Error(`Database error saving new user: ${profileError.message}`);
      }

      console.log('Profile created successfully for user:', authData.user.id);

      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username: username.trim(),
          displayName: displayName.trim(),
        }
      };
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw new Error(error.message || 'Failed to create account');
    }
  });

export default signupProcedure;