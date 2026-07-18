// Thin typed HTTP client for the TxLINE off-chain API (OpenAPI 1.5.6).
// Server-side only: both credentials ride on every data request.
//
//   Authorization: Bearer <guest JWT>   (POST /auth/guest/start, 30-day expiry)
//   X-Api-Token:  <api token>           (POST /api/token/activate)

import { getTxlineServerConfig } from "./config";

/** /api/fixtures/snapshot item. */
export interface TxFixture {
  Ts: number;
  StartTime: number; // unix ms
  Competition: string;
  CompetitionId: number;
  FixtureGroupId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  FixtureId: number;
  Participant1IsHome: boolean;
  /** 1 = scheduled, 6 = cancelled (backward-compatible field). */
  GameState?: number | string;
}

/** /api/odds/* item — StablePrice consensus odds. */
export interface TxOddsPayload {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  Bookmaker: string;
  BookmakerId: number;
  SuperOddsType: string;
  GameState?: string;
  InRunning: boolean;
  MarketParameters?: string;
  MarketPeriod?: string;
  PriceNames?: string[];
  Prices?: number[];
  /** Demargined percentages, "52.632" (3dp) or "NA". */
  Pct?: string[];
}

/**
 * /api/scores/* item (soccer fields only). Probe-verified shape: the real feed
 * is PascalCase (unlike the OpenAPI doc) and the snapshot returns one latest
 * event per action type.
 *
 * `Stats` is the on-chain stat-key map from the soccer feed doc:
 *   "1"/"2" = P1/P2 total goals, "6001"/"6002" = P1/P2 shootout goals, etc.
 * `StatusId` is the numeric game phase (NS=1 … FPE=13, P=19) plus the
 * undocumented 100 = game_finalised.
 */
export interface TxScores {
  FixtureId: number;
  GameState?: string; // unreliable — observed "scheduled" mid-match; use StatusId
  StartTime: number;
  Participant1IsHome: boolean;
  Participant1Id: number;
  Participant2Id: number;
  CompetitionId: number;
  Action: string;
  Seq: number;
  Ts: number;
  StatusId?: number;
  Stats?: Record<string, number>;
  Clock?: { Running?: boolean; Seconds?: number };
}

export class TxlineError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string,
  ) {
    super(
      `TxLINE ${path} -> ${status}: ${body.slice(0, 200)}` +
        (status === 401 ? " (guest JWT expired — renew via POST /auth/guest/start / re-run /setup/txline)" : ""),
    );
  }
}

async function call<T>(path: string): Promise<T> {
  const { apiOrigin, jwt, apiToken } = getTxlineServerConfig();
  const res = await fetch(`${apiOrigin}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
    },
    // Live feed — never let Next.js cache it.
    cache: "no-store",
  });
  if (!res.ok) throw new TxlineError(res.status, path, await res.text());
  return (await res.json()) as T;
}

/** Latest fixtures snapshot starting at (or within 30 days after) an epoch day. */
export function fetchFixturesSnapshot(startEpochDay?: number, competitionId?: number): Promise<TxFixture[]> {
  const params = new URLSearchParams();
  if (startEpochDay !== undefined) params.set("startEpochDay", String(startEpochDay));
  if (competitionId !== undefined) params.set("competitionId", String(competitionId));
  const qs = params.size > 0 ? `?${params}` : "";
  return call<TxFixture[]>(`/api/fixtures/snapshot${qs}`);
}

/**
 * Latest odds per unique market line for a fixture. With `asOf` (unix ms),
 * returns the historical snapshot at that moment (e.g. the closing line).
 */
export function fetchOddsSnapshot(fixtureId: number, asOf?: number): Promise<TxOddsPayload[]> {
  const qs = asOf !== undefined ? `?asOf=${asOf}` : "";
  return call<TxOddsPayload[]>(`/api/odds/snapshot/${fixtureId}${qs}`);
}

/** Latest score events (one snapshot per action) for a fixture. */
export function fetchScoresSnapshot(fixtureId: number): Promise<TxScores[]> {
  return call<TxScores[]>(`/api/scores/snapshot/${fixtureId}`);
}

/** Score updates for a fixture within the current 5-minute interval (live). */
export function fetchScoresUpdates(fixtureId: number): Promise<TxScores[]> {
  return call<TxScores[]>(`/api/scores/updates/${fixtureId}`);
}
