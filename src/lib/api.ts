import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS, readJSON, remove } from './storage';
import type {
  AllowedTransitionsResponse,
  ApproveResult,
  CreateInvoicePayload,
  Invoice,
  InvoiceStatus,
} from '@/types/invoice';
import type { AuthUser, LoginResponse } from '@/types/user';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://bloating-plausibly-ardently.ngrok-free.dev/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    // Bypass ngrok-free's browser-warning interstitial when calling a tunnel
    // directly. Ignored by everything else (localhost, custom domains).
    'ngrok-skip-browser-warning': '1',
  },
});

// ─── Request interceptor: attach JWT ────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readJSON<string | null>(STORAGE_KEYS.authToken, null);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ─── Response interceptor: 401 → wipe + redirect ───────────────────────────
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      remove(STORAGE_KEYS.authToken);
      remove(STORAGE_KEYS.authUser);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/**
 * Pull the most useful error string from an Axios error.
 * NestJS validation errors come back as { message: string | string[] }.
 */
export function extractApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Endpoint helpers ───────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },
  me: async (): Promise<AuthUser> => {
    const { data } = await api.get<AuthUser>('/users/me');
    return data;
  },
};

export const invoicesApi = {
  get: async (id: string): Promise<Invoice> => {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },
  create: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const { data } = await api.post<Invoice>('/invoices', payload);
    return data;
  },
  allowedTransitions: async (id: string): Promise<AllowedTransitionsResponse> => {
    const { data } = await api.get<AllowedTransitionsResponse>(
      `/invoices/${id}/allowed-transitions`,
    );
    return data;
  },
  submitReview: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/submit-review`);
    return data;
  },
  submitMatch: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/submit-match`);
    return data;
  },
  approve: async (id: string): Promise<ApproveResult> => {
    const { data } = await api.post<ApproveResult>(`/invoices/${id}/approve`);
    return data;
  },
  reject: async (id: string, reason: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/reject`, {
      reason,
    });
    return data;
  },
  flagException: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/flag-exception`);
    return data;
  },
  transition: async (
    id: string,
    to: InvoiceStatus,
    notes?: string,
  ): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/transitions`, {
      to,
      notes,
    });
    return data;
  },
};

export const escalationApi = {
  runNow: async (): Promise<unknown> => {
    const { data } = await api.post('/escalation/run-now');
    return data;
  },
};
