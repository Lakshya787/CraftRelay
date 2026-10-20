/**
 * hooks/useAssessments.ts — Assessment workspace data hooks.
 *
 * • useAssessmentCases()      → GET /assessments/cases
 * • useAssessmentWorkspace()  → GET /assessments/cases/{id}
 * • useOpenAssessmentCase()   → POST /assessments/cases
 * • useSubmitAssessmentCase() → POST /assessments/cases/{id}/submit
 * • useMappingSuggestions()   → GET  /assessments/cases/{id}/mapping-suggestions
 * • useCreateMapping()        → POST /assessments/cases/{id}/mappings
 * • useRemoveMapping()        → DELETE /assessments/cases/{id}/mappings/{mappingId}
 * • useReviewMapping()        → PATCH  /assessments/cases/{id}/mappings/{mappingId}/review
 *
 * Criterion statuses are deterministic backend states. None of them means
 * "verified" until an authorised assessor records a formal decision.
 */

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError, ApiPaginatedResponse } from "../lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CriterionStatus =
  | "GAP"
  | "PENDING_REVIEW"
  | "ADDITIONAL_EVIDENCE_REQUIRED"
  | "PRACTICAL_VERIFICATION_REQUIRED"
  | "READY_FOR_ASSESSOR_DECISION"
  | "VERIFIED";

export interface AssessmentEvidenceRef {
  id: string;
  title: string;
  description: string | null;
  evidence_type: string;
  review_status: string;
  is_verified: boolean;
  file_url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  mapping_id: string;
  mapping_status: string;
  created_at: string;
}

export interface AssessmentTaskSummary {
  id: string;
  code: string;
  title: string;
  description: string | null;
  estimated_duration_minutes: number | null;
  rubric_reference: string | null;
  criterion_codes: string[];
  max_score: number;
  pass_score: number;
}

export interface CriterionDecision {
  id: string;
  criterion_id: string;
  criterion_code: string;
  decision: "approved" | "rejected" | "additional_evidence_required";
  rubric_result: string | null;
  rationale: string;
  assessor_id: string;
  assessor_name: string | null;
  qualification_version_id: string;
  created_at: string;
  updated_at: string | null;
}

export interface PracticalTaskResult {
  id: string;
  task_id: string;
  task_code: string;
  score: number | null;
  passed: boolean | null;
  assessor_commentary: string | null;
  created_at: string;
}

export interface VerificationSummary {
  id: string;
  qualification_id: string;
  qualification_version_id: string;
  status: string;
  awarded_by_id: string | null;
  certificate_number: string | null;
  created_at: string;
}

export interface CriterionState {
  criterion_id: string;
  code: string;
  description: string;
  guidance: string | null;
  is_mandatory: boolean;
  order_index: number;
  rubric_reference: string | null;
  status: CriterionStatus;
  explanation: string;
  evidence: AssessmentEvidenceRef[];
  pending_evidence_count: number;
  rejected_evidence_count: number;
  linked_tasks: AssessmentTaskSummary[];
  passed_task_codes: string[];
  conflicts: string[];
  assessor_review_required: boolean;
  decision: CriterionDecision | null;
}

export interface TaskRecommendation {
  task: AssessmentTaskSummary;
  addresses_criterion_codes: string[];
  reason: string;
}

