/**
 * hooks/useQualifications.ts — Qualification catalogue hooks.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "../lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QualificationSummary {
  id: string;
  code: string;
  title: string;
  trade: string;
  level: number;
  is_illustrative: boolean;
  issuing_body: string;
  source_url: string | null;
}

export interface CriterionData {
  id: string;
  code: string;
  description: string;
  guidance: string | null;
  is_mandatory: boolean;
  order_index: number;
  rubric_reference: string | null;
}

export interface QualificationDetail {
  id: string;
  code: string;
  title: string;
  trade: string;
  issuing_body: string;
  level: number;
  duration_hours: number | null;
  description: string | null;
  is_active: boolean;
  is_illustrative: boolean;
  current_version: number;
  source_url: string | null;
  publication_date: string | null;
  rubric_reference: string | null;
}

// ── Qualification list ────────────────────────────────────────────────────────

export function useQualifications(trade?: string) {
  const [qualifications, setQualifications] = useState<QualificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page_size: "50" });
      if (trade) params.set("trade", trade);
      const data = await apiClient.getPaginated<QualificationSummary>(
        `/qualifications?${params}`
      );
      setQualifications(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load qualifications"
      );
    } finally {
      setLoading(false);
    }
  }, [trade]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { qualifications, loading, error, total, refetch: fetch };
}

// ── Single qualification + criteria ──────────────────────────────────────────

export function useQualificationDetail(id: string | null) {
  const [qualification, setQualification] = useState<QualificationDetail | null>(null);
  const [criteria, setCriteria] = useState<CriterionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [qual, crit] = await Promise.all([
        apiClient.get<QualificationDetail>(`/qualifications/${id}`),
        apiClient.get<CriterionData[]>(`/qualifications/${id}/criteria`),
      ]);
      setQualification(qual);
      setCriteria(crit);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load qualification"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { qualification, criteria, loading, error, refetch: fetch };
}
