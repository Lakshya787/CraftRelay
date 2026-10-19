/**
 * hooks/useWorkerSkills.ts — Worker skill declaration hooks.
 *
 * useWorkerSkills(): fetch my declared skills
 * useSkillCatalogue(): fetch the platform skill catalogue
 * useDeclareSkill(): POST /workers/me/skills
 * useRemoveSkill(): DELETE /workers/me/skills/:skillId
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError, ApiPaginatedResponse } from "../lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillData {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface WorkerSkillData {
  id: string;
  skill_id: string;
  proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
  years_used: number | null;
  notes: string | null;
  skill: SkillData;
}

// ── My skills ─────────────────────────────────────────────────────────────────

export function useWorkerSkills() {
  const [skills, setSkills] = useState<WorkerSkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WorkerSkillData[]>("/workers/me/skills");
      setSkills(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { skills, loading, error, refetch: fetch };
}

// ── Skill catalogue ───────────────────────────────────────────────────────────

export function useSkillCatalogue(search?: string, category?: string) {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page_size: "100" });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const data = await apiClient.getPaginated<SkillData>(`/skills?${params}`);
      setSkills(data.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load catalogue");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { skills, loading, error, refetch: fetch };
}

// ── Declare a skill ───────────────────────────────────────────────────────────

interface DeclareSkillPayload {
  skill_id: string;
  proficiency_level: string;
  years_used?: number | null;
  notes?: string | null;
}

export function useDeclareSkill() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const declare = useCallback(
    async (payload: DeclareSkillPayload): Promise<WorkerSkillData> => {
      setSubmitting(true);
      setError(null);
      try {
        const data = await apiClient.post<WorkerSkillData>(
          "/workers/me/skills",
          payload
        );
        return data;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to declare skill";
        setError(msg);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { declare, submitting, error };
}

// ── Remove a skill ────────────────────────────────────────────────────────────

export function useRemoveSkill() {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (skillId: string): Promise<void> => {
    setRemoving(true);
    setError(null);
    try {
      await apiClient.delete(`/workers/me/skills/${skillId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to remove skill";
      setError(msg);
      throw err;
    } finally {
      setRemoving(false);
    }
  }, []);

  return { remove, removing, error };
}
