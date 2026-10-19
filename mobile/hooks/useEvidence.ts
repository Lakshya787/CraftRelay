/**
 * hooks/useEvidence.ts — Evidence submission and retrieval hooks.
 *
 * useMyEvidence(): paginated list of own evidence
 * useSubmitFileEvidence(): upload a file via multipart
 * useSubmitURLEvidence(): submit a URL link
 * useDeleteEvidence(): remove an evidence item
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError, ApiPaginatedResponse } from "../lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EvidenceReviewStatus =
  | "pending"
  | "under_review"
  | "accepted"
  | "rejected";

export type EvidenceType =
  | "photo"
  | "video"
  | "certificate"
  | "document"
  | "reference_letter"
  | "other";

export interface EvidenceItemData {
  id: string;
  worker_profile_id: string;
  title: string;
  description: string | null;
  evidence_type: EvidenceType;
  review_status: EvidenceReviewStatus;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  storage_backend: string;
  file_url: string | null;
  is_verified: boolean;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

// ── List my evidence ──────────────────────────────────────────────────────────

export function useMyEvidence(reviewStatus?: EvidenceReviewStatus) {
  const [items, setItems] = useState<EvidenceItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page_size: "50" });
      if (reviewStatus) params.set("review_status", reviewStatus);
      const data = await apiClient.getPaginated<EvidenceItemData>(
        `/evidence/me?${params}`
      );
      setItems(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load evidence"
      );
    } finally {
      setLoading(false);
    }
  }, [reviewStatus]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, total, refetch: fetch };
}

// ── Upload file evidence ──────────────────────────────────────────────────────

export interface FileEvidencePayload {
  file: {
    uri: string;
    name: string;
    type: string; // client-side MIME hint — backend re-detects via magic bytes
  };
  title: string;
  description?: string;
  evidence_type: EvidenceType;
  criterion_id?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export function useSubmitFileEvidence() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const submit = useCallback(
    async (payload: FileEvidencePayload): Promise<EvidenceItemData> => {
      setSubmitting(true);
      setError(null);
      setProgress(null);

      const formData = new FormData();
      // @ts-ignore — React Native FormData accepts uri/name/type object
      formData.append("file", {
        uri: payload.file.uri,
        name: payload.file.name,
        type: payload.file.type,
      });
      formData.append("title", payload.title);
      if (payload.description) {
        formData.append("description", payload.description);
      }
      formData.append("evidence_type", payload.evidence_type);
      if (payload.criterion_id) {
        formData.append("criterion_id", payload.criterion_id);
      }

      try {
        const data = await apiClient.upload<EvidenceItemData>(
          "/evidence/upload",
          formData
        );
        return data;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Upload failed";
        setError(msg);
        throw err;
      } finally {
        setSubmitting(false);
        setProgress(null);
      }
    },
    []
  );

  return { submit, submitting, error, progress };
}

// ── Submit URL evidence ───────────────────────────────────────────────────────

export interface URLEvidencePayload {
  title: string;
  description?: string;
  url: string;
  criterion_id?: string;
}

export function useSubmitURLEvidence() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: URLEvidencePayload): Promise<EvidenceItemData> => {
      setSubmitting(true);
      setError(null);
      try {
        const data = await apiClient.post<EvidenceItemData>(
          "/evidence/url",
          payload
        );
        return data;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Submission failed";
        setError(msg);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { submit, submitting, error };
}

// ── Delete evidence ───────────────────────────────────────────────────────────

export function useDeleteEvidence() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    setDeleting(true);
    setError(null);
    try {
      await apiClient.delete(`/evidence/${id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setError(msg);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  return { remove, deleting, error };
}
