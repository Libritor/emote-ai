import type { Fixture, Outcome1x2 } from "@/lib/txodds/types";

export const EMPTY = "-";

export function outcomeLabel(o: Outcome1x2, f: Fixture): string {
  return o === "1" ? f.home.name : o === "2" ? f.away.name : "Draw";
}

export function outcomeShort(o: Outcome1x2): string {
  return o === "1" ? "Home" : o === "2" ? "Away" : "Draw";
}

export function stageLabel(stage: Fixture["stage"]): string {
  switch (stage) {
    case "group": return "Group Stage";
    case "r32": return "Round of 32";
    case "r16": return "Round of 16";
    case "qf": return "Quarter-final";
    case "sf": return "Semi-final";
    case "third": return "Third place";
    case "final": return "Final";
  }
}

export function kickoffLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function relativeKickoff(iso: string, nowMs = Date.now()): string {
  const diff = new Date(iso).getTime() - nowMs;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(mins / 60);
  const days = Math.round(hrs / 24);
  const unit = mins < 60 ? `${mins}m` : hrs < 24 ? `${hrs}h` : `${days}d`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

/** Shorten a base58 pubkey/signature for display. */
export function shorten(s: string, n = 4): string {
  if (!s || s.length <= n * 2 + 1) return s;
  return `${s.slice(0, n)}…${s.slice(-n)}`;
}

export function impliedPct(decimalOdds: number): number {
  return Math.round((1 / decimalOdds) * 100);
}

export function fairPct(probability: number): number {
  return Math.round(probability * 100);
}

/** Round a nullable biometric to the nearest integer. */
export function asInt(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n);
}

/** Clamp a score into the inclusive 0–100 integer range. */
export function asScore100(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function formatOdds(n: number): string {
  return n.toFixed(2);
}

export function formatPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

export function formatProbability(probability: number, digits = 0): string {
  return formatPct(probability * 100, digits);
}

export function formatScore100(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return EMPTY;
  return formatPct(asScore100(n));
}

export function formatSignedPct(n: number, digits = 1): string {
  const pct = n * 100;
  return `${pct >= 0 ? "+" : ""}${formatPct(pct, digits)}`;
}

export function formatScoreline(home: number | null | undefined, away: number | null | undefined): string {
  if (home == null || away == null) return `${EMPTY}-${EMPTY}`;
  return `${home}-${away}`;
}

/** Expected value per 1 unit staked on a decimal-odds bet given a fair prob. */
export function expectedValue(fairProb: number, decimalOdds: number): number {
  return fairProb * (decimalOdds - 1) - (1 - fairProb);
}
