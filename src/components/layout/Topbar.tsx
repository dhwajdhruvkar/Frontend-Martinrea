import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, HelpCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/auth/useAuth';
import { NAV_SECTIONS } from './nav-items';
import { initials } from '@/lib/utils';
import { CreateInvoiceModal } from '@/components/invoices/CreateInvoiceModal';
import { RolePill } from '@/components/auth/RolePill';
import { profileFor } from '@/lib/permissions';

function useBreadcrumb(): string[] {
  const { pathname } = useLocation();
  return useMemo(() => {
    const trail: string[] = ['Workspace'];
    for (const sec of NAV_SECTIONS) {
      const match = sec.items.find((i) => pathname.startsWith(i.to));
      if (match) {
        trail[0] = sec.heading;
        trail.push(match.label);
        break;
      }
    }
    return trail;
  }, [pathname]);
}

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const trail = useBreadcrumb();
  const [createOpen, setCreateOpen] = useState(false);

  const profile = profileFor(user?.role);
  const canCreate = profile?.canCreate ?? false;

  // ⌘K / Ctrl-K focuses the search box; ⌘N / Ctrl-N opens "New Invoice" if allowed.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && canCreate) {
        e.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canCreate]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-white/95 px-6 backdrop-blur-sm">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        {trail.map((seg, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />}
            <span
              className={
                i === trail.length - 1
                  ? 'font-semibold text-ink'
                  : 'font-medium'
              }
            >
              {seg}
            </span>
          </span>
        ))}
      </nav>

      {/* Search */}
      <div className="relative ml-6 hidden flex-1 max-w-md md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
        <input
          id="global-search"
          type="text"
          placeholder="Search invoices, suppliers, POs…"
          className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-16 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const q = (e.target as HTMLInputElement).value.trim();
              if (q) navigate(`/invoices?q=${encodeURIComponent(q)}`);
            }
          }}
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-muted md:inline-flex">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2">
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        )}

        <Button variant="ghost" size="icon" aria-label="Help">
          <HelpCircle className="h-[18px] w-[18px] text-ink-muted" />
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-[18px] w-[18px] text-ink-muted" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </Button>

        <div className="mx-1 h-7 w-px bg-line" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-0.5 pl-2 pr-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[13px] font-semibold text-ink">
                  {user?.fullName ?? 'Guest'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {profile?.label ?? user?.role}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white">
                {initials(user?.fullName ?? 'G U')}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Signed in</DropdownMenuLabel>
            <div className="px-2 pb-2 pt-1">
              <p className="text-sm font-medium text-ink">{user?.fullName}</p>
              <p className="text-xs text-ink-muted">{user?.email}</p>
              {user && (
                <div className="mt-2.5">
                  <RolePill role={user.role} showCap size="md" />
                </div>
              )}
              {profile && (
                <>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                    What you can do
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {profile.capabilities.map((cap) => (
                      <li
                        key={cap}
                        className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
              Go to Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/admin')}>
              Admin Panel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={logout}
              className="text-red-600 focus:text-red-700"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {canCreate && (
        <CreateInvoiceModal open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </header>
  );
}
