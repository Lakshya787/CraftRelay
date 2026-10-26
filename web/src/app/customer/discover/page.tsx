"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

interface Worker {
  id: string;
  user_id: string;
  full_name?: string;
  trade_title?: string;
  city?: string;
  state?: string;
  is_available: boolean;
  average_rating?: number;
  total_reviews: number;
  has_verified_competencies?: boolean;
}

const TRADES = ["All", "Electrical", "Plumbing", "Carpentry", "Masonry", "HVAC"];

export default function CustomerDiscoverPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [trade, setTrade] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q = new URLSearchParams({ page_size: "50" });
      if (search) q.set("trade", search);
      if (city) q.set("city", city);
      if (trade !== "All") q.set("trade", trade);
      if (verifiedOnly) q.set("verified_only", "true");
      const res = await apiClient.get<unknown>(`/workers?${q}`);
      const arr = Array.isArray(res) ? res : (res as { data: Worker[] })?.data ?? [];
      setWorkers(arr as Worker[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }, [search, city, trade, verifiedOnly]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  function stars(rating?: number) {
    if (!rating) return "—";
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Discover Workers</span>
        <div className="topbar-right">
          <span style={{ fontSize: 13, color: "var(--cr-text-muted)" }}>{workers.length} workers found</span>
        </div>
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Find Skilled Workers</h1>
            <p className="page-subtitle">Browse verified tradespeople near you</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 2, minWidth: 160, marginBottom: 0 }}>
                <label className="form-label">Search</label>
                <input className="form-input" placeholder="Trade or skill…" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
                <label className="form-label">City</label>
                <input className="form-input" placeholder="Mumbai…" value={city}
                  onChange={e => setCity(e.target.value)} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
                Verified only
              </label>
            </div>
            <div className="filter-chips" style={{ marginTop: 12, marginBottom: 0 }}>
              {TRADES.map(t => (
                <button key={t} className={`chip${trade === t ? " active" : ""}`}
                  onClick={() => setTrade(t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : workers.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No workers found</div>
              <div className="empty-state-text">Try adjusting your filters</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {workers.map(w => (
              <Link href={`/customer/worker/${w.id}`} key={w.id} style={{ textDecoration: "none" }}>
                <div className="card" style={{ cursor: "pointer", transition: "all 0.15s ease", height: "100%" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--cr-shadow)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; (e.currentTarget as HTMLDivElement).style.transform = ""; }}>
                  <div className="card-body">
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div className="avatar avatar-md">{(w.full_name?.[0] ?? "W").toUpperCase()}</div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 2 }}>{w.full_name ?? "Worker"}</div>
                        <div style={{ fontSize: 12.5, color: "var(--cr-text-secondary)" }}>{w.trade_title ?? "Tradesperson"}</div>
                      </div>
                      {w.has_verified_competencies && (
                        <span className="badge badge-success" style={{ height: "fit-content" }}>✓ Verified</span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--cr-text-muted)", marginBottom: 10 }}>
                      {w.city && <span>📍 {w.city}{w.state ? `, ${w.state}` : ""}</span>}
                      <span>⭐ {w.average_rating?.toFixed(1) ?? "—"} ({w.total_reviews})</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="star-rating" style={{ fontSize: 13 }}>
                        {stars(w.average_rating)}
                      </div>
                      <span className={`badge ${w.is_available ? "badge-success" : "badge-neutral"}`}>
                        {w.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
