"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Route to role-specific dashboard
    const role = user?.role;
    if (role === "worker")   router.replace("/worker/dashboard");
    else if (role === "assessor") router.replace("/assessor/queue");
    else if (role === "customer") router.replace("/customer/discover");
    else if (role === "admin") router.replace("/admin/dashboard");
    else router.replace("/login");
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--cr-bg)",
    }}>
      <div className="spinner" />
    </div>
  );
}
