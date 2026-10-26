"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

interface WorkerProfile {
  id: string;
  user_id: string;
  full_name?: string;
  trade_title?: string;
  city?: string;
  state?: string;
  bio?: string;
  years_experience?: number;
  is_available: boolean;
  average_rating?: number;
  total_reviews: number;
  has_verified_competencies?: boolean;
}

interface SkillsData {
  declared_skills: { id: string; skill_name: string; proficiency_level: string }[];
  verified_competencies: { id: string; qualification_title: string; status: string; certificate_number?: string }[];
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  customer_name?: string;
  created_at: string;
}

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.id as string;

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [skills, setSkills] = useState<SkillsData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: "", description: "", service_location: "", preferred_date: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, s, r] = await Promise.allSettled([
        apiClient.get<WorkerProfile>(`/workers/${workerId}`),
        apiClient.get<SkillsData>(`/workers/${workerId}/skills`),
        apiClient.get<unknown>(`/workers/${workerId}/reviews`),
      ]);
      if (w.status === "fulfilled") setWorker(w.value);
      if (s.status === "fulfilled") setSkills(s.value);
      if (r.status === "fulfilled") {
        const arr = Array.isArray(r.value) ? r.value : (r.value as { data: Review[] })?.data ?? [];
        setReviews(arr as Review[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load worker");
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => { load(); }, [load]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true); setError(null);
    try {
      await apiClient.post("/service-requests", {
        worker_profile_id: workerId,
        ...requestForm,
        preferred_date: requestForm.preferred_date || undefined,
      });
      router.push("/customer/requests");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setRequesting(false);
    }
  }

  function stars(n: number) {
    return "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Worker Profile</span>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
        </div>
      </div>
      <div className="page-content">
        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : !worker ? (
          <div className="error-banner">Worker not found.</div>
        ) : (
          <>
            {error && <div className="error-banner">{error}</div>}

            <div className="content-grid content-grid-sidebar">
              {/* Left */}
              <div>
                {/* Profile card */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-body">
                    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                      <div className="avatar avatar-xl">{(worker.full_name?.[0] ?? "W").toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
                          {worker.full_name ?? "Worker"}
                        </h1>
                        <div style={{ fontSize: 14, color: "var(--cr-text-secondary)", marginBottom: 8 }}>
                          {worker.trade_title ?? "Tradesperson"}
                          {worker.years_experience ? ` · ${worker.years_experience} yrs exp` : ""}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {worker.city && <span className="badge badge-neutral">📍 {worker.city}{worker.state ? `, ${worker.state}` : ""}</span>}
                          <span className={`badge ${worker.is_available ? "badge-success" : "badge-neutral"}`}>
                            {worker.is_available ? "Available" : "Unavailable"}
                          </span>
                          {worker.has_verified_competencies && <span className="badge badge-success">✓ Verified Competencies</span>}
                        </div>
                        {worker.bio && (
                          <p style={{ fontSize: 13.5, color: "var(--cr-text-secondary)", marginTop: 12, lineHeight: 1.6 }}>
                            {worker.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verified competencies */}
                {skills?.verified_competencies && skills.verified_competencies.length > 0 && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><div className="card-title">✓ Verified Competencies</div></div>
                    <div className="card-body">
                      {skills.verified_competencies.map(v => (
                        <div key={v.id} className="list-item">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{v.qualification_title}</div>
                            {v.certificate_number && (
                              <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>Cert: {v.certificate_number}</div>
                            )}
                          </div>
                          <span className="badge badge-success">{v.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {skills?.declared_skills && skills.declared_skills.length > 0 && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><div className="card-title">Declared Skills</div></div>
                    <div className="card-body">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {skills.declared_skills.map(s => (
                          <span key={s.id} className="badge badge-primary">{s.skill_name} · {s.proficiency_level}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Customer Reviews</div>
                      <div className="card-subtitle">{worker.total_reviews} reviews · avg ⭐ {worker.average_rating?.toFixed(1) ?? "—"}</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {reviews.length === 0 ? (
                      <p style={{ fontSize: 13.5, color: "var(--cr-text-muted)" }}>No reviews yet.</p>
                    ) : (
                      reviews.map(r => (
                        <div key={r.id} className="list-item">
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                              <span className="star-rating" style={{ fontSize: 13 }}>{stars(r.rating)}</span>
                              <span style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>{r.customer_name ?? "Customer"}</span>
                            </div>
                            {r.comment && <p style={{ fontSize: 13.5, color: "var(--cr-text-secondary)" }}>{r.comment}</p>}
                            <div style={{ fontSize: 11.5, color: "var(--cr-text-muted)", marginTop: 4 }}>
                              {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right: request form */}
              <div>
                <div className="card" style={{ position: "sticky", top: 20 }}>
                  <div className="card-header"><div className="card-title">Request Service</div></div>
                  <div className="card-body">
                    {!worker.is_available ? (
                      <div style={{ background: "var(--cr-bg-muted)", borderRadius: "var(--cr-radius)", padding: 16, textAlign: "center", fontSize: 13.5, color: "var(--cr-text-muted)" }}>
                        This worker is currently unavailable for new requests.
                      </div>
                    ) : !showRequestForm ? (
                      <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setShowRequestForm(true)}>
                        📋 Request This Worker
                      </button>
                    ) : (
                      <form onSubmit={submitRequest}>
                        <div className="form-group">
                          <label className="form-label">Job Title *</label>
                          <input className="form-input" required placeholder="Fix electrical wiring"
                            value={requestForm.title} onChange={e => setRequestForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <textarea className="form-input" rows={3} placeholder="Describe what you need…"
                            value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Location</label>
                          <input className="form-input" placeholder="Your address"
                            value={requestForm.service_location} onChange={e => setRequestForm(f => ({ ...f, service_location: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Preferred Date</label>
                          <input type="date" className="form-input"
                            value={requestForm.preferred_date} onChange={e => setRequestForm(f => ({ ...f, preferred_date: e.target.value }))} />
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={requesting}>
                            {requesting ? "Sending…" : "Send Request"}
                          </button>
                          <button type="button" className="btn btn-ghost" onClick={() => setShowRequestForm(false)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
