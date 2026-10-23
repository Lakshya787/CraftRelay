/**
 * lib/apiClient.ts — Central HTTP client for the CraftRelay API.
 *
 * Responsibilities
 * • Prefix requests with EXPO_PUBLIC_API_BASE_URL.
 * • Attach the Bearer token from SecureStore unless a caller supplies one.
 * • Unwrap the backend's {success, data, message} envelope.
 * • Normalise FastAPI / CraftRelay error bodies into ApiError.
 * • Support multipart uploads (never set Content-Type manually) and timeouts.
 *
 * The mobile app must not embed backend secrets. Only the public API base URL
 * comes from the Expo environment.
 */

import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "craftrelay_access_token";

// The API host is always supplied by the build/runtime environment. In
// particular, release builds must never silently fall back to a dev host.
const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

// ── Envelope types ────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string | null;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ApiErrorDetail {
  field?: string | null;
  message: string;
}

interface ApiErrorBody {
  success?: false;
  errors?: ApiErrorDetail[];
  message?: string;
  detail?: string | ApiErrorDetail[] | Record<string, unknown>;
}

// ── Error ─────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(message: string, status: number, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** True when the request failed because the device has no connection. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!BASE_URL) {
    throw new ApiError("CraftRelay is not configured with an API address. Contact the demo team.", 0);
  }
  if (!__DEV__ && !BASE_URL.startsWith("https://")) {
    throw new ApiError("CraftRelay requires a secure API connection. Contact the demo team.", 0);
  }
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function messageFromBody(body: ApiErrorBody | null, fallback: string): string {
  if (!body) return fallback;
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors.map((e) => e.message).join(" ");
  }
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    // FastAPI 422 validation errors
    return body.detail
      .map((d) => (typeof d === "object" && d && "message" in d
        ? String((d as ApiErrorDetail).message)
        : JSON.stringify(d)))
      .join(" ");
  }
  if (typeof body.message === "string" && body.message.length > 0) {
    return body.message;
  }
  return fallback;
}

function detailsFromBody(body: ApiErrorBody | null): ApiErrorDetail[] {
  if (!body) return [];
  if (Array.isArray(body.errors)) return body.errors;
  if (Array.isArray(body.detail)) {
    return body.detail.map((d) =>
      typeof d === "object" && d && "message" in d
        ? (d as ApiErrorDetail)
        : { message: String(d) }
    );
  }
  return [];
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    const text = await response.text();
    body = text ? (JSON.parse(text) as ApiErrorBody) : null;
  } catch {
    // Non-JSON body (proxy error page, empty response)
  }
  const fallback = `Request failed (${response.status}).`;
  return new ApiError(
    messageFromBody(body, fallback),
    response.status,
    detailsFromBody(body)
  );
}

async function authHeaders(explicitToken?: string | null): Promise<Record<string, string>> {
  const token = explicitToken ?? (await SecureStore.getItemAsync(TOKEN_KEY));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function requestEnvelope<T>(
  method: string,
  path: string,
  options: RequestOptions & { body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: {
        Accept: "application/json",
        ...(await authHeaders(options.headers?.Authorization)),
        ...(options.formData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw new ApiError(
      "Unable to reach CraftRelay. Check your connection and try again.",
      0
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

async function unwrap<T>(
  method: string,
  path: string,
  options: RequestOptions & { body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const envelope = await requestEnvelope<ApiSuccessResponse<T>>(
    method,
    path,
    options
  );
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return envelope.data as T;
  }
  // Defensive: an endpoint that does not use the success envelope.
  return envelope as unknown as T;
}

// ── Public client ─────────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return unwrap<T>("GET", path, options);
  },

  getPaginated<T>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiPaginatedResponse<T>> {
    return requestEnvelope<ApiPaginatedResponse<T>>("GET", path, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return unwrap<T>("POST", path, { ...options, body });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return unwrap<T>("PATCH", path, { ...options, body });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return unwrap<T>("PUT", path, { ...options, body });
  },

  async delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    const envelope = await requestEnvelope<ApiSuccessResponse<T> | undefined>(
      "DELETE",
      path,
      options
    );
    if (envelope && typeof envelope === "object" && "data" in envelope) {
      return envelope.data as T;
    }
    return undefined as T;
  },

  async upload<T>(
    path: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
    headers?: Record<string, string>
  ): Promise<T> {
    // React Native's fetch does not expose upload progress. Show indeterminate
    // progress via the callback contract so callers keep a single API.
    onProgress?.(0);
    const result = await unwrap<T>("POST", path, {
      formData,
      headers,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    });
    onProgress?.(100);
    return result;
  },
};

export type ApiClient = typeof apiClient;
