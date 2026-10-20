/**
 * hooks/useMarketplace.ts — Marketplace hooks for CraftRelay.
 *
 * Provides hooks for worker discovery, skills, reviews, service requests,
 * and request lifecycle management (accept, decline, start, complete, cancel, review).
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "../lib/apiClient";
import type {
  ApiWorkerSummary,
  ApiWorkerProfile,
  ApiWorkerSkillsResponse,
  ApiServiceRequest,
  ApiReview,
} from "../types/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

// ── Worker Discovery ──────────────────────────────────────────────────────────

export interface WorkerFilterParams {
  trade?: string;
  skill?: string;
  city?: string;
  state?: string;
  verified_only?: boolean;
}

export function useWorkers(params?: WorkerFilterParams) {
  const [workers, setWorkers] = useState<ApiWorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const trade = params?.trade;
  const skill = params?.skill;
  const city = params?.city;
  const state = params?.state;
  const verifiedOnly = params?.verified_only;

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: "1", page_size: "50" });
      if (trade) query.set("trade", trade);
      if (skill) query.set("skill", skill);
      if (city) query.set("city", city);
      if (state) query.set("state", state);
      if (verifiedOnly) query.set("verified_only", "true");

      const res = await apiClient.get<any>(`/workers?${query.toString()}`);
      const items = extractArray<ApiWorkerSummary>(res);
      setWorkers(items);
      setTotal(res?.total ?? items.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }, [trade, skill, city, state, verifiedOnly]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return { workers, loading, error, total, refetch: fetchWorkers };
}

// ── Worker Detail ─────────────────────────────────────────────────────────────

export function useWorkerDetail(workerId: string) {
  const [worker, setWorker] = useState<ApiWorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorker = useCallback(async () => {
    if (!workerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApiWorkerProfile>(`/workers/${workerId}`);
      setWorker(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load worker profile");
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchWorker();
  }, [fetchWorker]);

  return { worker, loading, error, refetch: fetchWorker };
}

// ── Worker Skills & Competencies ──────────────────────────────────────────────

export function useWorkerSkills(workerId: string) {
  const [skills, setSkills] = useState<ApiWorkerSkillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!workerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApiWorkerSkillsResponse>(`/workers/${workerId}/skills`);
      setSkills(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load worker skills");
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  return { skills, loading, error, refetch: fetchSkills };
}

// ── Worker Reviews ────────────────────────────────────────────────────────────

export function useWorkerReviews(workerId: string) {
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!workerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>(`/workers/${workerId}/reviews`);
      setReviews(extractArray<ApiReview>(res));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, loading, error, refetch: fetchReviews };
}

// ── Service Requests List ─────────────────────────────────────────────────────

export function useServiceRequests() {
  const [requests, setRequests] = useState<ApiServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>("/service-requests");
      setRequests(extractArray<ApiServiceRequest>(res));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load service requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, loading, error, refetch: fetchRequests };
}

// ── Service Request Detail ────────────────────────────────────────────────────

export function useServiceRequestDetail(requestId: string) {
  const [request, setRequest] = useState<ApiServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApiServiceRequest>(`/service-requests/${requestId}`);
      setRequest(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load request details");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { request, loading, error, refetch: fetchDetail, setRequest };
}

// ── Request Reviews ───────────────────────────────────────────────────────────

export function useServiceRequestReviews(requestId: string) {
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>(`/service-requests/${requestId}/reviews`);
      setReviews(extractArray<ApiReview>(res));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load request reviews");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, loading, error, refetch: fetchReviews };
}

// ── Create Service Request ────────────────────────────────────────────────────

export interface CreateRequestPayload {
  worker_profile_id: string;
  title: string;
  description?: string;
  service_location?: string;
  preferred_date?: string;
}

export function useCreateServiceRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(
    async (payload: CreateRequestPayload): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>("/service-requests", payload);
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to create service request";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createRequest, loading, error };
}

// ── Accept Request ────────────────────────────────────────────────────────────

export function useAcceptRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptRequest = useCallback(
    async (requestId: string): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>(
          `/service-requests/${requestId}/accept`,
          {}
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to accept service request";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { acceptRequest, loading, error };
}

// ── Decline Request ───────────────────────────────────────────────────────────

export function useDeclineRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const declineRequest = useCallback(
    async (requestId: string): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>(
          `/service-requests/${requestId}/decline`,
          {}
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to decline service request";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { declineRequest, loading, error };
}

// ── Start Request ─────────────────────────────────────────────────────────────

export function useStartRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRequest = useCallback(
    async (requestId: string): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>(
          `/service-requests/${requestId}/start`,
          {}
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to start service request";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { startRequest, loading, error };
}

// ── Worker Complete Request ───────────────────────────────────────────────────

export interface WorkerCompletePayload {
  worker_notes?: string;
  photo_url?: string;
}

export function useWorkerComplete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerComplete = useCallback(
    async (requestId: string, payload?: WorkerCompletePayload): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>(
          `/service-requests/${requestId}/complete-worker`,
          payload ?? {}
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to submit completion";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { workerComplete, loading, error };
}

// ── Customer Confirm Request ──────────────────────────────────────────────────

export interface CustomerConfirmPayload {
  customer_notes?: string;
}

export function useCustomerConfirm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerConfirm = useCallback(
    async (requestId: string, payload?: CustomerConfirmPayload): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>(
          `/service-requests/${requestId}/complete-customer`,
          payload ?? {}
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to confirm completion";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { customerConfirm, loading, error };
}

// ── Cancel Request ────────────────────────────────────────────────────────────

export function useCancelRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelRequest = useCallback(
    async (requestId: string): Promise<ApiServiceRequest> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiServiceRequest>(
          `/service-requests/${requestId}/cancel`,
          {}
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to cancel service request";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { cancelRequest, loading, error };
}

// ── Post Review ───────────────────────────────────────────────────────────────

export interface PostReviewPayload {
  rating: number;
  comment?: string;
}

export function usePostReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postReview = useCallback(
    async (requestId: string, payload: PostReviewPayload): Promise<ApiReview> => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<ApiReview>(
          `/service-requests/${requestId}/reviews`,
          payload
        );
        return res;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to post review";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { postReview, loading, error };
}
