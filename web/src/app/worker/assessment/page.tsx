"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";

interface AssessmentCaseSummary {
  id: string;
  qualification_title: string;
  qualification_code: string;
  status: string;
  readiness: string;
  unresolved_criterion_count: number;
  mandatory_blocker_count: number;
  created_at: string;
  updated_at: string | null;
}

interface Qualification {
  id: string;
  title: string;
  code: string;
  level: number;
  trade: string;
}

function CriterionStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    GAP: "#9CA3AF",
    PENDING_REVIEW: "#D97706",
    ADDITIONAL_EVIDENCE_REQUIRED: "#DC2626",
    PRACTICAL_VERIFICATION_REQUIRED: "#0284C7",
    READY_FOR_ASSESSOR_DECISION: "#0D9488",
    VERIFIED: "#16A34A",
  };
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8,
      borderRadius: "50%",
      background: colors[status] ?? "#9CA3AF",
      marginRight: 6
    }} />
  );
}

function CaseBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "badge-neutral", submitted: "badge-warning",
    under_review: "badge-info", approved: "badge-success", rejected: "badge-error",
  };
  return <span className={`badge ${map[status] ?? "badge-neutral"}`}>{status.replace(/_/g, " ")}</span>;
}

export default function WorkerAssessmentPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<AssessmentCaseSummary[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [selectedQual, setSelectedQual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, qualsRes] = await Promise.all([
        apiClient.getPaginated<AssessmentCaseSummary>("/assessments/cases?page_size=50"),
        apiClient.get<unknown>("/qualifications?page_size=50"),
      ]);
      setCases(casesRes.data);
      const quals = Array.isArray(qualsRes)
        ? qualsRes
        : (qualsRes as { data: Qualification[] })?.data ?? [];
      setQualifications(quals as Qualification[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  async function openCase() {
    if (!selectedQual) return;
    setOpening(true);
    setError(null);
    try {
      await apiClient.post("/assessments/cases", { qualification_id: selectedQual });
      setSuccess("Assessment case opened!");
      setSelectedQual("");
      loadCases();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open case");
    } finally {
      setOpening(false);
    }
  }

  void user;

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Assessment Workspace</span>
      </div>
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-info">
            <h1 className="page-title">My Assessment Cases</h1>
            <p className="page-subtitle">Track your qualification assessment progress</p>
          </div>
        </div>

        {/* Open a new case */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><div className="card-title">Open New Case</div></div>
          <div className="card-body">
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Select Qualification</label>
                <select className="form-input" value={selectedQual} onChange={e => setSelectedQual(e.target.value)}>
                  <option value="">— Choose a qualification —</option>
                  {qualifications.map(q => (
                    <option key={q.id} value={q.id}>{q.title} ({q.code})</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={openCase} disabled={!selectedQual || opening}>
                {opening ? "Opening…" : "Open Case"}
              </button>
            </div>
          </div>
        </div>

        {/* Cases list */}
        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : cases.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No assessment cases</div>
              <div className="empty-state-text">Open a new case above to start your qualification assessment</div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Qualification</th>
                    <th>Status</th>
                    <th>Readiness</th>
                    <th>Unresolved</th>
                    <th>Blockers</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.qualification_title}</div>
                        <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>{c.qualification_code}</div>
                      </td>
                      <td><CaseBadge status={c.status} /></td>
                      <td>
                        <span style={{ fontSize: 13 }}>
                          <CriterionStatusDot status={c.readiness} />
                          {c.readiness.replace(/_/g, " ")}
                        </span>
                      </td>
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
                      <td style={{ color: "var(--cr-text-muted)", fontSize: 12.5 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
