"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Signal, AgentSummary } from "@/lib/agent/striker";
import { Stat } from "@/components/ui";

interface Position {
  key: string;
  match: string;
  pick: string;
  odds: number;
  stakePct: number;
  ev: number;
  bookedAt: string;
}

export default function Terminal() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [mode, setMode] = useState<string>("…");
  const [auto, setAuto] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const booked = useRef<Set<string>>(new Set());

  const pushLog = useCallback((line: string) => {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 60));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/signals", { cache: "no-store" });
      const data = await res.json();
      setSignals(data.signals);
      setSummary(data.summary);
      setMode(data.mode);
      return data.signals as Signal[];
    } catch {
      return [] as Signal[];
    }
  }, []);

  useEffect(() => {
    load().then((s) => pushLog(`Scanned feed — ${s.length} live edges detected.`));
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load, pushLog]);

  // Auto-execute: book the strongest fresh edges into the blotter.
  useEffect(() => {
    if (!auto) return;
    for (const s of signals.slice(0, 5)) {
      const key = `${s.fixtureId}:${s.pick}`;
      if (booked.current.has(key)) continue;
      booked.current.add(key);
      const pos: Position = {
        key,
        match: s.match,
        pick: s.pickLabel,
        odds: s.odds,
        stakePct: s.kelly,
        ev: s.ev,
        bookedAt: new Date().toLocaleTimeString(),
      };
      setPositions((p) => [pos, ...p].slice(0, 30));
      pushLog(
        `EXECUTE ${s.match} · ${s.pickLabel} @ ${s.odds.toFixed(2)} — stake ${(s.kelly * 100).toFixed(1)}% (edge +${(s.ev * 100).toFixed(1)}%)`,
      );
    }
  }, [auto, signals, pushLog]);

  const totalEdge = positions.reduce((a, p) => a + p.ev * p.stakePct, 0);

  return (
    <div className="space-y-5">
      {/* Agent header */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-xl ${auto ? "bg-primary text-[#04130c]" : "card-2 text-primary"}`}>
            <BotIcon />
          </span>
          <div>
            <div className="font-black">Striker</div>
            <div className="text-xs text-muted">Autonomous edge-taking agent · feed: {mode}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={auto ? "text-primary" : "text-faint"}>{auto ? "● Running" : "○ Idle"}</span>
          </div>
          <button onClick={() => setAuto((a) => !a)} className={`btn ${auto ? "btn-ghost" : "btn-primary"}`}>
            {auto ? "Pause agent" : "Run agent →"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Markets scanned" value={summary?.scanned ?? "—"} />
        <Stat label="Edges found" value={summary?.edgesFound ?? "—"} />
        <Stat label="Best edge" value={summary ? `+${(summary.bestEv * 100).toFixed(1)}%` : "—"} />
        <Stat label="Booked edge" value={`+${(totalEdge * 100).toFixed(2)}%`} sub={`${positions.length} positions`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Signals */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="font-black">Live edges</div>
            <div className="text-xs text-faint">market price vs model-fair · ranked by EV</div>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-faint">
                <tr>
                  <th className="px-4 py-2 font-semibold">Match</th>
                  <th className="px-2 py-2 font-semibold">Pick</th>
                  <th className="px-2 py-2 text-right font-semibold">Odds</th>
                  <th className="px-2 py-2 text-right font-semibold">Fair</th>
                  <th className="px-4 py-2 text-right font-semibold">Edge</th>
                </tr>
              </thead>
              <tbody>
                {signals.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Scanning…</td></tr>
                ) : (
                  signals.map((s) => (
                    <tr key={`${s.fixtureId}:${s.pick}`} className="border-t border-border/60 hover:bg-surface-2">
                      <td className="px-4 py-2.5">
                        <Link href={`/markets/${s.fixtureId}`} className="mono font-semibold hover:text-primary">
                          {s.match}
                        </Link>
                        {s.status === "live" && <span className="ml-2 text-[10px] font-bold text-primary">LIVE</span>}
                      </td>
                      <td className="px-2 py-2.5 max-w-[120px] truncate">{s.pickLabel}</td>
                      <td className="px-2 py-2.5 text-right mono">{s.odds.toFixed(2)}</td>
                      <td className="px-2 py-2.5 text-right mono text-muted">{(s.fairProb * 100).toFixed(0)}%</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`chip ${s.confidence === "high" ? "chip-live" : ""}`}>
                          +{(s.ev * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agent log + blotter */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="border-b border-border px-4 py-3 font-black">Positions</div>
            <div className="max-h-[220px] overflow-y-auto">
              {positions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  {auto ? "Waiting for edges…" : "Run the agent to auto-book edges."}
                </div>
              ) : (
                positions.map((p) => (
                  <div key={p.key} className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="mono font-semibold">{p.match}</div>
                      <div className="truncate text-xs text-faint">{p.pick} @ {p.odds.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-xs">{(p.stakePct * 100).toFixed(1)}% stake</div>
                      <div className="text-xs text-up">+{(p.ev * 100).toFixed(1)}% EV</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-border px-4 py-3 font-black">Reasoning log</div>
            <div className="max-h-[240px] overflow-y-auto p-3">
              {log.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted">Agent idle.</div>
              ) : (
                <div className="space-y-1">
                  {log.map((l, i) => (
                    <div key={i} className="mono text-xs text-muted">{l}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-faint">
        Strategy is fully deterministic and inspectable — Striker only ever books positive
        expected-value edges (market price cheaper than model-fair) at a capped half-Kelly stake.
        On devnet it executes these via the PitchProof program; here it books them to a paper blotter.
      </p>
    </div>
  );
}

function BotIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4v4M9 13h.01M15 13h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
