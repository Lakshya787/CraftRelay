/**
 * hooks/useWorkerProfile.ts — Worker profile data hook.
 *
 * Fetches the authenticated worker's profile from GET /workers/me.
 * Exposes updateProfile() for PATCH /workers/me.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "../lib/apiClient";

export interface WorkerProfileData {
  id: string;
  user_id: string;
  trade_title: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  is_available: boolean;
  average_rating: number | null;
  total_reviews: number;
}

export interface WorkerProfileUpdatePayload {
  trade_title?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  years_experience?: number | null;
  is_available?: boolean;
}

interface UseWorkerProfileResult {
  profile: WorkerProfileData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (data: WorkerProfileUpdatePayload) => Promise<void>;
  updating: boolean;
  updateError: string | null;
}

export function useWorkerProfile(): UseWorkerProfileResult {
  const [profile, setProfile] = useState<WorkerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WorkerProfileData>("/workers/me");
      setProfile(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateProfile = useCallback(
    async (data: WorkerProfileUpdatePayload) => {
      setUpdating(true);
      setUpdateError(null);
      try {
        const updated = await apiClient.patch<WorkerProfileData>("/workers/me", data);
        setProfile(updated);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Update failed";
        setUpdateError(msg);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    []
  );

  return {
    profile,
    loading,
    error,
    refetch: fetch,
    updateProfile,
    updating,
    updateError,
  };
}
