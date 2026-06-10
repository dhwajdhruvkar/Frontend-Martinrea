/**
 * Tolerant read helpers + response normalizers for the OCR API.
 *
 * The OpenAPI spec doesn't pin down the response body shape, so everything the
 * UI reads off an `OcrInvoice` goes through an accessor here. If the backend
 * names a field differently than we guessed, fix it in ONE place.
 */
import type { OcrInvoice, OcrLineItem, OcrStats, Paginated } from '@/types/ocr';

// ─── Primitive coercion ─────────────────────────────────────────────────────
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/[^0-9.+-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const v of values) {
    const n = toNumber(v);
    if (n !== null) return n;
  }
  return null;
}

// ─── Field accessors ────────────────────────────────────────────────────────
export function getSupplier(inv: OcrInvoice): string | null {
  return firstString(inv.supplier, inv.supplierName, inv.vendorName);
}

export function getInvoiceNumber(inv: OcrInvoice): string | null {
  return firstString(inv.invoiceNumber, inv['invoice_number'], inv.poNumber);
}

export function getDocumentType(inv: OcrInvoice): string | null {
  return firstString(inv.documentType, inv['document_type'], inv['docType']);
}

export function getCurrency(inv: OcrInvoice): string {
  return firstString(inv.currency, inv['currencyCode']) ?? 'USD';
}

export function getTotal(inv: OcrInvoice): number | null {
  return firstNumber(inv.totalAmount, inv.total, inv['grandTotal'], inv['amount']);
}

/**
 * OCR confidence as a 0–100 number. The contract documents 0–100; if a backend
 * ever sends a 0–1 fraction, normalize it here (single source of truth).
 */
export function getConfidence(inv: OcrInvoice): number | null {
  const raw = firstNumber(
    inv.confidence,
    inv.confidenceScore,
    inv.ocrConfidence,
    inv['confidence_score'],
  );
  if (raw === null) return null;
  const score = raw > 0 && raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getCreatedAt(inv: OcrInvoice): string | null {
  return firstString(inv.createdAt, inv['created_at'], inv['uploadedAt']);
}

export function getUpdatedAt(inv: OcrInvoice): string | null {
  return firstString(inv.updatedAt, inv['updated_at'], inv.processedAt);
}

export function getFileName(inv: OcrInvoice): string | null {
  return firstString(inv.fileName, inv.originalFileName, inv['file_name']);
}

export function getMimeType(inv: OcrInvoice): string | null {
  return firstString(inv.mimeType, inv.fileType, inv['file_type'], inv['contentType']);
}

export function getErrorMessage(inv: OcrInvoice): string | null {
  return firstString(inv.errorMessage, inv.failureReason, inv['error']);
}

export function getReviewReason(inv: OcrInvoice): string | null {
  return firstString(inv.reviewReason, inv['flagReason'], inv['reason']);
}

/**
 * The structured OCR output as flat key→value pairs for generic display.
 * Pulls from whichever nested bag the backend uses, then falls back to the
 * well-known top-level fields so there's always something useful to show.
 */
export function getExtractedFields(inv: OcrInvoice): Record<string, unknown> {
  const bag =
    (inv.extracted && typeof inv.extracted === 'object' ? inv.extracted : null) ??
    (inv.extractedData && typeof inv.extractedData === 'object'
      ? inv.extractedData
      : null) ??
    (inv.fields && typeof inv.fields === 'object' ? inv.fields : null);

  if (bag) return bag as Record<string, unknown>;

  // Derive a sensible set from the flat record when nothing is nested.
  const derived: Record<string, unknown> = {};
  const supplier = getSupplier(inv);
  const invoiceNumber = getInvoiceNumber(inv);
  const total = getTotal(inv);
  if (invoiceNumber) derived['Invoice number'] = invoiceNumber;
  if (supplier) derived['Supplier'] = supplier;
  if (inv.poNumber) derived['PO number'] = inv.poNumber;
  if (inv.invoiceDate) derived['Invoice date'] = inv.invoiceDate;
  if (inv.dueDate) derived['Due date'] = inv.dueDate;
  if (toNumber(inv.subtotal) !== null) derived['Subtotal'] = inv.subtotal;
  if (toNumber(inv.taxAmount) !== null) derived['Tax'] = inv.taxAmount;
  if (total !== null) derived['Total'] = total;
  return derived;
}

export function getLineItems(inv: OcrInvoice): OcrLineItem[] {
  if (Array.isArray(inv.lineItems)) return inv.lineItems;
  const nested = inv.extracted ?? inv.extractedData ?? inv.fields;
  if (nested && typeof nested === 'object') {
    const li = (nested as Record<string, unknown>)['lineItems'];
    if (Array.isArray(li)) return li as OcrLineItem[];
  }
  return [];
}

/** Humanize an extracted-field key like `invoice_number` → "Invoice number". */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render an extracted value to a display string. */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ─── Response normalizers ───────────────────────────────────────────────────
const ARRAY_KEYS = ['items', 'data', 'results', 'invoices', 'records', 'rows', 'docs'];
const TOTAL_KEYS = ['total', 'totalCount', 'totalItems', 'count'];
const PAGE_KEYS = ['page', 'currentPage', 'pageNumber'];
const LIMIT_KEYS = ['limit', 'pageSize', 'perPage', 'size'];
const TOTAL_PAGES_KEYS = ['totalPages', 'pageCount', 'pages', 'lastPage'];

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (k in obj && obj[k] != null) return obj[k];
  return undefined;
}

