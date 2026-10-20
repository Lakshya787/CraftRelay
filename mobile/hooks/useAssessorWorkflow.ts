/**
 * hooks/useAssessorWorkflow.ts — Assessor-side API hooks.
 *
 * • useAssessorQueue()      → GET   /assessments/queue
 * • useAssessmentHistory()  → GET   /assessments/cases (final states only)
 * • useReviewEvidence()     → PATCH /evidence/{id}/review
 * • useCriterionDecision()  → POST  /assessments/cases/{id}/criteria/{cid}/decision
 * • useTaskResult()         → POST  /assessments/cases/{id}/tasks/{tid}/result
 * • useFinalDecision()      → POST  /assessments/cases/{id}/final-decision
 *
 * All formal states are computed and validated by the backend. These hooks only
 * submit the assessor's input and surface server errors.
 */

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError, ApiPaginatedResponse } from "../lib/apiClient";
import type {
  AssessmentCaseSummary,
  CriterionDecision,
  PracticalTaskResult,
  VerificationSummary,
} from "./useAssessments";

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

// ── Queue ────────────────────────────────────────────────────────────────────

export function useAssessorQueue() {
  const [cases, setCases] = useState<AssessmentCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ApiPaginatedResponse<AssessmentCaseSummary> =
        await apiClient.getPaginated<AssessmentCaseSummary>(
          "/assessments/queue?page_size=50"
        );
      setCases(data.data);
    } catch (err) {
      setError(toMessage(err, "Failed to load the assessment queue"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { cases, loading, error, refetch };
}

// ── History ──────────────────────────────────────────────────────────────────

export function useAssessmentHistory() {
  const [cases, setCases] = useState<AssessmentCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ApiPaginatedResponse<AssessmentCaseSummary> =
        await apiClient.getPaginated<AssessmentCaseSummary>(
          "/assessments/cases?page_size=100"
        );
      setCases(
        data.data.filter((item) => item.status === "approved" || item.status === "rejected")
      );
    } catch (err) {
      setError(toMessage(err, "Failed to load assessment history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { cases, loading, error, refetch };
}

// ── Evidence review ──────────────────────────────────────────────────────────

export function useReviewEvidence() {
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const review = useCallback(
    async (
      evidenceId: string,
      reviewStatus: "accepted" | "rejected",
      note?: string
    ): Promise<void> => {
      setReviewing(evidenceId);
      setError(null);
      try {
        await apiClient.patch(`/evidence/${evidenceId}/review`, {
          review_status: reviewStatus,
          note,
        });
      } catch (err) {
        setError(toMessage(err, "Could not review this evidence"));
        throw err;
      } finally {
        setReviewing(null);
      }
    },
    []
  );

  return { review, reviewing, error };
}

// ── Criterion decision ───────────────────────────────────────────────────────

export interface CriterionDecisionInput {
  criterionId: string;
  decision: "approved" | "rejected" | "additional_evidence_required";
  rationale: string;
  rubricResult?: "pass" | "fail" | "not_applicable";
}

export function useCriterionDecision(caseId: string) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = useCallback(
    async (input: CriterionDecisionInput): Promise<CriterionDecision> => {
      setSubmitting(input.criterionId);
      setError(null);
      try {
        return await apiClient.post<CriterionDecision>(
          `/assessments/cases/${caseId}/criteria/${input.criterionId}/decision`,
          {
            decision: input.decision,
            rationale: input.rationale,
            rubric_result: input.rubricResult,
          }
        );
      } catch (err) {
        setError(toMessage(err, "Could not record this decision"));
        throw err;
      } finally {
        setSubmitting(null);
      }
    },
    [caseId]
  );

  return { decide, submitting, error };
}

// ── Practical task result ────────────────────────────────────────────────────

export function useTaskResult(caseId: string) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = useCallback(
    async (
      taskId: string,
      score: number,
      commentary?: string
    ): Promise<PracticalTaskResult> => {
      setSubmitting(taskId);
      setError(null);
      try {
        return await apiClient.post<PracticalTaskResult>(
          `/assessments/cases/${caseId}/tasks/${taskId}/result`,
          { score, commentary }
        );
      } catch (err) {
        setError(toMessage(err, "Could not record the practical task result"));
        throw err;
      } finally {
        setSubmitting(null);
      }
    },
    [caseId]
  );

  return { record, submitting, error };
}

// ── Final decision ───────────────────────────────────────────────────────────

export interface FinalDecisionResult {
  case_id: string;
  status: string;
  verification: VerificationSummary | null;
  message: string;
}

export function useFinalDecision(caseId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = useCallback(
    async (
      outcome: "approved" | "rejected",
      rationale: string
    ): Promise<FinalDecisionResult> => {
      setSubmitting(true);
      setError(null);
      try {
        return await apiClient.post<FinalDecisionResult>(
          `/assessments/cases/${caseId}/final-decision`,
          { outcome, rationale }
        );
      } catch (err) {
        setError(toMessage(err, "Could not record the final decision"));
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [caseId]
  );

  return { decide, submitting, error };
}
