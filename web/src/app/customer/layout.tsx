"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

const NAV_ITEMS = [
  { href: "/customer/discover",     icon: "🔍", label: "Discover Workers" },
  { href: "/customer/requests",     icon: "📋", label: "My Requests" },
  { href: "/customer/new-request",  icon: "➕", label: "New Request" },
  { href: "/customer/account",      icon: "👤", label: "My Account" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "customer")) {
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
      <Sidebar title="Customer" navItems={NAV_ITEMS} roleBadgeColor="linear-gradient(135deg, #0D9488, #14B8A6)" />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
