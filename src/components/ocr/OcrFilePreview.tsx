import { Download, ExternalLink, FileText, Loader2, Lock, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOcrFile } from '@/hooks/useOcr';
import { isOcrAuthError } from '@/lib/ocr-api';

export function OcrFilePreview({
  invoiceId,
  fileName,
  enabled = true,
  className,
}: {
  invoiceId: string | null | undefined;
  fileName?: string | null;
  enabled?: boolean;
  className?: string;
}) {
  const file = useOcrFile(invoiceId, enabled);

  const downloadName = fileName || file.fileName || `invoice-${invoiceId ?? 'file'}`;

  let body: React.ReactNode;
  if (file.status === 'success') {
    if (isImage(file.contentType)) {
      body = (
        <div className="absolute inset-0 overflow-auto bg-slate-800/5 p-3">
          <img src={file.url} alt={downloadName} className="mx-auto max-w-full rounded shadow-sm" />
        </div>
      );
    } else if (isPdf(file.contentType, downloadName)) {
      body = (
        <iframe title={downloadName} src={file.url} className="absolute inset-0 h-full w-full" />
      );
    } else {
      body = <FilePreviewUnsupported url={file.url} name={downloadName} />;
    }
  } else if (file.status === 'error') {
    body = <FilePreviewError authError={isOcrAuthError(file.error)} message={file.error.message} />;
  } else {
    body = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-[12.5px]">Loading document…</p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border border-line bg-canvas', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-ink">
          <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          <span className="truncate">{downloadName}</span>
        </span>
        {file.status === 'success' && (
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm" title="Open in new tab">
              <a href={file.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="icon-sm" title="Download">
              <a href={file.url} download={downloadName}>
                <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="relative min-h-[320px] flex-1">{body}</div>
    </div>
  );
}

function isImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}

function isPdf(contentType: string, name: string): boolean {
  return contentType.includes('pdf') || name.toLowerCase().endsWith('.pdf');
}

function FilePreviewError({ authError, message }: { authError: boolean; message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      {authError ? (
        <>
          <Lock className="h-6 w-6 text-amber-500" />
          <p className="text-[13px] font-semibold text-ink">OCR service rejected the session</p>
          <p className="max-w-xs text-[12px] text-ink-muted">
            The document couldn't be loaded because the OCR service didn't accept the current
            credentials. It may authenticate separately from the workflow app.
          </p>
        </>
      ) : (
        <>
          <TriangleAlert className="h-6 w-6 text-rose-500" />
          <p className="text-[13px] font-semibold text-ink">Couldn't load the document</p>
          <p className="max-w-xs text-[12px] text-ink-muted">{message}</p>
        </>
      )}
    </div>
  );
}

function FilePreviewUnsupported({ url, name }: { url: string; name: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <FileText className="h-8 w-8 text-ink-subtle" />
      <p className="text-[13px] font-medium text-ink">Preview not available for this file type</p>
      <Button asChild variant="secondary" size="sm">
        <a href={url} download={name}>
          <Download className="h-4 w-4" />
          Download {name}
        </a>
      </Button>
    </div>
  );
}
