import { NavLink } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS } from './nav-items';
import { useAuth } from '@/auth/useAuth';
import { formatApprovalCap, profileFor } from '@/lib/permissions';

export function Sidebar() {
  const { user } = useAuth();
  const profile = profileFor(user?.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col bg-sidebar text-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">
            Foundry AP
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.13em] text-sidebar-muted">
            Automation Suite
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading} className="mb-5">
            <h4 className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-sidebar-muted">
              {section.heading}
            </h4>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
                        'text-slate-200/85 hover:bg-sidebar-hover hover:text-white',
                        isActive &&
                          'bg-brand text-white shadow-sm hover:bg-brand-600 hover:text-white',
                      )
                    }
                  >
                    <item.icon
                      className="h-4 w-4 shrink-0 opacity-90"
                      strokeWidth={1.8}
                    />
                    <span className="truncate">{item.label}</span>
                    {!item.available && (
                      <span className="ml-auto rounded-sm bg-white/5 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-sidebar-muted">
                        soon
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        {profile ? (
          <div className="rounded-lg bg-sidebar-hover/60 p-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md',
                  profile.pillClass,
                )}
              >
                <profile.icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-white">
                  {profile.label}
                </p>
                <p className="text-[10.5px] text-sidebar-muted">
                  {profile.canApprove
                    ? `Approves ≤ ${formatApprovalCap(profile.approvalCap)}`
                    : profile.canCreate
                    ? 'Create & route invoices'
                    : 'View access'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-sidebar-hover/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              Phase 1 build
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              Workflow & approvals core. More modules ship next.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
