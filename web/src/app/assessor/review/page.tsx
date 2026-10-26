"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { apiClient } from "@/lib/apiClient";

interface CriterionState {
  criterion_id: string;
  code: string;
  description: string;
  is_mandatory: boolean;
  status: string;
  explanation: string;
  evidence: { id: string; title: string; review_status: string; mapping_id: string; mapping_status: string }[];
  decision: { decision: string; rationale: string; assessor_name: string | null } | null;
}

interface Workspace {
  id: string;
  worker_name?: string;
  qualification_title: string;
  qualification_code: string;
  status: string;
  can_approve: boolean;
  criteria: CriterionState[];
  approval_blockers: string[];
  verification: { certificate_number?: string; status: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  GAP: "badge-neutral",
  PENDING_REVIEW: "badge-warning",
  ADDITIONAL_EVIDENCE_REQUIRED: "badge-error",
  PRACTICAL_VERIFICATION_REQUIRED: "badge-info",
  READY_FOR_ASSESSOR_DECISION: "badge-success",
  VERIFIED: "badge-success",
};

function ReviewPageInner() {
  const params = useSearchParams();
  const caseId = params.get("case");

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ criterionId: string; code: string } | null>(null);
  const [decisionForm, setDecisionForm] = useState({ decision: "approved", rationale: "" });

