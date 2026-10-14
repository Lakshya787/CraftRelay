/**
 * context/AuthContext.tsx — Mock authentication context.
 *
 * Part 2: Provides a role-switching mechanism using mock data.
 * Part 3: Will be replaced with real JWT authentication.
 */

import React, { createContext, useContext, useState } from "react";
import type { User, UserRole } from "../types/domain";
import {
  MOCK_WORKER_USER,
  MOCK_ASSESSOR_USER,
  MOCK_CUSTOMER_USER,
  MOCK_ADMIN_USER,
} from "../data/mockData";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_USER_MAP: Record<UserRole, User> = {
  worker: MOCK_WORKER_USER,
  assessor: MOCK_ASSESSOR_USER,
  customer: MOCK_CUSTOMER_USER,
  admin: MOCK_ADMIN_USER,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: UserRole) => {
    setUser(ROLE_USER_MAP[role]);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
