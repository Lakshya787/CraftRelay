"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface Qualification {
  id: string;
  title: string;
  code: string;
  level: number;
  trade: string;
  issuing_body?: string;
  is_illustrative?: boolean;
}

interface Criterion {
  id: string;
  code: string;
  description: string;
  guidance?: string;
  is_mandatory: boolean;
  order_index: number;
  rubric_reference?: string;
}

const TRADES = ["All", "Electrical", "Plumbing", "Carpentry", "Masonry", "HVAC"];

export default function WorkerQualificationsPage() {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [selectedQual, setSelectedQual] = useState<Qualification | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loadingQuals, setLoadingQuals] = useState(true);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [tradeFilter, setTradeFilter] = useState("All");
  const [search, setSearch] = useState("");

  const loadQuals = useCallback(async () => {
    setLoadingQuals(true);
    try {
      const res = await apiClient.get<unknown>("/qualifications?page_size=50");
      const arr = Array.isArray(res) ? res : (res as { data: Qualification[] })?.data ?? [];
      setQualifications(arr as Qualification[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuals(false);
    }
  }, []);

  useEffect(() => { loadQuals(); }, [loadQuals]);

  async function selectQual(q: Qualification) {
    setSelectedQual(q);
    setCriteria([]);
    setLoadingCriteria(true);
    try {
      const res = await apiClient.get<unknown>(`/qualifications/${q.id}/criteria`);
      const arr = Array.isArray(res) ? res : (res as { data: Criterion[] })?.data ?? [];
      setCriteria((arr as Criterion[]).sort((a, b) => a.order_index - b.order_index));
    } catch {
      setCriteria([]);
    } finally {
      setLoadingCriteria(false);
    }
  }

  const filtered = qualifications.filter(q => {
    const matchTrade = tradeFilter === "All" || q.trade?.toLowerCase().includes(tradeFilter.toLowerCase());
    const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.code.toLowerCase().includes(search.toLowerCase());
    return matchTrade && matchSearch;
  });

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Qualification Catalogue</span>
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Qualifications</h1>
            <p className="page-subtitle">Browse NCVT/NSQF qualification standards and their competency criteria</p>
          </div>
        </div>

        {selectedQual && (
          <div className="card" style={{ marginBottom: 0, background: "var(--cr-info-bg)", border: "1px solid rgba(2,132,199,0.2)" }}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <div style={{ fontSize: 13, color: "var(--cr-info)" }}>
                <strong>Illustrative data notice:</strong> These qualification standards are fictional illustrations, not official NCVT/NSQF standards.
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedQual(null); setCriteria([]); }}>
                ✕ Close
              </button>
            </div>
          </div>
        )}

        <div className="content-grid content-grid-sidebar" style={{ marginTop: selectedQual ? 16 : 0 }}>
          {/* Left: list */}
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <input className="form-input" placeholder="Search qualifications…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1 }} />
            </div>
            <div className="filter-chips" style={{ marginBottom: 16 }}>
              {TRADES.map(t => (
                <button key={t} className={`chip${tradeFilter === t ? " active" : ""}`}
                  onClick={() => setTradeFilter(t)}>{t}</button>
              ))}
            </div>

            {loadingQuals ? (
              <div className="loading-state"><div className="spinner" /></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(q => (
                  <div key={q.id}
                    className="card"
                    style={{
                      cursor: "pointer",
                      border: selectedQual?.id === q.id ? "2px solid var(--cr-primary)" : undefined,
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => selectQual(q)}
                  >
                    <div className="card-body" style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{q.title}</div>
                          <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>
                            {q.code} · Level {q.level} · {q.trade}
                          </div>
                        </div>
                        <span className="badge badge-primary">L{q.level}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🎓</div>
                    <div className="empty-state-title">No qualifications found</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: criteria */}
          <div>
            {!selectedQual ? (
              <div className="card">
                <div className="empty-state" style={{ padding: "40px 24px" }}>
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">Select a qualification</div>
                  <div className="empty-state-text">Click any qualification to see its competency criteria</div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{selectedQual.title}</div>
                    <div className="card-subtitle">{selectedQual.code} · Level {selectedQual.level}</div>
                  </div>
                </div>
                <div className="card-body">
                  {loadingCriteria ? (
                    <div className="loading-state"><div className="spinner" /></div>
                  ) : (
                    <div>
                      {criteria.map((c, i) => (
                        <div key={c.id} style={{
                          padding: "12px 0",
                          borderTop: i > 0 ? "1px solid var(--cr-divider)" : "none"
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{c.code}</span>
                            {c.is_mandatory && (
                              <span className="badge badge-error" style={{ flexShrink: 0 }}>Mandatory</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 500, margin: "8px 0 4px" }}>
                            {c.description}
                          </div>
                          {c.guidance && (
                            <div style={{ fontSize: 12.5, color: "var(--cr-text-muted)", lineHeight: 1.5 }}>
                              {c.guidance}
                            </div>
                          )}
                          {c.rubric_reference && (
                            <div style={{ fontSize: 12, color: "var(--cr-info)", marginTop: 4 }}>
                              📖 {c.rubric_reference}
                            </div>
                          )}
                        </div>
                      ))}
                      {criteria.length === 0 && (
                        <p style={{ color: "var(--cr-text-muted)", fontSize: 13.5 }}>No criteria found.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