function findArray(obj: Record<string, unknown>): unknown[] | null {
  for (const k of ARRAY_KEYS) {
    if (Array.isArray(obj[k])) return obj[k] as unknown[];
  }
  // One level deeper (e.g. { data: { items: [...] } }).
  for (const k of ARRAY_KEYS) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = findArray(v as Record<string, unknown>);
      if (inner) return inner;
    }
  }
  return null;
}

/**
 * Coerce any of the common paginated shapes into a canonical `Paginated<T>`.
 * Handles bare arrays, `{data,total,page,limit}`, `{items,meta:{…}}`, etc.
 */
export function normalizePaginated<T>(
  raw: unknown,
  fallback: { page: number; limit: number },
): Paginated<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      total: raw.length,
      page: fallback.page,
      limit: fallback.limit,
      totalPages: 1,
    };
  }

  if (!raw || typeof raw !== 'object') {
    return { items: [], total: 0, page: fallback.page, limit: fallback.limit, totalPages: 0 };
  }

  const obj = raw as Record<string, unknown>;
  const items = (findArray(obj) ?? []) as T[];

  // Pagination metadata may sit at the top level or inside meta/pagination.
  const metaObj =
    (obj.meta && typeof obj.meta === 'object' ? (obj.meta as Record<string, unknown>) : null) ??
    (obj.pagination && typeof obj.pagination === 'object'
      ? (obj.pagination as Record<string, unknown>)
      : null) ??
    obj;

  const total =
    toNumber(pick(metaObj, TOTAL_KEYS)) ?? toNumber(pick(obj, TOTAL_KEYS)) ?? items.length;
  const page = toNumber(pick(metaObj, PAGE_KEYS)) ?? fallback.page;
  const limit = toNumber(pick(metaObj, LIMIT_KEYS)) ?? fallback.limit;
  const totalPages =
    toNumber(pick(metaObj, TOTAL_PAGES_KEYS)) ??
    (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);

  return { items, total, page, limit, totalPages };
}

/** Flatten an `OcrStats` payload into a status→count map for tiles/charts. */
export function statusCounts(stats: OcrStats | undefined | null): Record<string, number> {
  if (!stats) return {};
  const map = stats.byStatus ?? stats.statusCounts;
  if (map && typeof map === 'object') {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(map)) {
      const n = toNumber(v);
      if (n !== null) out[k.toUpperCase()] = n;
    }
    if (Object.keys(out).length) return out;
  }
  // Fall back to flat count fields.
  const out: Record<string, number> = {};
  const flat: Array<[string, unknown]> = [
    ['RECEIVED', stats.received],
    ['OCR_PROCESSING', stats.processing],
    ['PENDING_REVIEW', stats.pendingReview],
    ['COMPLETED', stats.completed],
    ['FAILED', stats.failed],
    ['REJECTED', stats.rejected],
    ['DUPLICATE_INVOICE', stats.duplicates],
  ];
  for (const [k, v] of flat) {
    const n = toNumber(v);
    if (n !== null) out[k] = n;
  }
  return out;
}
