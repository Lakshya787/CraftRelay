/**
 * types/api.ts — Shared TypeScript types for the CraftRelay domain.
 *
 * Part 1: Only the health-check and role enum are needed.
 * Later parts will expand this with Worker, Skill, Assessment, etc.
 */

// ── User Roles ────────────────────────────────────────────────────────────────

export type UserRole = "worker" | "assessor" | "customer" | "admin";

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  version: string;
  environment: string;
}
