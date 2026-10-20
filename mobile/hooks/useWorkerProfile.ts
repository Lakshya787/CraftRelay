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

export interface WorkerVerificationData {
  id: string;
  qualification_id: string;
  qualification_code: string;
  qualification_title: string;
  trade: string;
  level: number;
  issuing_body: string;
  is_illustrative: boolean;
  status: string;
  certificate_number: string | null;
  qualification_version_number: number;
  awarded_by_id: string | null;
  created_at: string;
}

interface UseWorkerVerificationsResult {
  verifications: WorkerVerificationData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWorkerVerifications(): UseWorkerVerificationsResult {
  const [verifications, setVerifications] = useState<WorkerVerificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WorkerVerificationData[]>(
        "/workers/me/verifications"
      );
      setVerifications(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load verifications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { verifications, loading, error, refetch };
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