export interface AssessmentCaseSummary {
  id: string;
  worker_profile_id: string;
  worker_name: string | null;
  qualification_id: string;
  qualification_code: string;
  qualification_title: string;
  qualification_version_id: string;
  qualification_version_number: number;
  status: string;
  readiness: string;
  unresolved_criterion_count: number;
  mandatory_blocker_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface AssessmentWorkspace extends AssessmentCaseSummary {
  worker_statement: string | null;
  assessor_notes: string | null;
  is_illustrative: boolean;
  criteria: CriterionState[];
  status_counts: Record<CriterionStatus, number>;
  unresolved_criterion_codes: string[];
  mandatory_blocker_codes: string[];
  recommendations: TaskRecommendation[];
  missing_snapshot_codes: string[];
  decisions: CriterionDecision[];
  task_results: PracticalTaskResult[];
  approval_blockers: string[];
  can_approve: boolean;
  verification: VerificationSummary | null;
  disclaimer: string;
}

export interface MappingSuggestion {
  criterion_id: string;
  criterion_code: string;
  criterion_description: string;
  qualification_version_id: string;
  qualification_version_number: number;
  evidence_item_id: string;
  evidence_title: string;
  supporting_text: string;
  match_score: number;
  match_explanation: string;
  mapping_status: string;
  requires_assessor_review: boolean;
  already_mapped: boolean;
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

// ── Case list ────────────────────────────────────────────────────────────────

export function useAssessmentCases() {
  const [cases, setCases] = useState<AssessmentCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ApiPaginatedResponse<AssessmentCaseSummary> =
        await apiClient.getPaginated<AssessmentCaseSummary>(
          "/assessments/cases?page_size=50"
        );
      setCases(data.data);
    } catch (err) {
      setError(toMessage(err, "Failed to load assessment cases"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { cases, loading, error, refetch };
}

// ── Case workspace ───────────────────────────────────────────────────────────

export function useAssessmentWorkspace(caseId: string | null) {
  const [workspace, setWorkspace] = useState<AssessmentWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!caseId) {
      setWorkspace(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<AssessmentWorkspace>(
        `/assessments/cases/${caseId}`
      );
      setWorkspace(data);
    } catch (err) {
      setError(toMessage(err, "Failed to load assessment workspace"));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { workspace, loading, error, refetch, setWorkspace };
}

// ── Open case ────────────────────────────────────────────────────────────────

export function useOpenAssessmentCase() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCase = useCallback(
    async (qualificationId: string): Promise<AssessmentWorkspace> => {
      setOpening(true);
      setError(null);
      try {
        return await apiClient.post<AssessmentWorkspace>("/assessments/cases", {
          qualification_id: qualificationId,
        });
      } catch (err) {
        setError(toMessage(err, "Could not open an assessment case"));
        throw err;
      } finally {
        setOpening(false);
      }
    },
    []
  );

  return { openCase, opening, error };
}

// ── Submit case ──────────────────────────────────────────────────────────────

export function useSubmitAssessmentCase(caseId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (): Promise<AssessmentWorkspace> => {
    setSubmitting(true);
    setError(null);
    try {
      return await apiClient.post<AssessmentWorkspace>(
        `/assessments/cases/${caseId}/submit`
      );
    } catch (err) {
      setError(toMessage(err, "Could not submit this case"));
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [caseId]);

  return { submit, submitting, error };
}

// ── Mapping suggestions ──────────────────────────────────────────────────────

export function useMappingSuggestions(caseId: string) {
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MappingSuggestion[]>(
        `/assessments/cases/${caseId}/mapping-suggestions`
      );
      setSuggestions(data);
    } catch (err) {
      setError(toMessage(err, "Could not load mapping suggestions"));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  return { suggestions, loading, error, load };
}

// ── Create / remove mapping ──────────────────────────────────────────────────

export function useCreateMapping(caseId: string) {
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const link = useCallback(
    async (
      criterionId: string,
      evidenceItemId: string,
      source: "manual" | "suggested" = "manual"
    ): Promise<void> => {
      setLinking(criterionId);
      setError(null);
      try {
        await apiClient.post(`/assessments/cases/${caseId}/mappings`, {
          criterion_id: criterionId,
          evidence_item_id: evidenceItemId,
          mapping_source: source,
        });
      } catch (err) {
        setError(toMessage(err, "Could not link this evidence"));
        throw err;
      } finally {
        setLinking(null);
      }
    },
    [caseId]
  );

  return { link, linking, error };
}

export function useRemoveMapping(caseId: string) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(
    async (mappingId: string): Promise<void> => {
      setRemoving(mappingId);
      setError(null);
      try {
        await apiClient.delete(`/assessments/cases/${caseId}/mappings/${mappingId}`);
      } catch (err) {
        setError(toMessage(err, "Could not remove this link"));
        throw err;
      } finally {
        setRemoving(null);
      }
    },
    [caseId]
  );

  return { remove, removing, error };
}

// ── Review an evidence→criterion link ────────────────────────────────────────

export function useReviewMapping(caseId: string) {
  const [reviewingMapping, setReviewingMapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewMapping = useCallback(
    async (
      mappingId: string,
      decision: "confirmed" | "rejected",
      note?: string
    ): Promise<void> => {
      setReviewingMapping(mappingId);
      setError(null);
      try {
        await apiClient.patch(
          `/assessments/cases/${caseId}/mappings/${mappingId}/review`,
          { decision, note }
        );
      } catch (err) {
        setError(toMessage(err, "Could not review this evidence link"));
        throw err;
      } finally {
        setReviewingMapping(null);
      }
    },
    [caseId]
  );

  return { reviewMapping, reviewingMapping, error };
}
