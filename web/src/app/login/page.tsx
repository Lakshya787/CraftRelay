"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      const role = user.role;
      if (role === "worker")   router.push("/worker/dashboard");
      else if (role === "assessor") router.push("/assessor/queue");
      else if (role === "customer") router.push("/customer/discover");
      else if (role === "admin") router.push("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔧</div>
          <span className="auth-logo-text">CraftRelay</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          Sign in to your CraftRelay account to continue.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 24, borderTop: "1px solid var(--cr-divider)", paddingTop: 20 }}>
          <p style={{ fontSize: 13, color: "var(--cr-text-muted)", marginBottom: 12 }}>
            Demo accounts (password set at seed time):
          </p>
          {[
            { role: "Worker", email: "worker@craftrelay.dev", color: "var(--cr-worker)" },
            { role: "Assessor", email: "assessor@craftrelay.dev", color: "var(--cr-assessor)" },
            { role: "Customer", email: "customer@craftrelay.dev", color: "var(--cr-customer)" },
            { role: "Admin", email: "admin@craftrelay.dev", color: "var(--cr-admin)" },
          ].map((d) => (
            <button
              key={d.role}
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginRight: 6, marginBottom: 6, border: `1.5px solid ${d.color}`, color: d.color }}
              onClick={() => setEmail(d.email)}
            >
              {d.role}
            </button>
          ))}
        </div>

        <p style={{ marginTop: 24, fontSize: 13.5, color: "var(--cr-text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--cr-primary)", fontWeight: 600 }}>
            Register
          </Link>
        </p>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-right-orb auth-right-orb-1" />
        <div className="auth-right-orb auth-right-orb-2" />
        <div className="auth-right-content">
          <h2 className="auth-right-title">
            Skills that are<br />proven, not just claimed.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", marginBottom: 36, lineHeight: 1.6 }}>
            CraftRelay uses a deterministic evidence-gap engine to verify vocational
            competencies — making skilled workers discoverable and trustworthy.
          </p>
          {[
            { icon: "🏆", text: "Formal competency verification against NCVT/NSQF standards" },
            { icon: "📋", text: "Evidence-based assessment with criterion-level tracking" },
            { icon: "🔍", text: "Customer discovery of verified tradespeople by skill and location" },
            { icon: "📊", text: "Full audit trail for every assessment decision" },
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
