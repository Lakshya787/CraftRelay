"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

const NAV_ITEMS = [
  { href: "/admin/dashboard",   icon: "📊", label: "Overview" },
  { href: "/admin/users",       icon: "👥", label: "Users" },
  { href: "/admin/assessments", icon: "📋", label: "Assessments" },
  { href: "/admin/logs",        icon: "📜", label: "Audit Logs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar title="Admin" navItems={NAV_ITEMS} roleBadgeColor="linear-gradient(135deg, #D97706, #F59E0B)" />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
