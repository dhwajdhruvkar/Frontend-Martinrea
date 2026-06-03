import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { invoicesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { invoiceRegistry } from '@/lib/invoice-registry';
import type { Invoice } from '@/types/invoice';

/** True if the error is an Axios 404/410 (i.e. invoice no longer exists). */
function isGoneError(err: unknown): boolean {
  if (!(err instanceof AxiosError)) return false;
  const status = err.response?.status;
  return status === 404 || status === 410;
}

/**
 * Stable references passed to `useSyncExternalStore`.
 *
 * - `subscribe` and `getSnapshot` must have stable identity across renders
 *   (subscribe identity churn forces re-subscriptions; snapshot churn causes
 *   the dreaded "Maximum update depth exceeded" loop).
 * - `EMPTY_IDS` is the SSR/initial snapshot — must be the same reference
 *   each call, otherwise the same loop occurs during hydration.
 */
const EMPTY_IDS: readonly string[] = Object.freeze([]);
const subscribeIds = invoiceRegistry.subscribe;
const getSnapshotIds = invoiceRegistry.list;
const getServerSnapshotIds = (): readonly string[] => EMPTY_IDS;

/** Reactively read the known invoice IDs from the registry. */
export function useKnownInvoiceIds(): readonly string[] {
  return useSyncExternalStore(
    subscribeIds,
    getSnapshotIds,
    getServerSnapshotIds,
  );
}

export function useInvoice(id: string | undefined | null) {
  const query = useQuery({
    queryKey: id ? queryKeys.invoice(id) : ['invoice', 'noop'],
    queryFn: () => invoicesApi.get(id!),
    enabled: !!id,
  });

  // Self-register any invoice we successfully fetched (covers deep-links).
  useEffect(() => {
    if (id && query.data) invoiceRegistry.add(id);
  }, [id, query.data]);

  // Self-prune any stale ID — if the backend says 404/410, drop it from the
  // client registry so list pages stop trying to refetch it.
  useEffect(() => {
    if (id && isGoneError(query.error)) invoiceRegistry.remove(id);
  }, [id, query.error]);

  return query;
}

export function useAllowedTransitions(id: string | undefined | null) {
  return useQuery({
    queryKey: id ? queryKeys.invoiceTransitions(id) : ['transitions', 'noop'],
    queryFn: () => invoicesApi.allowedTransitions(id!),
    enabled: !!id,
  });
}

/**
 * Fan-out fetch of every invoice currently in the registry, in parallel.
 * Returns the full list plus a pending flag and counts derived for UIs.
 *
 * The derived `invoices` and `errors` arrays are memoised against the
 * underlying query state so consumers (e.g. `useMemo` in DashboardPage)
 * get stable references between renders.
 */
export function useInvoicesList() {
  const ids = useKnownInvoiceIds();

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.invoice(id),
      queryFn: () => invoicesApi.get(id),
      staleTime: 30_000,
    })),
  });

  const isLoading =
    ids.length > 0 && queries.some((q) => q.isLoading || q.isPending);
  const isFetching = queries.some((q) => q.isFetching);

  // Auto-prune the registry of any ID whose fetch came back 404/410. This
  // covers the case where the DB was wiped under us — without it, the page
  // would forever show "couldn't load N invoices" for the stale IDs.
  const goneIds = ids.filter((_, i) => isGoneError(queries[i]?.error));
  useEffect(() => {
    if (goneIds.length > 0) invoiceRegistry.removeMany(goneIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goneIds.join('|')]);

  // Use stable signatures (joined ids + length) so memoised arrays only
  // re-compute when the underlying data actually shifts.
  const dataSignature = queries
    .map((q) => (q.data ? q.data.updatedAt : ''))
    .join('|');
  const errorCount = queries.filter((q) => q.error && !isGoneError(q.error)).length;

  const invoices = useMemo<Invoice[]>(() => {
    const list = queries
      .map((q) => q.data)
      .filter((i): i is Invoice => !!i);
    list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSignature]);

  const errors = useMemo<Error[]>(
    () =>
      queries
        .map((q) => q.error)
        .filter((e): e is Error => e instanceof Error),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [errorCount],
  );

  return {
    invoices,
    ids,
    isEmpty: ids.length === 0,
    isLoading,
    isFetching,
    errors,
  };
}
