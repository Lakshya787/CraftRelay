"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface WorkerProfile {
  id: string;
  trade_title?: string;
  city?: string;
  state?: string;
  bio?: string;
  years_experience?: number;
  is_available: boolean;
  average_rating?: number;
  total_reviews: number;
}

interface Skill {
  id: string;
  skill_id: string;
  skill_name: string;
  proficiency_level: string;
}

interface SkillCatalogueItem {
  id: string;
  name: string;
  category: string;
}

export default function WorkerProfilePage() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [catalogue, setCatalogue] = useState<SkillCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("intermediate");
  const [form, setForm] = useState({
    trade_title: "", city: "", state: "", bio: "", years_experience: "", is_available: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        apiClient.get<WorkerProfile>("/workers/me"),
        apiClient.get<unknown>("/workers/me/skills"),
        apiClient.get<unknown>("/skills"),
      ]);
      setProfile(p);
      setForm({
        trade_title: p.trade_title ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        bio: p.bio ?? "",
        years_experience: String(p.years_experience ?? ""),
        is_available: p.is_available,
      });
      const skillArr = Array.isArray(s) ? s : (s as { declared_skills: Skill[] })?.declared_skills ?? [];
      setSkills(skillArr as Skill[]);
      const catArr = Array.isArray(c) ? c : (c as { data: SkillCatalogueItem[] })?.data ?? [];
      setCatalogue(catArr as SkillCatalogueItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSaving(true); setError(null); setSuccess(null);
    try {
      await apiClient.patch("/workers/me", {
        ...form,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      });
      setSuccess("Profile updated!");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function addSkill() {
    if (!selectedSkillId) return;
    try {
      await apiClient.post("/workers/me/skills", {
        skill_id: selectedSkillId,
        proficiency_level: selectedLevel,
      });
      setShowAddSkill(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add skill");
    }
  }

  async function removeSkill(id: string) {
    try {
      await apiClient.delete(`/workers/me/skills/${id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove skill");
    }
  }

  const levelColors: Record<string, string> = {
    beginner: "badge-neutral", intermediate: "badge-info",
    advanced: "badge-primary", expert: "badge-success",
  };

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">My Profile</span>
        <div className="topbar-right">
          <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : (
          <div className="content-grid content-grid-sidebar">
            {/* Left: Edit form */}
            <div>
              {error && <div className="error-banner">{error}</div>}
              {success && <div className="success-banner">{success}</div>}

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><div className="card-title">Profile Details</div></div>
                <div className="card-body">
                  <div className="content-grid content-grid-2">
                    <div className="form-group">
                      <label className="form-label">Trade Title</label>
                      <input className="form-input" placeholder="e.g. Electrician" value={form.trade_title}
                        onChange={e => setForm(f => ({ ...f, trade_title: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Years of Experience</label>
                      <input className="form-input" type="number" min={0} placeholder="5"
                        value={form.years_experience}
                        onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-input" placeholder="Mumbai" value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input className="form-input" placeholder="Maharashtra" value={form.state}
                        onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea className="form-input" rows={3} placeholder="Tell customers about your experience…"
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      style={{ resize: "vertical" }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      <input type="checkbox" checked={form.is_available}
                        onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                        style={{ marginRight: 8 }} />
                      Available for work
                    </label>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Declared Skills</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowAddSkill(true)}>
                    + Add Skill
                  </button>
                </div>
                <div className="card-body">
                  {showAddSkill && (
                    <div style={{ background: "var(--cr-bg-muted)", borderRadius: "var(--cr-radius)", padding: 16, marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                          <label className="form-label">Skill</label>
                          <select className="form-input" value={selectedSkillId} onChange={e => setSelectedSkillId(e.target.value)}>
                            <option value="">— Select skill —</option>
                            {catalogue.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label className="form-label">Level</label>
                          <select className="form-input" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
                            {["beginner","intermediate","advanced","expert"].map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <button className="btn btn-primary" onClick={addSkill}>Add</button>
                        <button className="btn btn-ghost" onClick={() => setShowAddSkill(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {skills.length === 0 ? (
                    <p style={{ fontSize: 13.5, color: "var(--cr-text-muted)" }}>No skills declared yet. Add your skills above.</p>
                  ) : (
                    skills.map(s => (
                      <div key={s.id} className="list-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.skill_name}</div>
                        </div>
                        <span className={`badge ${levelColors[s.proficiency_level] ?? "badge-neutral"}`}>
                          {s.proficiency_level}
                        </span>
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, color: "var(--cr-error)" }}
                          onClick={() => removeSkill(s.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: summary */}
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-body" style={{ textAlign: "center" }}>
                  <div className="avatar avatar-xl" style={{ margin: "0 auto 16px" }}>
                    {profile?.trade_title?.[0] ?? "W"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{form.trade_title || "—"}</div>
                  <div style={{ fontSize: 13, color: "var(--cr-text-muted)", marginTop: 4 }}>
                    {form.city}{form.city && form.state ? ", " : ""}{form.state}
                  </div>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>⭐ {profile?.average_rating?.toFixed(1) ?? "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>{profile?.total_reviews ?? 0} reviews</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>{skills.length}</div>
                      <div style={{ fontSize: 12, color: "var(--cr-text-muted)" }}>skills</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <span className={`badge ${form.is_available ? "badge-success" : "badge-neutral"}`}>
                      {form.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
