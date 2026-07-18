"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBoard, type BoardItem } from "@/lib/hooks";
import { Flag, StatusChip, StageChip } from "@/components/ui";
import { kickoffLabel, relativeKickoff } from "@/lib/format";

type Tab = "live" | "upcoming" | "results";

export default function MatchBoard() {
  const { items, mode, loading } = useBoard();
  const [tab, setTab] = useState<Tab>("upcoming");

  const groups = useMemo(() => {
    const live = items.filter((i) => i.fixture.status === "live");
    const upcoming = items
      .filter((i) => i.fixture.status === "scheduled")
      .sort((a, b) => +new Date(a.fixture.kickoff) - +new Date(b.fixture.kickoff));
    const results = items
      .filter((i) => i.fixture.status === "final")
      .sort((a, b) => +new Date(b.fixture.kickoff) - +new Date(a.fixture.kickoff));
    return { live, upcoming, results };
  }, [items]);

  const active = tab === "live" ? groups.live : tab === "upcoming" ? groups.upcoming : groups.results;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "live", label: "Live", count: groups.live.length },
    { id: "upcoming", label: "Upcoming", count: groups.upcoming.length },
    { id: "results", label: "Results", count: groups.results.length },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                tab === t.id ? "bg-surface-3 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t.id === "live" && t.count > 0 && <span className="live-dot mr-1.5 inline-block" />}
              {t.label}
              <span className="ml-1.5 text-xs text-faint">{t.count}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto chip">
          feed: {mode ?? "…"}
        </span>
      </div>

      {loading && items.length === 0 ? (
        <div className="card grid place-items-center py-20 text-muted">Loading the feed…</div>
      ) : active.length === 0 ? (
        <div className="card grid place-items-center py-20 text-muted">
          No {tab} matches right now.
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((it) => (
            <MatchRow key={it.fixture.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchRow({ item }: { item: BoardItem }) {
  const { fixture: f, oneXtwo } = item;
  const isFinal = f.status === "final";
  return (
    <Link
      href={`/markets/${f.id}`}
      className="card grid grid-cols-[1fr_auto] items-center gap-4 p-3.5 transition hover:border-border-bright sm:grid-cols-[1.4fr_auto]"
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <StageChip fixture={f} />
          <StatusChip fixture={f} />
          <span className="hidden text-xs text-faint sm:inline">
            {f.status === "scheduled" ? `${kickoffLabel(f.kickoff)} · ${relativeKickoff(f.kickoff)}` : f.venue}
          </span>
        </div>
        <div className="space-y-1">
          <TeamLine code={f.home.code} flag={f.home.flag} name={f.home.name} score={f.score?.home} dim={isFinal && f.outcome !== "1"} />
          <TeamLine code={f.away.code} flag={f.away.flag} name={f.away.name} score={f.score?.away} dim={isFinal && f.outcome !== "2"} />
        </div>
      </div>

      {oneXtwo && (
        <div className="grid w-[190px] grid-cols-3 gap-1.5 sm:w-[220px]">
          <OddsCell label="1" value={oneXtwo.home} win={isFinal && f.outcome === "1"} />
          <OddsCell label="X" value={oneXtwo.draw} win={isFinal && f.outcome === "X"} />
          <OddsCell label="2" value={oneXtwo.away} win={isFinal && f.outcome === "2"} />
        </div>
      )}
    </Link>
  );
}

function TeamLine({
  code,
  flag,
  name,
  score,
  dim,
}: {
  code: string;
  flag: string;
  name: string;
  score?: number;
  dim?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${dim ? "opacity-45" : ""}`}>
      <Flag code={code} flag={flag} />
      <span className="truncate font-bold">{name}</span>
      {score !== undefined && (
        <span className="ml-auto mono text-lg font-black tabular-nums sm:ml-2">{score}</span>
      )}
    </div>
  );
}

function OddsCell({ label, value, win }: { label: string; value: number; win?: boolean }) {
  return (
    <div className="odds" data-active={win ? "true" : "false"}>
      <span className="text-[10px] font-bold uppercase text-faint">{label}</span>
      <span className="mono text-sm font-bold">{value.toFixed(2)}</span>
    </div>
  );
}
