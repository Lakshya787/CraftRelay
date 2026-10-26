"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface AuditLog {
  id: string;
  actor_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

export default function AssessorHistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<unknown>("/audit/logs?page_size=100");
      const arr = Array.isArray(res) ? res : (res as { data: AuditLog[] })?.data ?? [];
      setLogs(arr as AuditLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="topbar"><span className="topbar-title">History</span></div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Assessment History</h1>
            <p className="page-subtitle">Audit trail of assessment decisions</p>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <div className="empty-state-title">No audit history yet</div>
              <div className="empty-state-text">Actions recorded during assessments will appear here</div>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><span className="badge badge-primary">{log.action}</span></td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <span className="badge badge-neutral">{log.resource_type}</span>
                        <span style={{ marginLeft: 8, color: "var(--cr-text-muted)", fontFamily: "monospace", fontSize: 11 }}>
                          {log.resource_id.slice(0, 8)}…
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{log.actor_name ?? "—"}</td>
                    <td style={{ fontSize: 12.5, color: "var(--cr-text-muted)" }}>
                      {new Date(log.created_at).toLocaleString()}
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
