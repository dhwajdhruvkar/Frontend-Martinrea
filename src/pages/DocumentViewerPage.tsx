import { useEffect, useState } from 'react';
import { FileSearch, FileText, Loader2, RotateCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ocrKeys, useOcrInvoices } from '@/hooks/useOcr';
import { OcrFilters, type OcrFilterValues } from '@/components/ocr/OcrFilters';
import { OcrDetailPanel } from '@/components/ocr/OcrDetailPanel';
import { Pagination } from '@/components/ocr/Pagination';
import { OcrEmptyState, OcrErrorBanner } from '@/components/ocr/OcrStates';
import {
  ConfidenceBadge,
  DocTypeBadge,
  OcrStatusBadge,
} from '@/components/ocr/OcrBadges';
import {
  getConfidence,
  getDocumentType,
  getFileName,
  getInvoiceNumber,
  getSupplier,
} from '@/lib/ocr';
import type { OcrInvoice } from '@/types/ocr';

const LIMIT = 20;

export default function DocumentViewerPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<OcrFilterValues>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OcrInvoice | null>(null);

  const params = { ...filters, page, limit: LIMIT };
  const { data, isLoading, isFetching, error, isError } = useOcrInvoices(params);
  const invoices = data?.items ?? [];

  // Keep a sensible selection: pick the first visible doc when the current
  // selection isn't part of the freshly loaded page.
  useEffect(() => {
    const items = data?.items ?? [];
    if (items.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((cur) => (cur && items.some((i) => i.id === cur.id) ? cur : items[0]));
  }, [data]);

  function applyFilters(next: OcrFilterValues) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink">Document Viewer</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Open the source PDF or image for any document alongside its OCR-captured data.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ocrKeys.all })}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      <OcrFilters value={filters} onChange={applyFilters} />

      {isError && <OcrErrorBanner error={error} />}

      {!isLoading && !isError && invoices.length === 0 ? (
        <OcrEmptyState
          title="No documents found"
          hint="Nothing matches the current filters. Upload an invoice or clear the filters to see results."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,380px)_1fr]">
          {/* Master list */}
          <div className="flex flex-col gap-3">
            <Card className="overflow-hidden">
              <CardContent className="max-h-[64vh] overflow-y-auto px-0">
                {isLoading ? (
                  <div className="space-y-1 p-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {invoices.map((inv) => (
                      <li key={inv.id}>
                        <DocListItem
                          invoice={inv}
                          active={selected?.id === inv.id}
                          onClick={() => setSelected(inv)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {data && data.total > 0 && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                itemsOnPage={invoices.length}
                isFetching={isFetching}
                onPageChange={setPage}
              />
            )}
          </div>

          {/* Detail / preview */}
          <div className="xl:sticky xl:top-20 xl:self-start">
            {selected ? (
              <Card>
                <CardContent className="p-4">
                  <OcrDetailPanel
                    invoice={selected}
                    className="xl:h-[calc(100vh-9rem)]"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-2 text-center">
                  <FileSearch className="h-8 w-8 text-ink-subtle" />
                  <p className="text-[13.5px] font-medium text-ink">Select a document</p>
                  <p className="max-w-xs text-[12.5px] text-ink-muted">
                    Choose a document from the list to preview its file and OCR-extracted fields.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DocListItem({
  invoice,
  active,
  onClick,
}: {
  invoice: OcrInvoice;
  active: boolean;
  onClick: () => void;
}) {
  const title = getInvoiceNumber(invoice) || getFileName(invoice) || 'Untitled';
  const supplier = getSupplier(invoice);
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors',
        active ? 'bg-brand-50' : 'hover:bg-canvas',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          active ? 'bg-brand text-white' : 'bg-slate-100 text-ink-muted',
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-ink">{title}</p>
          <ConfidenceBadge score={getConfidence(invoice)} />
        </div>
        <p className="mt-0.5 truncate text-[12px] text-ink-muted">{supplier || '—'}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <OcrStatusBadge status={invoice.status} size="sm" />
          <DocTypeBadge type={getDocumentType(invoice)} />
        </div>
      </div>
    </button>
  );
}
