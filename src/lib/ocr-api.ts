/**
 * Client for Aman's "AI Invoice OCR API" (separate from the AP-workflow API
 * in `@/lib/api`).
 *
 * Notable differences from the AP client:
 *  - Talks to `VITE_OCR_API_BASE_URL` (default `/ocr-api`, proxied to the OCR
 *    backend by Vite in dev and Vercel in prod — see vite.config / vercel.json).
 *  - Unwraps the NestJS `{ success, data }` success envelope automatically.
 *  - Does NOT boot the user on a 401. The OCR service may authenticate
 *    separately from the AP service, so an OCR auth failure must not destroy
 *    the AP session — it surfaces as an inline error on OCR screens instead.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS, readJSON } from './storage';
import { normalizePaginated } from './ocr';
import type {
  OcrInvoice,
  OcrListParams,
  OcrStats,
  Paginated,
} from '@/types/ocr';

const OCR_BASE_URL =
  (import.meta.env.VITE_OCR_API_BASE_URL as string | undefined) ?? '/ocr-api';

export const ocrApiClient = axios.create({
  baseURL: OCR_BASE_URL,
  timeout: 30_000,
  headers: {
    'ngrok-skip-browser-warning': '1',
  },
});

// Attach the stored JWT. The OCR service expects a Bearer token; we reuse the
// app session token (configurable upstream if the OCR service ever issues its
// own credentials).
ocrApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readJSON<string | null>(STORAGE_KEYS.authToken, null);
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

// Unwrap `{ success, data }`; reject on `{ success: false }`. Skips blobs and
// any payload that isn't the standard envelope.
ocrApiClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (
      data &&
      typeof data === 'object' &&
      !(data instanceof Blob) &&
      !Array.isArray(data) &&
      'success' in (data as Record<string, unknown>)
    ) {
      const env = data as Record<string, unknown>;
      if (env.success === false) {
        return Promise.reject(
          new OcrApiError(
            (env.message as string) || (env.error as string) || 'OCR request failed',
            (env.statusCode as number) ?? response.status,
          ),
        );
      }
      if ('data' in env) {
        response.data = env.data;
      }
    }
    return response;
  },
  (error) => Promise.reject(error),
);

/** Error carrying the OCR envelope's message + status (not an Axios error). */
export class OcrApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'OcrApiError';
    this.statusCode = statusCode;
  }
}

/** True when the OCR service rejected the request for auth reasons. */
export function isOcrAuthError(err: unknown): boolean {
  if (err instanceof OcrApiError) return err.statusCode === 401 || err.statusCode === 403;
  if (axios.isAxiosError(err)) {
    const s = err.response?.status;
    return s === 401 || s === 403;
  }
  return false;
}

/** Pull a readable message from any OCR error shape. */
export function extractOcrError(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof OcrApiError) return err.message;
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

// Strip empty/undefined params so we never send `?status=&supplier=`.
function cleanParams(params: OcrListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v as string | number;
  }
  return out;
}

export interface OcrUploadResult {
  id?: string;
  status?: string;
  fileName?: string;
  message?: string;
  [key: string]: unknown;
}

/** Resolved file download: the raw blob plus what the server said it is. */
export interface OcrFileResult {
  blob: Blob;
  contentType: string;
  fileName: string | null;
}

function filenameFromDisposition(disposition: unknown): string | null {
  if (typeof disposition !== 'string') return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star?.[1]) return decodeURIComponent(star[1].replace(/"/g, '').trim());
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() ?? null;
}

export const ocrApi = {
  /** POST /invoices/upload — multipart `file`. Async (202); body may be minimal. */
  upload: async (file: File): Promise<OcrUploadResult> => {
    const form = new FormData();
    form.append('file', file, file.name);
    const { data } = await ocrApiClient.post<OcrUploadResult>('/invoices/upload', form);
    return data ?? {};
  },

  /** GET /invoices/stats */
  stats: async (): Promise<OcrStats> => {
    const { data } = await ocrApiClient.get<OcrStats>('/invoices/stats');
    return data ?? {};
  },

  /** GET /invoices/review-queue — invoices waiting for human review. */
  reviewQueue: async (params: OcrListParams = {}): Promise<Paginated<OcrInvoice>> => {
    const { data } = await ocrApiClient.get('/invoices/review-queue', {
      params: cleanParams(params),
    });
    return normalizePaginated<OcrInvoice>(data, {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
    });
  },

  /** GET /invoices — full list with filters. */
  list: async (params: OcrListParams = {}): Promise<Paginated<OcrInvoice>> => {
    const { data } = await ocrApiClient.get('/invoices', {
      params: cleanParams(params),
    });
    return normalizePaginated<OcrInvoice>(data, {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
    });
  },

  /** GET /invoices/{id} */
  get: async (id: string): Promise<OcrInvoice> => {
    const { data } = await ocrApiClient.get<OcrInvoice>(`/invoices/${id}`);
    return data;
  },

  /** POST /invoices/{id}/retry — re-run OCR. Async (202). */
  retry: async (id: string): Promise<OcrUploadResult> => {
    const { data } = await ocrApiClient.post<OcrUploadResult>(`/invoices/${id}/retry`);
    return data ?? {};
  },

  /** GET /invoices/{id}/file — original document as a blob. */
  downloadFile: async (id: string): Promise<OcrFileResult> => {
    const res = await ocrApiClient.get(`/invoices/${id}/file`, {
      responseType: 'blob',
    });
    const blob = res.data as Blob;
    const contentType =
      (res.headers?.['content-type'] as string | undefined) ||
      blob.type ||
      'application/octet-stream';
    return {
      blob,
      contentType,
      fileName: filenameFromDisposition(res.headers?.['content-disposition']),
    };
  },
};
