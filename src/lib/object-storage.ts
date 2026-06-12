/**
 * OCI Object Storage access.
 *
 * All calls go through the same-origin `/oci-bucket` path, which the Vite dev
 * proxy and Vercel rewrite forward to the bucket's Pre-Authenticated Request
 * (PAR) URL. Proxying keeps browser calls same-origin (no CORS) and keeps the
 * PAR token out of the client bundle. Override the base with
 * `VITE_OCI_BUCKET_URL` if you ever want to hit the PAR directly.
 */
const OCI_BASE =
  (import.meta.env.VITE_OCI_BUCKET_URL as string | undefined) ?? '/oci-bucket';

/** A single object in the bucket (OCI ListObjects shape; most fields optional). */
export interface OciObject {
  name: string;
  size?: number;
  timeCreated?: string;
  timeModified?: string;
}

/**
 * Same-origin URL for a single object — safe to use as an <img>/<iframe> src.
 * Each path segment is encoded individually so nested object names (e.g.
 * `data-folder/file.png`) keep their `/` separators intact.
 */
export function ociObjectUrl(name: string): string {
  const encoded = name.split('/').map(encodeURIComponent).join('/');
  return `${OCI_BASE}/${encoded}`;
}

/**
 * List documents in the bucket. Folder placeholders (names ending in `/`) are
 * filtered out. Throws with a readable message on failure.
 */
export async function listBucketObjects(): Promise<OciObject[]> {
  let res: Response;
  try {
    res = await fetch(`${OCI_BASE}/?fields=name,size,timeCreated,timeModified`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('Network error — could not reach the storage bucket.');
  }
  if (!res.ok) {
    throw new Error(`Couldn't list the storage bucket (HTTP ${res.status}).`);
  }
  const data = (await res.json().catch(() => null)) as { objects?: OciObject[] } | null;
  const objects = Array.isArray(data?.objects) ? data!.objects! : [];
  return objects.filter((o) => o?.name && !o.name.endsWith('/'));
}

/**
 * Uploads a single document to the bucket (PUT through the proxy). The OCR
 * pipeline picks files up from the bucket. Resolves on success, throws with a
 * readable message on failure.
 */
export async function uploadInvoiceFile(file: File): Promise<void> {
  let res: Response;
  try {
    res = await fetch(ociObjectUrl(file.name), {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
  } catch {
    throw new Error('Network error — could not reach the storage bucket.');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail.trim() || `Upload failed (HTTP ${res.status}).`);
  }
}
