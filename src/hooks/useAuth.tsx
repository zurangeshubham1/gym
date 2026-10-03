import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getGymApi } from "../services/gymApi";
import { clearSession, readSession, writeSession } from "../services/session";
import type { AuthSession, GymApi, SessionUser } from "../types";

interface AuthContextValue {
  user: SessionUser | null;
  token: string;
  loading: boolean;
  api: GymApi | null;
  login: (username: string, password: string, remember: boolean) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [api, setApi] = useState<GymApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getGymApi()
      .then((instance) => {
        if (!cancelled) setApi(instance);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    if (!api) return "API is not ready yet.";
    const result = await api.login(username, password);
    if (!result.ok) return result.error;
    writeSession(result.data, remember);
    setSession(result.data);
    return null;
  }, [api]);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? "",
      loading,
      api,
      login,
      logout,
    }),
    [session, loading, api, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
