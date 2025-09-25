import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://etretluugvclmydzlfte.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmV0bHV1Z3ZjbG15ZHpsZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjI4MTgsImV4cCI6MjA3MjIzODgxOH0.g-Mki8CU85CQSRdjCcmBV8g-DsR4VKCtn0fOd-LC6m4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// Helper function to sign in
export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

// Helper function to sign out
export async function signOut() {
  return await supabase.auth.signOut();
}

// Helper function to sign up
export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
    }
  });
}