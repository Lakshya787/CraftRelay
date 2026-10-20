/**
 * context/AuthContext.tsx — Real JWT authentication context.
 *
 * Replaces the mock role-switcher from Part 2.
 * • Tokens are stored in SecureStore (encrypted key-value store on device).
 * • On app launch, the stored token is validated against /auth/me.
 * • login() calls POST /auth/login and stores the returned access token.
 * • logout() clears the token and user state.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "../lib/apiClient";
import type { User } from "../types/domain";

const TOKEN_KEY = "craftrelay_access_token";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface TokenResponse {
  access_token: string;
}

interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore the stored token
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        // Validate token by fetching /auth/me
        const userData = await apiClient.get<UserResponse>("/auth/me", {
          headers: { Authorization: `Bearer ${stored}` },
        });
        setToken(stored);
        setUser(mapUserResponse(userData));
      }
    } catch {
      // Token expired or invalid — clear it silently
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<User> {
    const tokenData = await apiClient.post<TokenResponse>("/auth/login", {
      email,
      password,
    });

    const { access_token } = tokenData;
    await SecureStore.setItemAsync(TOKEN_KEY, access_token);
    setToken(access_token);

    // Fetch user profile — the role always comes from the backend.
    const userData = await apiClient.get<UserResponse>("/auth/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const mapped = mapUserResponse(userData);
    setUser(mapped);
    return mapped;
  }

  async function logout(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function refreshUser(): Promise<void> {
    if (!token) return;
    const userData = await apiClient.get<UserResponse>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(mapUserResponse(userData));
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
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapUserResponse(r: UserResponse): User {
  return {
    id: r.id,
    name: r.full_name,
    email: r.email,
    phone: "",           // not returned by /auth/me yet
    role: r.role as any,
    createdAt: new Date().toISOString(),
    isActive: r.is_active,
  };
}
