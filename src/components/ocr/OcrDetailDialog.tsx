import { Loader2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOcrInvoice } from '@/hooks/useOcr';
import { extractOcrError } from '@/lib/ocr-api';
import { OcrDetailPanel } from '@/components/ocr/OcrDetailPanel';
import type { OcrInvoice } from '@/types/ocr';

export function OcrDetailDialog({
  invoiceId,
  fallback,
  open,
  onOpenChange,
}: {
  invoiceId: string | null;
  /** Summary row already in hand — shown instantly while the detail loads. */
  fallback?: OcrInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useOcrInvoice(open ? invoiceId : null);
  const invoice = query.data ?? fallback ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-line px-5 py-3.5">
          <DialogTitle>Document review</DialogTitle>
          <DialogDescription>
            Verify the OCR-extracted data against the source document.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-hidden">
          {!invoice && query.isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[13px]">Loading document…</span>
            </div>
          ) : !invoice ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <XCircle className="h-8 w-8 text-rose-500" />
              <p className="text-[14px] font-semibold text-ink">Couldn't load this document</p>
              <p className="max-w-sm text-[12.5px] text-ink-muted">
                {query.error ? extractOcrError(query.error) : 'The document may no longer exist.'}
              </p>
            </div>
          ) : (
            <OcrDetailPanel invoice={invoice} className="lg:h-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
