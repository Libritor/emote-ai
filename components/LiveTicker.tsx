"use client";

import Link from "next/link";
import { useFixtures } from "@/lib/hooks";
import { Flag } from "@/components/ui";
import { formatScoreline } from "@/lib/format";

export default function LiveTicker() {
  const { fixtures, mode, loading, error } = useFixtures(12000);
  const now = Date.now();
  const live = fixtures.filter((f) => f.status === "live");
  const upcoming = fixtures
    .filter((f) => f.status === "scheduled" && +new Date(f.kickoff) >= now)
    .slice(0, 8);
  const items = [...live, ...upcoming];

  if (items.length === 0) {
    return (
      <div className="card flex items-center gap-3 px-4 py-2.5 text-sm text-muted">
        <span className="live-dot" />
        {error ? "Feed unavailable. Retrying..." : loading ? "Connecting to feed..." : "No matches on the feed right now."}
      </div>
    );
  }

  return (
    <div className="card flex items-center gap-3 overflow-hidden px-3 py-2" aria-live="polite">
      <span className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
        <span className="live-dot" />
        {mode === "live" ? "TxODDS Live" : "TxODDS Simulated"}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((f) => (
          <Link key={f.id} href="/markets" className="flex shrink-0 items-center gap-2 text-sm hover:text-primary">
            <Flag code={f.home.code} flag={f.home.flag} size="text-base" />
            <span className="font-semibold">{f.home.code}</span>
            {f.status === "live" ? (
              <span className="mono rounded bg-surface-3 px-1.5 font-bold text-primary">
                {formatScoreline(f.score?.home, f.score?.away)}
              </span>
            ) : (
              <span className="text-faint">v</span>
            )}
            <span className="font-semibold">{f.away.code}</span>
            <Flag code={f.away.code} flag={f.away.flag} size="text-base" />
            {f.status === "live" && (
              <span className="mono text-xs text-primary">{f.minute}&rsquo;</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
