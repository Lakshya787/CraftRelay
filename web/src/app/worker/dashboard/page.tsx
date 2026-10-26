"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiClient, ApiError } from "@/lib/apiClient";

interface WorkerProfile {
  id: string;
  trade_title?: string;
  city?: string;
  bio?: string;
  is_available: boolean;
  average_rating?: number;
  total_reviews: number;
}

interface AssessmentCase {
  id: string;
  qualification_title: string;
  status: string;
  unresolved_criterion_count: number;
  created_at: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  status: string;
  customer_name?: string;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "badge-neutral", open: "badge-info", submitted: "badge-warning",
    under_review: "badge-warning", in_progress: "badge-info",
    completed: "badge-success", requested: "badge-warning",
    accepted: "badge-info", declined: "badge-error",
    cancelled: "badge-neutral", completion_pending: "badge-warning",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-neutral"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [cases, setCases] = useState<AssessmentCase[]>([]);
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, j] = await Promise.allSettled([
        apiClient.get<WorkerProfile>("/workers/me"),
        apiClient.getPaginated<AssessmentCase>("/assessments/cases?page_size=5"),
        apiClient.get<ServiceRequest[]>("/service-requests"),
      ]);
      if (p.status === "fulfilled") setProfile(p.value);
      if (c.status === "fulfilled") setCases(c.value.data.slice(0, 5));
      if (j.status === "fulfilled") {
        const raw = j.value as unknown;
        const arr = Array.isArray(raw) ? raw : (raw as {data: ServiceRequest[]})?.data ?? [];
        setJobs(arr.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <div className="topbar-right">
          <Link href="/worker/evidence" className="btn btn-primary btn-sm">
            + Submit Evidence
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* Welcome */}
        <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg, #0F1B2D 0%, #0F4C81 100%)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                Welcome back, {user?.full_name?.split(" ")[0] ?? "Worker"} 👋
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                {profile?.trade_title ?? "Complete your profile to get started"}
                {profile?.city ? ` · ${profile.city}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>
                ⭐ {profile?.average_rating?.toFixed(1) ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {profile?.total_reviews ?? 0} reviews
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(15,76,129,0.1)" }}>📋</div>
            <div className="stat-value">{cases.length}</div>
            <div className="stat-label">Assessment cases</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(13,148,136,0.1)" }}>💼</div>
            <div className="stat-value">{jobs.filter(j => j.status === "accepted" || j.status === "in_progress").length}</div>
            <div className="stat-label">Active jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(22,163,74,0.1)" }}>✅</div>
            <div className="stat-value">{jobs.filter(j => j.status === "completed").length}</div>
            <div className="stat-label">Completed jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(245,158,11,0.1)" }}>⭐</div>
            <div className="stat-value">{profile?.average_rating?.toFixed(1) ?? "—"}</div>
            <div className="stat-label">Average rating</div>
          </div>
        </div>

        {loading && <div className="loading-state"><div className="spinner" /></div>}

        {!loading && (
          <div className="content-grid content-grid-2">
            {/* Assessment cases */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Assessment Cases</div>
                  <div className="card-subtitle">Your qualification assessments</div>
                </div>
                <Link href="/worker/assessment" className="btn btn-ghost btn-sm">View all →</Link>
              </div>
              <div className="card-body">
                {cases.length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px 0" }}>
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">No cases yet</div>
                    <div className="empty-state-text">Start an assessment case from the Qualifications page</div>
                  </div>
                ) : (
                  cases.map((c) => (
                    <div className="list-item" key={c.id}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{c.qualification_title}</div>
                        <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>
                          {c.unresolved_criterion_count} unresolved criteria
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Jobs */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Recent Jobs</div>
                  <div className="card-subtitle">Service requests from customers</div>
                </div>
                <Link href="/worker/jobs" className="btn btn-ghost btn-sm">View all →</Link>
              </div>
              <div className="card-body">
                {jobs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px 0" }}>
                    <div className="empty-state-icon">💼</div>
                    <div className="empty-state-title">No jobs yet</div>
                    <div className="empty-state-text">Complete your profile and get verified to receive job requests</div>
                  </div>
                ) : (
                  jobs.map((j) => (
                    <div className="list-item" key={j.id}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{j.title}</div>
                        <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>{j.customer_name ?? "Customer"}</div>
                      </div>
                      <StatusBadge status={j.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        {!loading && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title">Quick Actions</div>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/worker/profile" className="btn btn-outline">Edit Profile</Link>
                <Link href="/worker/evidence" className="btn btn-teal">Submit Evidence</Link>
                <Link href="/worker/qualifications" className="btn btn-primary">Browse Qualifications</Link>
                <Link href="/worker/assessment" className="btn btn-outline">View Assessments</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
