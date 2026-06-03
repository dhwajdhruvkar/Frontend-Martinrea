import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_SECTIONS } from '@/components/layout/nav-items';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoonPage({
  title,
  description,
}: ComingSoonProps) {
  const { pathname } = useLocation();
  const item = NAV_SECTIONS.flatMap((s) => s.items).find((i) =>
    pathname.startsWith(i.to),
  );

  const Icon = item?.icon ?? Construction;
  const heading = title ?? item?.label ?? 'Module not yet shipped';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">
          {heading}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Part of the Martinrea roadmap. Ships in a future Phase 1 milestone.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-brand-50 blur-xl" />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand shadow-elevated">
              <Icon className="h-7 w-7" strokeWidth={1.6} />
            </div>
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-[18px] font-semibold text-ink">
              {heading} is under construction
            </h2>
            <p className="text-[13.5px] leading-relaxed text-ink-muted">
              {description ??
                `The ${heading} module will ship as part of the Martinrea Phase 1 rollout. The data contract is locked, the design is in review, and the build is scheduled.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/invoices">
                <Sparkles className="h-4 w-4" />
                Open Invoice Processing
              </Link>
            </Button>
          </div>

          <p className="text-[11.5px] text-ink-subtle">
            Need this sooner? Talk to the Workflow team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
