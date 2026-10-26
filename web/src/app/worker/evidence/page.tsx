"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";

interface Evidence {
  id: string;
  title: string;
  description?: string;
  evidence_type: string;
  review_status: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  created_at: string;
}

interface Criterion {
  id: string;
  code: string;
  description: string;
}

type Tab = "my-evidence" | "upload" | "url";

function ReviewBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "badge-neutral", under_review: "badge-warning",
    accepted: "badge-success", rejected: "badge-error",
  };
  return <span className={`badge ${map[status] ?? "badge-neutral"}`}>{status.replace(/_/g, " ")}</span>;
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    photo: "🖼️", video: "🎬", certificate: "📜",
    document: "📄", url: "🔗",
  };
  return <span>{icons[type] ?? "📎"}</span>;
}

export default function WorkerEvidencePage() {
  const [tab, setTab] = useState<Tab>("my-evidence");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCriterion, setUploadCriterion] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // URL form state
  const [urlTitle, setUrlTitle] = useState("");
  const [urlDesc, setUrlDesc] = useState("");
  const [urlCriterion, setUrlCriterion] = useState("");
  const [urlValue, setUrlValue] = useState("");

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, crit] = await Promise.all([
        apiClient.get<unknown>("/evidence/me"),
        apiClient.get<unknown>("/qualifications?page_size=50").then(async (res) => {
          const quals = Array.isArray(res) ? res : (res as {data: {id: string}[]})?.data ?? [];
          // Flatten criteria from all quals for linking
          const allCrit: Criterion[] = [];
          for (const q of (quals as {id: string}[]).slice(0, 3)) {
            try {
              const c = await apiClient.get<unknown>(`/qualifications/${q.id}/criteria`);
              const arr = Array.isArray(c) ? c : (c as {data: Criterion[]})?.data ?? [];
              allCrit.push(...(arr as Criterion[]));
            } catch { /* skip */ }
          }
          return allCrit;
        }),
      ]);
      const arr = Array.isArray(ev) ? ev : (ev as {data: Evidence[]})?.data ?? [];
      setEvidence(arr as Evidence[]);
      setCriteria(crit as Criterion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true); setError(null); setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("title", uploadTitle);
      if (uploadDesc) fd.append("description", uploadDesc);
      if (uploadCriterion) fd.append("criterion_id", uploadCriterion);
      await apiClient.upload("/evidence/upload", fd);
      setSuccess("Evidence uploaded!");
      setUploadTitle(""); setUploadDesc(""); setUploadCriterion(""); setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setTab("my-evidence");
      loadEvidence();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true); setError(null); setSuccess(null);
    try {
      await apiClient.post("/evidence/url", {
        title: urlTitle,
        description: urlDesc || undefined,
        source_url: urlValue,
        criterion_id: urlCriterion || undefined,
      });
      setSuccess("URL evidence submitted!");
      setUrlTitle(""); setUrlDesc(""); setUrlCriterion(""); setUrlValue("");
      setTab("my-evidence");
      loadEvidence();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteEvidence(id: string) {
    if (!confirm("Delete this evidence?")) return;
    try {
      await apiClient.delete(`/evidence/${id}`);
      loadEvidence();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Evidence</span>
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Evidence Submission</h1>
            <p className="page-subtitle">Upload proof of your competencies for assessor review</p>
          </div>
        </div>

        <div className="tabs">
          {([["my-evidence","📎 My Evidence"],["upload","📤 Upload File"],["url","🔗 Submit URL"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{l}</button>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        {tab === "my-evidence" && (
          loading ? (
            <div className="loading-state"><div className="spinner" /></div>
          ) : evidence.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📎</div>
                <div className="empty-state-title">No evidence yet</div>
                <div className="empty-state-text">Upload files or submit URLs to support your qualification assessments</div>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Review Status</th>
                    <th>Size</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map(ev => (
                    <tr key={ev.id}>
                      <td><TypeIcon type={ev.evidence_type} /></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ev.title}</div>
                        {ev.description && <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>{ev.description}</div>}
                        {ev.original_filename && <div style={{ fontSize: 11, color: "var(--cr-text-muted)" }}>{ev.original_filename}</div>}
                      </td>
                      <td><ReviewBadge status={ev.review_status} /></td>
                      <td style={{ fontSize: 12.5, color: "var(--cr-text-muted)" }}>
                        {ev.file_size_bytes ? `${(ev.file_size_bytes / 1024).toFixed(1)} KB` : "—"}
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--cr-text-muted)" }}>
                        {new Date(ev.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {ev.review_status === "pending" && (
                          <button className="btn btn-ghost btn-sm" style={{ color: "var(--cr-error)" }}
                            onClick={() => deleteEvidence(ev.id)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === "upload" && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header"><div className="card-title">Upload Evidence File</div></div>
            <div className="card-body">
              <form onSubmit={handleFileUpload}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" required value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)} placeholder="Electrical wiring photo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={uploadDesc}
                    onChange={e => setUploadDesc(e.target.value)} placeholder="What does this show?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Criterion (optional)</label>
                  <select className="form-input" value={uploadCriterion} onChange={e => setUploadCriterion(e.target.value)}>
                    <option value="">— No criterion —</option>
                    {criteria.map(c => <option key={c.id} value={c.id}>{c.code}: {c.description.slice(0, 60)}…</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">File * (max 15 MB — JPG, PNG, PDF, MP4, DOCX)</label>
                  <input ref={fileRef} type="file" className="form-input" required
                    accept="image/*,.pdf,.docx,.mp4,.webm"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile}>
                  {uploading ? "Uploading…" : "Upload Evidence"}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === "url" && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header"><div className="card-title">Submit URL Evidence</div></div>
            <div className="card-body">
              <form onSubmit={handleUrlSubmit}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" required value={urlTitle}
                    onChange={e => setUrlTitle(e.target.value)} placeholder="My certification link" />
                </div>
                <div className="form-group">
                  <label className="form-label">URL *</label>
                  <input className="form-input" type="url" required value={urlValue}
                    onChange={e => setUrlValue(e.target.value)} placeholder="https://…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={urlDesc}
                    onChange={e => setUrlDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Criterion (optional)</label>
                  <select className="form-input" value={urlCriterion} onChange={e => setUrlCriterion(e.target.value)}>
                    <option value="">— No criterion —</option>
                    {criteria.map(c => <option key={c.id} value={c.id}>{c.code}: {c.description.slice(0, 60)}…</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-teal" disabled={uploading}>
                  {uploading ? "Submitting…" : "Submit URL Evidence"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
