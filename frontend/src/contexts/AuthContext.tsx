import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount (one-time check)
  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const response = await authAPI.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data as User);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // Auth methods
  async function signIn(email: string, password: string) {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { data: { user: response.data.user }, error: null };
      } else {
        return { 
          data: { user: null }, 
          error: { 
            message: response.error?.message || 'Login failed' 
          } 
        };
      }
    } catch (error) {
      return { 
        data: { user: null }, 
        error: { 
          message: error instanceof Error ? error.message : 'Login failed' 
        } 
      };
    }
  }

  async function signOut() {
    try {
      await authAPI.logout();
      setUser(null);
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Logout failed' 
        } 
      };
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}