"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiError, TOKEN_KEY } from "@/lib/apiClient";

export type UserRole = "worker" | "assessor" | "customer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreSession() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        const userData = await apiClient.get<User>("/auth/me", {
          headers: { Authorization: `Bearer ${stored}` },
        });
        setToken(stored);
        setUser(userData);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<User> {
    const tokenData = await apiClient.post<{ access_token: string }>(
      "/auth/login",
      { email, password }
    );
    const { access_token } = tokenData;
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);

    const userData = await apiClient.get<User>("/auth/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(userData);
    return userData;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  async function refreshUser(): Promise<void> {
    if (!token) return;
    try {
      const userData = await apiClient.get<User>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(userData);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
