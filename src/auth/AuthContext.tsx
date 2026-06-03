import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, readJSON, remove, writeJSON } from '@/lib/storage';
import { authApi, registerUnauthorizedHandler } from '@/lib/api';
import type { AuthUser } from '@/types/user';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    readJSON<string | null>(STORAGE_KEYS.authToken, null),
  );
  const [user, setUser] = useState<AuthUser | null>(() =>
    readJSON<AuthUser | null>(STORAGE_KEYS.authUser, null),
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(!!token);

  const navigate = useNavigate();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    remove(STORAGE_KEYS.authToken);
    remove(STORAGE_KEYS.authUser);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Register global 401 handler so the axios interceptor can boot the user.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  // Hydrate user on first load if we have a token but no user record.
  useEffect(() => {
    if (!token) {
      setIsInitializing(false);
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then((fresh) => {
        if (cancelled) return;
        setUser(fresh);
        writeJSON(STORAGE_KEYS.authUser, fresh);
      })
      .catch(() => {
        /* axios interceptor handles 401 */
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const res = await authApi.login(email, password);
      setToken(res.accessToken);
      setUser(res.user);
      writeJSON(STORAGE_KEYS.authToken, res.accessToken);
      writeJSON(STORAGE_KEYS.authUser, res.user);
      return res.user;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isInitializing,
      login,
      logout,
    }),
    [user, token, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
