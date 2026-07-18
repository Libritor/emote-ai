"use client";

import { useFixtures } from "@/lib/hooks";
import { Flag } from "@/components/ui";

export default function LiveTicker() {
  const { fixtures, mode } = useFixtures(12000);
  const live = fixtures.filter((f) => f.status === "live");
  const upcoming = fixtures.filter((f) => f.status === "scheduled").slice(0, 8);
  const items = [...live, ...upcoming];

  if (items.length === 0) {
    return (
      <div className="card flex items-center gap-3 px-4 py-2.5 text-sm text-muted">
        <span className="live-dot" /> Connecting to feed…
      </div>
    );
  }

  return (
    <div className="card flex items-center gap-3 overflow-hidden px-3 py-2">
      <span className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
        <span className="live-dot" />
        {mode === "live" ? "TxODDS Live" : "TxODDS Feed"}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((f) => (
          <div key={f.id} className="flex shrink-0 items-center gap-2 text-sm">
            <Flag code={f.home.code} flag={f.home.flag} size="text-base" />
            <span className="font-semibold">{f.home.code}</span>
            {f.status === "live" ? (
              <span className="mono rounded bg-surface-3 px-1.5 font-bold text-primary">
                {f.score?.home}–{f.score?.away}
              </span>
            ) : (
              <span className="text-faint">v</span>
            )}
            <span className="font-semibold">{f.away.code}</span>
            <Flag code={f.away.code} flag={f.away.flag} size="text-base" />
            {f.status === "live" && (
              <span className="mono text-xs text-primary">{f.minute}&rsquo;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
