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

// ── Marketplace Types ────────────────────────────────────────────────────────

export interface ApiWorkerSummary {
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

export interface ApiWorkerProfile extends ApiWorkerSummary {
  bio?: string;
  years_experience?: number;
}

export interface ApiDeclaredSkill {
  id: string;
  skill_id: string;
  skill_name: string;
  proficiency_level: string;
  years_used?: number;
  notes?: string;
}

export interface ApiVerifiedCompetency {
  id: string;
  qualification_id: string;
  qualification_title: string;
  status: "verified" | "pending" | "expired" | "revoked";
  certificate_number?: string;
}

export interface ApiWorkerSkillsResponse {
  declared_skills: ApiDeclaredSkill[];
  verified_competencies: ApiVerifiedCompetency[];
}

export type ServiceRequestStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "in_progress"
  | "completion_pending"
  | "completed"
  | "cancelled";

export interface ApiServiceRequest {
  id: string;
  customer_id: string;
  worker_profile_id: string;
  title: string;
  description?: string;
  status: ServiceRequestStatus;
  service_location?: string;
  preferred_date?: string;
  agreed_price?: number;
  created_at: string;
  updated_at: string;
  worker_name?: string;
  customer_name?: string;
  worker_notes?: string;
  customer_notes?: string;
  photo_url?: string;
}

export interface ApiReview {
  id: string;
  service_request_id: string;
  customer_id: string;
  worker_profile_id: string;
  rating: number;
  comment?: string;
  is_public: boolean;
  created_at: string;
  customer_name?: string;
}

