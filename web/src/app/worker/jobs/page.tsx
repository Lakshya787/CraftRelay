"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface ServiceRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  customer_name?: string;
  service_location?: string;
  preferred_date?: string;
  agreed_price?: number;
  created_at: string;
  customer_notes?: string;
}

const STATUS_LABELS: Record<string, string> = {
  requested: "badge-warning", accepted: "badge-info", declined: "badge-error",
  in_progress: "badge-info", completion_pending: "badge-warning",
  completed: "badge-success", cancelled: "badge-neutral",
};

export default function WorkerJobsPage() {
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<unknown>("/service-requests");
      const arr = Array.isArray(res) ? res : (res as { data: ServiceRequest[] })?.data ?? [];
      setJobs(arr as ServiceRequest[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  async function action(id: string, endpoint: string, body?: object) {
    setActing(id); setError(null);
    try {
      await apiClient.post(`/service-requests/${id}/${endpoint}`, body ?? {});
      loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  const filters = ["all", "requested", "accepted", "in_progress", "completed", "cancelled"];
  const filtered = jobs.filter(j => filter === "all" || j.status === filter);

  return (
    <>
      <div className="topbar"><span className="topbar-title">My Jobs</span></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Service Requests</h1>
            <p className="page-subtitle">Customer job requests assigned to you</p>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="filter-chips">
          {filters.map(f => (
            <button key={f} className={`chip${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}>
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">💼</div>
              <div className="empty-state-title">No jobs here</div>
              <div className="empty-state-text">Complete your profile and get verified to receive job requests from customers</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(job => (
              <div className="card" key={job.id}>
                <div className="card-body">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{job.title}</span>
                        <span className={`badge ${STATUS_LABELS[job.status] ?? "badge-neutral"}`}>
                          {job.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--cr-text-secondary)", marginBottom: 8 }}>
                        {job.description}
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--cr-text-muted)" }}>
                        {job.customer_name && <span>👤 {job.customer_name}</span>}
                        {job.service_location && <span>📍 {job.service_location}</span>}
                        {job.preferred_date && <span>📅 {new Date(job.preferred_date).toLocaleDateString()}</span>}
                        {job.agreed_price != null && <span>💰 ₹{job.agreed_price}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                      {job.status === "requested" && (
                        <>
                          <button className="btn btn-primary btn-sm" disabled={acting === job.id}
                            onClick={() => action(job.id, "accept")}>Accept</button>
                          <button className="btn btn-danger btn-sm" disabled={acting === job.id}
                            onClick={() => action(job.id, "decline")}>Decline</button>
                        </>
                      )}
                      {job.status === "accepted" && (
                        <button className="btn btn-teal btn-sm" disabled={acting === job.id}
                          onClick={() => action(job.id, "start")}>Start Work</button>
                      )}
                      {job.status === "in_progress" && (
                        <button className="btn btn-primary btn-sm" disabled={acting === job.id}
                          onClick={() => action(job.id, "complete-worker")}>Mark Complete</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
