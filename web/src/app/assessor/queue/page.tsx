"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

interface AssessmentCase {
  id: string;
  worker_name?: string;
  qualification_title: string;
  qualification_code: string;
  status: string;
  readiness: string;
  unresolved_criterion_count: number;
  mandatory_blocker_count: number;
  created_at: string;
  updated_at?: string;
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    draft: "badge-neutral", submitted: "badge-warning",
    under_review: "badge-info", approved: "badge-success", rejected: "badge-error",
  };
  return <span className={`badge ${m[status] ?? "badge-neutral"}`}>{status.replace(/_/g, " ")}</span>;
}

export default function AssessorQueuePage() {
  const [cases, setCases] = useState<AssessmentCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getPaginated<AssessmentCase>("/assessments/cases?page_size=100");
      setCases(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filters = ["all", "submitted", "under_review", "approved", "rejected", "draft"];
  const filtered = filter === "all" ? cases : cases.filter(c => c.status === filter);
  const pending = cases.filter(c => c.status === "submitted" || c.status === "under_review").length;

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Assessment Queue</span>
        <div className="topbar-right">
          {pending > 0 && <span className="badge badge-warning">{pending} pending</span>}
        </div>
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Assessment Queue</h1>
            <p className="page-subtitle">Review submitted worker cases and make formal decisions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: "Total cases", value: cases.length, icon: "📋", color: "var(--cr-primary)" },
            { label: "Submitted", value: cases.filter(c => c.status === "submitted").length, icon: "📥", color: "var(--cr-warning)" },
            { label: "Under review", value: cases.filter(c => c.status === "under_review").length, icon: "🔍", color: "var(--cr-info)" },
            { label: "Approved", value: cases.filter(c => c.status === "approved").length, icon: "✅", color: "var(--cr-success)" },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="filter-chips">
          {filters.map(f => (
            <button key={f} className={`chip${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Qualification</th>
                  <th>Status</th>
                  <th>Unresolved</th>
                  <th>Mandatory Blockers</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state" style={{ padding: "32px 0" }}>
                      <div className="empty-state-icon">📭</div>
                      <div className="empty-state-title">No cases found</div>
                    </div>
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar avatar-sm">{(c.worker_name?.[0] ?? "W").toUpperCase()}</div>
                        <span style={{ fontWeight: 600 }}>{c.worker_name ?? "Worker"}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.qualification_title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--cr-text-muted)" }}>{c.qualification_code}</div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <span className={`badge ${c.unresolved_criterion_count > 0 ? "badge-warning" : "badge-success"}`}>
                        {c.unresolved_criterion_count}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.mandatory_blocker_count > 0 ? "badge-error" : "badge-success"}`}>
                        {c.mandatory_blocker_count}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--cr-text-muted)" }}>
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link href={`/assessor/review?case=${c.id}`} className="btn btn-outline btn-sm">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
