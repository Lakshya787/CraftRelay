"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "worker" as "worker" | "customer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/auth/register", form);
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔧</div>
          <span className="auth-logo-text">CraftRelay</span>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Join CraftRelay as a worker or customer.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="form-input"
              placeholder="Ramesh Kumar"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">I am a…</label>
            <select
              id="role"
              name="role"
              className="form-input"
              value={form.role}
              onChange={handleChange}
            >
              <option value="worker">Skilled Worker — I offer services</option>
              <option value="customer">Customer — I need services</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 13.5, color: "var(--cr-text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--cr-primary)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-right-orb auth-right-orb-1" />
        <div className="auth-right-orb auth-right-orb-2" />
        <div className="auth-right-content">
          <h2 className="auth-right-title">
            Your skills deserve<br />recognition.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", marginBottom: 36, lineHeight: 1.6 }}>
            Whether you&apos;re an electrician, plumber, carpenter, or mason —
            CraftRelay helps you prove your competency and find work.
          </p>
          {[
            { icon: "⚡", text: "Build a verified portfolio of your skills and evidence" },
            { icon: "🎯", text: "Get matched with customers looking for your trade" },
            { icon: "📜", text: "Earn formal competency certificates against NSQF standards" },
            { icon: "⭐", text: "Collect reviews from completed service requests" },
          ].map((f, i) => (
            <div className="auth-right-feature" key={i}>
              <div className="auth-right-feature-icon">{f.icon}</div>
              <span className="auth-right-feature-text">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
