/**
 * types/domain.ts — CraftRelay domain types for Part 2.
 *
 * These types mirror the intended backend schema and will
 * be validated against the real API in Part 3.
 */

// ── User & Auth ───────────────────────────────────────────────────────────────

export type UserRole = "worker" | "assessor" | "customer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ── Skills & Qualifications ───────────────────────────────────────────────────

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type QualificationStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired";

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  iconName?: string;
}

export interface QualificationCriterion {
  id: string;
  title: string;
  description: string;
  evidenceRequired: string[];
  weightage: number; // 0-100
}

export interface Qualification {
  id: string;
  title: string;
  skill: Skill;
  level: SkillLevel;
  criteria: QualificationCriterion[];
  validityMonths: number;
  issuedBy: string;
}

// ── Worker ────────────────────────────────────────────────────────────────────

export type VerificationStatus = "unverified" | "pending" | "verified" | "suspended";

export interface WorkerSkill {
  id: string;
  skill: Skill;
  level: SkillLevel;
  verificationStatus: VerificationStatus;
  yearsExperience: number;
  verifiedAt?: string;
}

export interface WorkerProfile {
  id: string;
  user: User;
  bio: string;
  city: string;
  state: string;
  availabilityStatus: "available" | "busy" | "unavailable";
  skills: WorkerSkill[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  hourlyRate?: number;
  languages: string[];
  profileCompleteness: number; // 0-100
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export type EvidenceType = "photo" | "video" | "certificate" | "document" | "url";
export type EvidenceStatus = "draft" | "submitted" | "accepted" | "rejected";

export interface Evidence {
  id: string;
  workerId: string;
  criterionId: string;
  type: EvidenceType;
  title: string;
  description: string;
  fileUrl?: string;
  externalUrl?: string;
  status: EvidenceStatus;
  reviewNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

// ── Assessment ────────────────────────────────────────────────────────────────

export type AssessmentStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AssessmentType = "evidence_review" | "practical_test" | "interview";

export interface AssessmentTask {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  maxScore: number;
  timeLimit?: number; // minutes
}

export interface CriterionScore {
  criterionId: string;
  score: number;
  maxScore: number;
  note: string;
}

export interface Assessment {
  id: string;
  worker: WorkerProfile;
  assessor: User;
  qualification: Qualification;
  status: AssessmentStatus;
  type: AssessmentType;
  scheduledAt?: string;
  completedAt?: string;
  overallScore?: number;
  criterionScores: CriterionScore[];
  assessorNotes: string;
  outcome?: "pass" | "fail" | "pending";
  evidence: Evidence[];
}

// ── Service Requests ──────────────────────────────────────────────────────────

export type ServiceRequestStatus =
  | "open"
  | "matched"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ServiceRequest {
  id: string;
  customer: User;
  worker?: WorkerProfile;
  skill: Skill;
  title: string;
  description: string;
  location: string;
  budget?: number;
  status: ServiceRequestStatus;
  preferredDate?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  serviceRequestId: string;
  reviewer: User;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalWorkers: number;
  verifiedWorkers: number;
  totalAssessors: number;
  totalCustomers: number;
  pendingAssessments: number;
  completedAssessments: number;
  openServiceRequests: number;
  completedServiceRequests: number;
}

export interface AuditLog {
  id: string;
  actor: User;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  timestamp: string;
}
