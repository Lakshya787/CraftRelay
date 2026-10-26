"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

const NAV_ITEMS = [
  { href: "/assessor/queue",   icon: "📥", label: "Assessment Queue" },
  { href: "/assessor/review",  icon: "🔍", label: "Review Case" },
  { href: "/assessor/history", icon: "📜", label: "History" },
];

export default function AssessorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "assessor" && user.role !== "admin"))) {
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
      <Sidebar title="Assessor" navItems={NAV_ITEMS} roleBadgeColor="linear-gradient(135deg, #7C3AED, #9F67FF)" />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
