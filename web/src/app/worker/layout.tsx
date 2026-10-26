"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

const NAV_ITEMS = [
  { href: "/worker/dashboard",      icon: "📊", label: "Dashboard" },
  { href: "/worker/profile",        icon: "👤", label: "My Profile" },
  { href: "/worker/qualifications", icon: "🎓", label: "Qualifications" },
  { href: "/worker/evidence",       icon: "📎", label: "Evidence" },
  { href: "/worker/assessment",     icon: "📋", label: "Assessment" },
  { href: "/worker/jobs",           icon: "💼", label: "Jobs" },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "worker")) {
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
      <Sidebar title="Worker" navItems={NAV_ITEMS} roleBadgeColor="linear-gradient(135deg, #0F4C81, #1A6DB5)" />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