  const loadWorkspace = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const w = await apiClient.get<Workspace>(`/assessments/cases/${caseId}`);
      setWorkspace(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  async function reviewEvidence(evidenceId: string, decision: "accepted" | "rejected", note?: string) {
    setActing(true); setError(null);
    try {
      await apiClient.patch(`/evidence/${evidenceId}/review`, { decision, note: note ?? "" });
      setSuccess(`Evidence ${decision}!`);
      loadWorkspace();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to review evidence");
    } finally {
      setActing(false);
    }
  }

  async function submitCriterionDecision() {
    if (!decisionModal || !decisionForm.rationale.trim()) return;
    setActing(true); setError(null);
    try {
      await apiClient.post(`/assessments/cases/${caseId}/criteria/${decisionModal.criterionId}/decision`, {
        decision: decisionForm.decision,
        rationale: decisionForm.rationale,
      });
      setSuccess(`Criterion ${decisionModal.code} — decision recorded!`);
      setDecisionModal(null);
      loadWorkspace();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record decision");
    } finally {
      setActing(false);
    }
  }

  async function finalDecision() {
    if (!confirm("Issue final decision? This will create a CompetencyVerification if all criteria pass.")) return;
    setActing(true); setError(null);
    try {
      await apiClient.post(`/assessments/cases/${caseId}/final-decision`, {});
      setSuccess("Final decision recorded!");
      loadWorkspace();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue final decision");
    } finally {
      setActing(false);
    }
  }

  if (!caseId) {
    return (
      <>
        <div className="topbar"><span className="topbar-title">Review Case</span></div>
        <div className="page-content">
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Select a case to review</div>
              <div className="empty-state-text">Go to the queue and click &quot;Review&quot; on a case.</div>
              <div style={{ marginTop: 16 }}><Link href="/assessor/queue" className="btn btn-primary">Go to Queue</Link></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Review Case</span>
        <div className="topbar-right">
          <Link href="/assessor/queue" className="btn btn-ghost btn-sm">← Queue</Link>
          {workspace?.can_approve && (
            <button className="btn btn-teal btn-sm" onClick={finalDecision} disabled={acting}>
              Issue Final Decision
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : !workspace ? (
          <div className="error-banner">Case not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
                      {workspace.qualification_title}
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--cr-text-muted)", marginBottom: 8 }}>
                      {workspace.qualification_code} · Worker: {workspace.worker_name ?? "Unknown"}
                    </div>
                    {workspace.verification && (
                      <span className="badge badge-success">✓ Verified — {workspace.verification.certificate_number}</span>
                    )}
                  </div>
                  <span className={`badge ${STATUS_BADGE[workspace.status] ?? "badge-neutral"}`}>
                    {workspace.status}
                  </span>
                </div>
                {workspace.approval_blockers.length > 0 && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--cr-error-bg)", borderRadius: "var(--cr-radius)", fontSize: 13 }}>
                    <strong>Blockers:</strong> {workspace.approval_blockers.join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* Criteria */}
            {workspace.criteria.map(criterion => (
              <div className="card" key={criterion.criterion_id} style={{ marginBottom: 14 }}>
                <div className="card-body">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span className="badge badge-neutral">{criterion.code}</span>
                        {criterion.is_mandatory && <span className="badge badge-error">Mandatory</span>}
                        <span className={`badge ${STATUS_BADGE[criterion.status] ?? "badge-neutral"}`}>
                          {criterion.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{criterion.description}</div>
                      <div style={{ fontSize: 12.5, color: "var(--cr-text-muted)" }}>{criterion.explanation}</div>

                      {/* Evidence */}
                      {criterion.evidence.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cr-text-secondary)", marginBottom: 6 }}>EVIDENCE</div>
                          {criterion.evidence.map(ev => (
                            <div key={ev.id} style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                              background: "var(--cr-bg-muted)", borderRadius: "var(--cr-radius-sm)", marginBottom: 6
                            }}>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{ev.title}</span>
                              <span className={`badge ${ev.review_status === "accepted" ? "badge-success" : ev.review_status === "rejected" ? "badge-error" : "badge-neutral"}`}>
                                {ev.review_status}
                              </span>
                              {ev.review_status === "pending" && (
                                <>
                                  <button className="btn btn-sm" style={{ background: "var(--cr-success)", color: "#fff", padding: "4px 10px" }}
                                    disabled={acting} onClick={() => reviewEvidence(ev.id, "accepted")}>✓ Accept</button>
                                  <button className="btn btn-sm btn-danger" style={{ padding: "4px 10px" }}
                                    disabled={acting} onClick={() => reviewEvidence(ev.id, "rejected", "Insufficient quality")}>✕ Reject</button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Existing decision */}
                      {criterion.decision && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: criterion.decision.decision === "approved" ? "var(--cr-success-bg)" : "var(--cr-error-bg)", borderRadius: "var(--cr-radius)", fontSize: 13 }}>
                          <strong>Decision: {criterion.decision.decision}</strong> — {criterion.decision.rationale}
                          {criterion.decision.assessor_name && <span style={{ color: "var(--cr-text-muted)", marginLeft: 8 }}>by {criterion.decision.assessor_name}</span>}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {criterion.status === "READY_FOR_ASSESSOR_DECISION" && !criterion.decision && (
                      <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
                        onClick={() => { setDecisionModal({ criterionId: criterion.criterion_id, code: criterion.code }); setDecisionForm({ decision: "approved", rationale: "" }); }}>
                        Record Decision
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Decision modal */}
        {decisionModal && (
          <div className="modal-overlay" onClick={() => setDecisionModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Criterion Decision — {decisionModal.code}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setDecisionModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Decision</label>
                  <select className="form-input" value={decisionForm.decision}
                    onChange={e => setDecisionForm(f => ({ ...f, decision: e.target.value }))}>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="additional_evidence_required">Additional Evidence Required</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rationale *</label>
                  <textarea className="form-input" rows={3} required
                    value={decisionForm.rationale}
                    onChange={e => setDecisionForm(f => ({ ...f, rationale: e.target.value }))}
                    placeholder="Explain your decision…" />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDecisionModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitCriterionDecision}
                  disabled={acting || !decisionForm.rationale.trim()}>
                  {acting ? "Saving…" : "Record Decision"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function AssessorReviewPage() {
  return (
    <Suspense fallback={<div className="loading-state"><div className="spinner" /></div>}>
      <ReviewPageInner />
    </Suspense>
  );
}
