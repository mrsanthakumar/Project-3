"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiPost, apiGet } from "@/lib/client/api";
import { setToken } from "@/lib/client/token";

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  institutionId: string | null;
  permissions: string[];
}

interface AuthState {
  user: CurrentUser | null;
  ready: boolean; // bootstrap finished
  login: (email: string, password: string, institutionCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  // On load, try to re-mint an access token from the refresh cookie.
  useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await apiPost<{ accessToken: string }>("/auth/refresh");
        setToken(accessToken);
        setUser(await apiGet<CurrentUser>("/auth/me"));
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, institutionCode?: string) => {
    const res = await apiPost<{ accessToken: string; user: CurrentUser }>("/auth/login", {
      email,
      password,
      institutionCode: institutionCode || undefined,
    });
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: string) => user?.role === "super_admin" || !!user?.permissions.includes(permission),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
