import { createContext, use, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from './api-client';

interface User {
  id: number;
  nombre: string;
  ficha: number;
  rol: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (ficha: number, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (ficha: number, password: string) => {
    const data = await api.post<{
      accessToken: string;
      refreshToken: string;
      usuario: User;
    }>('/auth/login', { ficha, password }, { skipAuth: true });

    api.setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.usuario));
    setUser(data.usuario);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch {
      // Ignorar errores de logout
    }
    api.clearTokens();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  return (
    <AuthContext value={{
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
