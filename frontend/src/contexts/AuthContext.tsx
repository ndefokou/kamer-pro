import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { username?: string; phone?: string }) => Promise<{ user: any; session: any; error: any }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const { session: currentSession, error } = await supabaseAuthService.getSession();

      if (error) {
        console.error('Session check error:', error);
        setUser(null);
        setSession(null);
        return;
      }

      if (currentSession?.user) {
        setUser(currentSession.user);
        setSession(currentSession);

        // Store user info in localStorage for backward compatibility
        localStorage.setItem('userId', currentSession.user.id);
        localStorage.setItem('username', currentSession.user.user_metadata?.username || currentSession.user.email?.split('@')[0] || '');

        // Remove legacy token to ensure apiClient stops using it
        localStorage.removeItem('token');
      } else {
        setUser(null);
        setSession(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Initial session check
    checkSession();

    // Subscribe to auth state changes
    const unsubscribe = supabaseAuthService.onAuthStateChange((newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);

      if (newUser) {
        localStorage.setItem('userId', newUser.id);
        localStorage.setItem('username', newUser.user_metadata?.username || newUser.email?.split('@')[0] || '');
      } else {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('token');
      }

      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [checkSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseAuthService.signInWithEmail(email, password);
    if (error) {
      throw error;
    }
    // Session will be updated via onAuthStateChange
  };

  const signUp = async (email: string, password: string, metadata?: { username?: string; phone?: string }) => {
    const { user, session, error } = await supabaseAuthService.signUpWithEmail(email, password, metadata);
    if (error) {
      throw error;
    }
    return { user, session, error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabaseAuthService.signInWithGoogle();
    if (error) {
      throw error;
    }
    // OAuth redirect will happen automatically
  };

  const signOut = async () => {
    try {
      await supabaseAuthService.signOut();
    } catch (error) {
      console.error('Sign out failed', error);
    } finally {
      setUser(null);
      setSession(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};