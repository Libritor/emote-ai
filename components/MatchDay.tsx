"use client";

import { useMemo, useState } from "react";
import { useOnchain } from "@/lib/solana/useOnchain";
import { isProgramConfigured } from "@/lib/solana/config";
import { useBoard } from "@/lib/hooks";
import { Flag } from "@/components/ui";
import { formatScoreline, kickoffLabel, relativeKickoff } from "@/lib/format";
import type { Outcome1x2 } from "@/lib/txodds/types";

type Picks = Record<number, Outcome1x2>;
const STORAGE_KEY = "pitchproof_picks";

// A light, believable leaderboard the player climbs into.
const LEADERBOARD = [
  { name: "goalmachine.sol", pts: 187, badges: 9 },
  { name: "tiki_taka", pts: 164, badges: 7 },
  { name: "xG_wizard", pts: 151, badges: 6 },
  { name: "parkedbus", pts: 133, badges: 5 },
  { name: "stoppage_time", pts: 121, badges: 4 },
];

export default function MatchDay() {
  const { items, loading, error } = useBoard(15000);
  const { connected, placePick } = useOnchain();
  const [picks, setPicks] = useState<Picks>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Picks) : {};
    } catch {
      return {};
    }
  });
  const [onchainCount, setOnchainCount] = useState(0);
  const [onchainError, setOnchainError] = useState<string | null>(null);

  const upcoming = useMemo(
    () =>
      items
        .filter((i) => i.fixture.status !== "final")
        .sort((a, b) => +new Date(a.fixture.kickoff) - +new Date(b.fixture.kickoff))
        .slice(0, 8),
    [items],
  );
  const settled = useMemo(() => items.filter((i) => i.fixture.status === "final"), [items]);

  // Score settled picks.
  const { correct, played, points, streak } = useMemo(() => {
    let c = 0, p = 0, currentStreak = 0;
    const ordered = [...settled].sort((a, b) => +new Date(a.fixture.kickoff) - +new Date(b.fixture.kickoff));
    for (const i of ordered) {
      const pick = picks[i.fixture.id];
      if (!pick) continue;
      p++;
      if (pick === i.fixture.outcome) {
        c++;
        currentStreak++;
      } else {
        currentStreak = 0;
      }
    }
    return { correct: c, played: p, points: c * 10 + (p - c) * 0, streak: currentStreak };
  }, [settled, picks]);

  const setPick = (id: number, o: Outcome1x2) => {
    setPicks((prev) => {
      const next = { ...prev, [id]: o };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    // Best-effort: record the pick on-chain when a wallet is connected.
    if (connected && isProgramConfigured()) {
      placePick(id, o)
        .then(() => {
          setOnchainCount((c) => c + 1);
          setOnchainError(null);
        })
        .catch(() => setOnchainError("On-chain pick commit failed. Your local demo pick was saved."));
    }
  };

  const myRankPts = 100 + points;

  return (
    <div className="space-y-8">
      {/* Player header */}
      <div className="card flex flex-wrap items-center gap-5 p-5">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-surface-3 text-2xl">
          ⚽
        </div>
        <div>
          <div className="text-lg font-black">{connected ? "Your MatchDay" : "Play as guest"}</div>
          <div className="text-sm text-muted">
            {connected
              ? `${onchainCount} pick${onchainCount === 1 ? "" : "s"} committed on-chain this session`
              : "Connect a wallet to try best-effort on-chain pick commits"}
          </div>
          {onchainError && <div className="mt-1 text-xs text-warn">{onchainError}</div>}
        </div>
        <div className="ml-auto flex gap-3">
          <MiniStat k="Points" v={points} />
          <MiniStat k="Correct" v={`${correct}/${played}`} />
          <MiniStat k="Streak" v={streak} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Pick'em */}
        <section>
          <h3 className="mb-3 text-lg font-black">Make your picks</h3>
          <div className="space-y-2">
            {loading && upcoming.length === 0 && (
              <div className="card py-12 text-center text-muted">Loading fixtures…</div>
            )}
            {!loading && error && upcoming.length === 0 && (
              <div className="card py-12 text-center text-muted">Unable to load fixtures.</div>
            )}
            {!loading && !error && upcoming.length === 0 && (
              <div className="card py-12 text-center text-muted">No open picks right now.</div>
            )}
            {upcoming.map((i) => {
              const f = i.fixture;
              const pick = picks[f.id];
              return (
                <div key={f.id} className="card p-3.5">
                  <div className="mb-2 flex items-center justify-between text-xs text-faint">
                    <span>{f.group ? `Group ${f.group}` : f.round}</span>
                    <span>{kickoffLabel(f.kickoff)} · {relativeKickoff(f.kickoff)}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><Flag code={f.home.code} flag={f.home.flag} /><span className="font-bold">{f.home.name}</span></div>
                      <div className="flex items-center gap-2"><Flag code={f.away.code} flag={f.away.flag} /><span className="font-bold">{f.away.name}</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["1", "X", "2"] as const).map((o) => (
                        <button
                          key={o}
                          onClick={() => setPick(f.id, o)}
                          className="odds h-full w-14"
                          data-active={pick === o ? "true" : "false"}
                        >
                          <span className="text-[10px] font-bold text-faint">
                            {o === "1" ? f.home.code : o === "2" ? f.away.code : "DRAW"}
                          </span>
                          <span className="mono text-xs font-bold">{o}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard + Moments */}
        <aside className="space-y-6">
          <section>
            <h3 className="mb-1 text-lg font-black">Demo leaderboard</h3>
            <p className="mb-3 text-xs text-muted">Seeded demo rivals plus your local pick score.</p>
            <div className="card divide-y divide-border">
              {[...LEADERBOARD, { name: "you", pts: myRankPts, badges: correct }]
                .sort((a, b) => b.pts - a.pts)
                .map((r, idx) => (
                  <div
                    key={r.name}
                    className={`flex items-center gap-3 px-4 py-2.5 ${r.name === "you" ? "bg-primary/10" : ""}`}
                  >
                    <span className="mono w-5 text-sm text-faint">{idx + 1}</span>
                    <span className={`font-semibold ${r.name === "you" ? "text-primary" : ""}`}>{r.name}</span>
                    <span className="ml-auto mono text-sm">{r.pts}</span>
                    <span className="text-xs text-faint">{r.badges}★</span>
                  </div>
                ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-lg font-black">Your Moments</h3>
            <p className="mb-3 text-xs text-muted">Demo cards unlocked from match events you called right.</p>
            <div className="grid grid-cols-2 gap-3">
              {settled.filter((i) => picks[i.fixture.id] && picks[i.fixture.id] === i.fixture.outcome).slice(0, 4).map((i) => (
                <Moment key={i.fixture.id} home={i.fixture.home.flag} away={i.fixture.away.flag}
                  label={`${i.fixture.home.code} ${formatScoreline(i.fixture.score?.home, i.fixture.score?.away)} ${i.fixture.away.code}`} />
              ))}
              {correct === 0 && (
                <div className="col-span-2 card border-dashed py-8 text-center text-sm text-muted">
                  Call a result right to unlock your first demo Moment.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mono text-xl font-black">{v}</div>
      <div className="text-[10px] uppercase tracking-wide text-faint">{k}</div>
    </div>
  );
}

function Moment({ home, away, label }: { home: string; away: string; label: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-2xl">{home} {away}</div>
      <div className="mono mt-1 text-xs font-bold">{label}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-primary">Demo Moment</div>
    </div>
  );
}
