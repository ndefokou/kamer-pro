import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import apiClient from '@/api/client';

interface User {
  id: string | number;
  username: string;
  email: string;
  profile_picture_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const response = await apiClient.get('/account/me');
      // The backend returns { user: {...}, profile: {...} } or { user: null, profile: null } when unauthenticated
      const data = response.data;
      const userData = data && typeof data === 'object' && 'user' in data ? data.user : data;
      if (userData && userData.id) {
        setUser(userData);
        localStorage.setItem('userId', userData.id.toString());
      } else {
        setUser(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
      }
    } catch (error) {
      // If 401 or other error, user is not logged in
      setUser(null);
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  const hasCheckedRef = useRef(false);
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    checkSession();
  }, [checkSession]);

  const login = async () => {
    await checkSession();
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      // Optional: Redirect to home or login page if needed, 
      // but usually the component calling logout handles navigation
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
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