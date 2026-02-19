import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { username?: string; phone?: string }) => Promise<{ user: User | null; session: Session | null; error: import('@supabase/supabase-js').AuthError | null }>;
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
        try {
          const { getMe } = await import('@/api/client');
          const { user: backendUser } = await getMe();
          if (backendUser?.id) {
            localStorage.setItem('userId', backendUser.id.toString());
          }
        } catch (e) {
          console.error('Failed to sync backend user', e);
        }
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
    const unsubscribe = supabaseAuthService.onAuthStateChange(async (newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);

      if (newUser) {
        // Fetch backend user ID (integer) to support legacy components
        try {
          const { getMe } = await import('@/api/client');
          const { user: backendUser } = await getMe();
          if (backendUser?.id) {
            localStorage.setItem('userId', backendUser.id.toString());
          }
        } catch (e) {
          console.error('Failed to sync backend user', e);
        }
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
    setLoading(true);
    try {
      const { user: newUser, session: newSession, error } = await supabaseAuthService.signInWithEmail(email, password);
      if (error) throw error;

      if (newUser && newSession) {
        setUser(newUser);
        setSession(newSession);
        // Syncing with backend will happen via useEffect, or we could trigger it here
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
    // onAuthStateChange will also fire, but we update state immediately to avoid race conditions
  };

  const signUp = async (email: string, password: string, metadata?: { username?: string; phone?: string }) => {
    setLoading(true);
    try {
      const { user: newUser, session: newSession, error } = await supabaseAuthService.signUpWithEmail(email, password, metadata);
      if (error) throw error;

      if (newUser) {
        setUser(newUser);
        setSession(newSession);
      }
      return { user: newUser, session: newSession, error };
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabaseAuthService.signInWithGoogle();
      if (error) throw error;
    } catch (error) {
      setLoading(false);
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