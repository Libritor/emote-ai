// Live TxLINE provider — real World Cup fixtures/odds/scores from the TxODDS
// TxLINE API, mapped onto the app's TxOddsProvider contract.
//
// Endpoints used (see docs/TXLINE_ENDPOINTS.md):
//   GET /api/fixtures/snapshot            fixture list (World Cup filtered)
//   GET /api/odds/snapshot/{fixtureId}    StablePrice consensus odds
//   GET /api/scores/snapshot/{fixtureId}  score events (status/goals/minute)
//
// Env: TXODDS_MODE=live, TXLINE_JWT, TXLINE_API_TOKEN (see /setup/txline),
// optional TXLINE_COMPETITION_ID and TXLINE_PRICE_DIVISOR overrides.

import {
  fetchFixturesSnapshot,
  fetchOddsSnapshot,
  fetchScoresSnapshot,
  type TxFixture,
  type TxOddsPayload,
  type TxScores,
} from "../txline/client";
import { projectFixtureAt } from "./reclock";
import { TEAMS, outcomeProbabilities } from "./tournament";
import type {
  FairProbabilities,
  Fixture,
  FixtureOdds,
  FixtureStatus,
  Odds1x2,
  OddsOu25,
  Outcome1x2,
  StageId,
  Team,
  TxOddsProvider,
} from "./types";

// ---------------------------------------------------------------------------
// Tunables (probe-verified constants, env-overridable).
// ---------------------------------------------------------------------------

/** TxLINE integer price -> decimal odds divisor (verified against Pct). */
const PRICE_DIVISOR = Number(process.env.TXLINE_PRICE_DIVISOR ?? 1000);

/** World Cup competition matcher; pin the id via TXLINE_COMPETITION_ID once known. */
const COMPETITION_ID = process.env.TXLINE_COMPETITION_ID
  ? Number(process.env.TXLINE_COMPETITION_ID)
  : undefined;
const COMPETITION_RE = /world\s*cup/i;

/** Tournament window (UTC) — drives snapshot paging + stage inference. */
const TOURNAMENT_START_MS = Date.UTC(2026, 5, 11); // Jun 11 2026
const DAY_MS = 86_400_000;
const STAGE_BOUNDARIES: { before: number; stage: StageId; round: string }[] = [
  { before: Date.UTC(2026, 5, 28), stage: "group", round: "Group stage" },
  { before: Date.UTC(2026, 6, 4), stage: "r32", round: "Round of 32" },
  { before: Date.UTC(2026, 6, 8), stage: "r16", round: "Round of 16" },
  { before: Date.UTC(2026, 6, 12), stage: "qf", round: "Quarter-final" },
  { before: Date.UTC(2026, 6, 16), stage: "sf", round: "Semi-final" },
  { before: Date.UTC(2026, 6, 19), stage: "third", round: "Third-place play-off" },
  { before: Number.POSITIVE_INFINITY, stage: "final", round: "Final" },
];

/** Live window around kickoff during which scores are polled. */
const LIVE_FROM_MS = 15 * 60_000; // 15 min before kickoff
const LIVE_UNTIL_MS = 3 * 3_600_000; // 3 h after kickoff
const CACHE_TTL_MS = 15_000;
const SCORES_CONCURRENCY = 12;

// ---------------------------------------------------------------------------
// Team join — TxLINE participant names onto the app's FIFA-code team table.
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Feed-name aliases -> FIFA code (extend as the feed surprises us). */
const NAME_ALIASES: Record<string, string> = {
  usa: "USA",
  "united states": "USA",
  "united states of america": "USA",
  "korea republic": "KOR",
  "south korea": "KOR",
  "republic of korea": "KOR",
  "ir iran": "IRN",
  iran: "IRN",
  "cote d ivoire": "CIV",
  "ivory coast": "CIV",
  "saudi arabia": "KSA",
  turkiye: "TUR",
  turkey: "TUR",
  czechia: "CZE",
  "czech republic": "CZE",
  "south africa": "RSA",
  "bosnia and herzegovina": "BIH",
  bosnia: "BIH",
  paraguay: "PAR",
  haiti: "HAI",
  iraq: "IRQ",
  "dr congo": "COD",
  "congo dr": "COD",
  "democratic republic of the congo": "COD",
  "democratic republic of congo": "COD",
  curacao: "CUW",
  "cabo verde": "CPV",
  "cape verde": "CPV",
  jordan: "JOR",
  uzbekistan: "UZB",
};

/**
 * Real WC 2026 nations absent from the mock TEAMS table. Without these the
 * live feed falls back to a white-flag synthetic and ticker/board flags break.
 */
const LIVE_ONLY_TEAMS: Team[] = [
  { code: "RSA", name: "South Africa", flag: "🇿🇦", group: "A", elo: 1680 },
  { code: "CZE", name: "Czechia", flag: "🇨🇿", group: "A", elo: 1780 },
  { code: "BIH", name: "Bosnia and Herzegovina", flag: "🇧🇦", group: "B", elo: 1700 },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾", group: "D", elo: 1720 },
  { code: "HAI", name: "Haiti", flag: "🇭🇹", group: "C", elo: 1580 },
  { code: "TUR", name: "Türkiye", flag: "🇹🇷", group: "D", elo: 1760 },
  { code: "IRQ", name: "Iraq", flag: "🇮🇶", group: "I", elo: 1650 },
  { code: "COD", name: "DR Congo", flag: "🇨🇩", group: "", elo: 1660 },
  { code: "CUW", name: "Curaçao", flag: "🇨🇼", group: "E", elo: 1520 },
  { code: "CPV", name: "Cape Verde", flag: "🇨🇻", group: "H", elo: 1600 },
  { code: "JOR", name: "Jordan", flag: "🇯🇴", group: "J", elo: 1620 },
  { code: "UZB", name: "Uzbekistan", flag: "🇺🇿", group: "K", elo: 1640 },
];

const ALL_TEAMS: Team[] = [...TEAMS, ...LIVE_ONLY_TEAMS];
const TEAM_BY_CODE = new Map(ALL_TEAMS.map((t) => [t.code, t]));
const TEAM_BY_NORMALIZED_NAME = new Map<string, Team>(
  ALL_TEAMS.map((t) => [normalizeName(t.name), t]),
);

const syntheticTeams = new Map<string, Team>();
const warnedTeams = new Set<string>();

function resolveTeam(feedName: string): Team {
  const norm = normalizeName(feedName);
  const aliased = NAME_ALIASES[norm];
  if (aliased) {
    const byCode = TEAM_BY_CODE.get(aliased);
    if (byCode) return byCode;
  }
  const known = TEAM_BY_NORMALIZED_NAME.get(norm);
  if (known) return known;

  let synthetic = syntheticTeams.get(norm);
  if (!synthetic) {
    const code = norm.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase() || "UNK";
    synthetic = { code, name: feedName, flag: "🏳️", group: "", elo: 1750 };
    syntheticTeams.set(norm, synthetic);
    if (!warnedTeams.has(norm)) {
      warnedTeams.add(norm);
      console.warn(`[txline] unknown team "${feedName}" -> synthetic code ${code}`);
    }
  }
  return synthetic;
}

// ---------------------------------------------------------------------------
// Scores -> status / score / minute / outcome.
// ---------------------------------------------------------------------------

// Soccer StatusId phases (soccer feed doc), plus the observed 100 = game_finalised.
const LIVE_STATUS_IDS = new Set([2, 3, 4, 6, 7, 8, 9, 11, 12, 14]);
const FINAL_STATUS_IDS = new Set([5, 10, 13, 100]);

// Stat keys from the soccer feed doc (period_prefix + base_key).
const STAT_P1_GOALS = "1";
const STAT_P2_GOALS = "2";
const STAT_P1_PEN_GOALS = "6001";
const STAT_P2_PEN_GOALS = "6002";

interface LiveState {
  status: FixtureStatus;
  minute?: number;
  score?: { home: number; away: number };
  outcome?: Outcome1x2;
}

function stateFromScores(events: TxScores[], p1IsHome: boolean): LiveState | null {
  if (events.length === 0) return null;
  // The snapshot is "latest event per action type", and post-match amend
  // events can carry a stale mid-game StatusId with a HIGHER Seq than the
  // final whistle. Soccer phases are monotonic (NS=1 … FPE=13, finalised=100),
  // so the match's true phase is the MAX StatusId across regular phases.
  const bySeq = [...events].sort((a, b) => (a.Seq ?? 0) - (b.Seq ?? 0));
  const phaseIds = events
    .map((e) => e.StatusId)
    .filter((s): s is number => typeof s === "number");
  const regular = phaseIds.filter((s) => (s >= 1 && s <= 13) || s === 100);
  const statusId = regular.length > 0 ? Math.max(...regular) : Math.max(...phaseIds, 1);

  const status: FixtureStatus = FINAL_STATUS_IDS.has(statusId)
    ? "final"
    : LIVE_STATUS_IDS.has(statusId)
      ? "live"
      : "scheduled";
  const state: LiveState = { status };

  const lastWithStats = [...bySeq].reverse().find((e) => e.Stats);
  const stats = lastWithStats?.Stats;
  const g1 = stats?.[STAT_P1_GOALS];
  const g2 = stats?.[STAT_P2_GOALS];
  if (typeof g1 === "number" && typeof g2 === "number" && status !== "scheduled") {
    state.score = p1IsHome ? { home: g1, away: g2 } : { home: g2, away: g1 };
  }

  if (status === "live") {
    // Amends carry old clocks — the furthest clock is the current one.
    const seconds = Math.max(
      0,
      ...events.map((e) => (typeof e.Clock?.Seconds === "number" ? e.Clock.Seconds : 0)),
    );
    if (seconds > 0) state.minute = Math.min(120, Math.max(1, Math.round(seconds / 60)));
  }
  if (status === "final") state.minute = 90;

  if (status === "final" && state.score) {
    if (state.score.home !== state.score.away) {
      state.outcome = state.score.home > state.score.away ? "1" : "2";
    } else {
      // Level after regulation/ET: decide by shootout goals when present.
      const pe1 = stats?.[STAT_P1_PEN_GOALS] ?? 0;
      const pe2 = stats?.[STAT_P2_PEN_GOALS] ?? 0;
      if (pe1 !== pe2) {
        const homeWonPens = p1IsHome ? pe1 > pe2 : pe2 > pe1;
        state.outcome = homeWonPens ? "1" : "2";
      } else {
        state.outcome = "X";
      }
    }
  }
  return state;
}

// ---------------------------------------------------------------------------
// Odds mapping — identify markets by their price-name shape, not by catalog.
// ---------------------------------------------------------------------------

interface Parsed1x2 {
  odds: Odds1x2;
  fair: FairProbabilities | null;
}

function toDecimal(price: number): number {
  return price / PRICE_DIVISOR;
}

function parsePct(pct: string | undefined): number | null {
  if (!pct || pct === "NA") return null;
  const v = Number(pct);
  return Number.isFinite(v) && v > 0 ? v / 100 : null;
}

// Probe-verified market encodings (devnet feed, Bookmaker
// "TXLineStablePriceDemargined" — prices are demargined decimal odds x1000):
//   1X2:  SuperOddsType "1X2_PARTICIPANT_RESULT",   PriceNames ["part1","draw","part2"]
//   O/U:  SuperOddsType "OVERUNDER_PARTICIPANT_GOALS", MarketParameters "line=2.5",
//         PriceNames ["over","under"]
//   Full-time markets carry no MarketPeriod; halves are "half=1" etc.
const ONE_X_TWO_TYPE = "1X2_PARTICIPANT_RESULT";
const OVER_UNDER_TYPE = "OVERUNDER_PARTICIPANT_GOALS";

function isOneXTwo(p: TxOddsPayload): boolean {
  if (p.SuperOddsType === ONE_X_TWO_TYPE) return true;
  const n = (p.PriceNames ?? []).map((x) => x.trim().toLowerCase());
  return n.length === 3 && n.includes("draw");
}

function isOverUnder(p: TxOddsPayload): boolean {
  if (p.SuperOddsType === OVER_UNDER_TYPE) return true;
  const n = (p.PriceNames ?? []).map((x) => x.trim().toLowerCase());
  return n.length === 2 && n.some((x) => x.startsWith("over")) && n.some((x) => x.startsWith("under"));
}

function idx(names: string[], ...wanted: string[]): number {
  const n = names.map((x) => x.trim().toLowerCase());
  for (const w of wanted) {
    const i = n.indexOf(w);
    if (i >= 0) return i;
  }
  return -1;
}

/** "line=2.5" (or bare "2.5") -> 2.5 */
function lineOf(params: string | undefined | null): number {
  if (!params) return NaN;
  const m = /(?:^|[=,])(-?\d+(?:\.\d+)?)\s*$/.exec(params.trim());
  return m ? Number(m[1]) : NaN;
}

/** Full-time markets carry no MarketPeriod on this feed. */
function isFullTime(period: string | undefined | null): boolean {
  return !period || /^(ft|full|match|regular)/i.test(period);
}

function parse1x2(payloads: TxOddsPayload[], fixtureId: number, p1IsHome: boolean): Parsed1x2 | null {
  const candidates = payloads
    .filter((p) => p.PriceNames && p.Prices && isOneXTwo(p) && isFullTime(p.MarketPeriod))
    .sort((a, b) => b.Ts - a.Ts);
  const best = candidates[0];
  if (!best || !best.PriceNames || !best.Prices) return null;

  // part1/part2 are participant-relative — orient via Participant1IsHome.
  const i1 = idx(best.PriceNames, "part1", "1", "home");
  const iX = idx(best.PriceNames, "draw", "x");
  const i2 = idx(best.PriceNames, "part2", "2", "away");
  const iH = p1IsHome ? i1 : i2;
  const iA = p1IsHome ? i2 : i1;
  if (iH < 0 || iX < 0 || iA < 0) return null;

  const home = toDecimal(best.Prices[iH]);
  const draw = toDecimal(best.Prices[iX]);
  const away = toDecimal(best.Prices[iA]);
  if ([home, draw, away].some((o) => !Number.isFinite(o) || o <= 1)) return null;

  const overround = 1 / home + 1 / draw + 1 / away;
  const odds: Odds1x2 = {
    fixtureId,
    home,
    draw,
    away,
    overround,
    updatedAt: new Date(tsToMs(best.Ts)).toISOString(),
  };

  let fair: FairProbabilities | null = null;
  const pH = parsePct(best.Pct?.[iH]);
  const pX = parsePct(best.Pct?.[iX]);
  const pA = parsePct(best.Pct?.[iA]);
  if (pH !== null && pX !== null && pA !== null) {
    const s = pH + pX + pA;
    fair = { fixtureId, home: pH / s, draw: pX / s, away: pA / s };
  }
  return { odds, fair };
}

function parseOu25(payloads: TxOddsPayload[], fixtureId: number): OddsOu25 | null {
  const totals = payloads.filter(
    (p) => p.PriceNames && p.Prices && isOverUnder(p) && isFullTime(p.MarketPeriod),
  );
  if (totals.length === 0) return null;
  // Pick the line closest to 2.5 (exact 2.5 wins), newest first on ties.
  const scored = totals
    .map((p) => ({ p, line: lineOf(p.MarketParameters) }))
    .filter((x) => Number.isFinite(x.line))
    .sort(
      (a, b) =>
        Math.abs(a.line - 2.5) - Math.abs(b.line - 2.5) || b.p.Ts - a.p.Ts,
    );
  const best = scored[0];
  if (!best || !best.p.PriceNames || !best.p.Prices) return null;
  const iO = best.p.PriceNames.findIndex((n) => n.trim().toLowerCase().startsWith("over"));
  const iU = best.p.PriceNames.findIndex((n) => n.trim().toLowerCase().startsWith("under"));
  if (iO < 0 || iU < 0) return null;
  const over = toDecimal(best.p.Prices[iO]);
  const under = toDecimal(best.p.Prices[iU]);
  if (!Number.isFinite(over) || !Number.isFinite(under) || over <= 1 || under <= 1) return null;
  return {
    fixtureId,
    over,
    under,
    line: best.line,
    updatedAt: new Date(tsToMs(best.p.Ts)).toISOString(),
  };
}

/**
 * Fallback O/U 2.5 when TxLINE has no totals line: solve a Poisson model whose
 * 1X2 probabilities match the fair price, then price Over/Under at fair+margin.
 */
function synthesizeOu25(fair: FairProbabilities, fixtureId: number, updatedAt: string): OddsOu25 {
  let lo = -3;
  let hi = 3;
  // Binary-search supremacy so that P(home)-P(away) matches the fair prices.
  for (let i = 0; i < 24; i++) {
    const sup = (lo + hi) / 2;
    const { home, away } = outcomeProbabilities(
      Math.max(0.25, 1.35 + sup / 2),
      Math.max(0.25, 1.35 - sup / 2),
    );
    if (home - away < fair.home - fair.away) lo = sup;
    else hi = sup;
  }
  const sup = (lo + hi) / 2;
  const { over } = outcomeProbabilities(
    Math.max(0.25, 1.35 + sup / 2),
    Math.max(0.25, 1.35 - sup / 2),
  );
  const margin = 1.05;
  return {
    fixtureId,
    over: Math.max(1.02, 1 / (over * margin)),
    under: Math.max(1.02, 1 / ((1 - over) * margin)),
    line: 2.5,
    updatedAt,
  };
}

/** TxLINE timestamps are unix ms; tolerate seconds just in case. */
function tsToMs(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts;
}

// ---------------------------------------------------------------------------
// Caching + concurrency.
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  at: number;
  value: T;
}

function fresh<T>(entry: CacheEntry<T> | null | undefined): T | null {
  return entry && Date.now() - entry.at < CACHE_TTL_MS ? entry.value : null;
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// The provider.
// ---------------------------------------------------------------------------

const U32_MAX = 0xffffffff;

function guardId(id: number): number {
  if (!Number.isInteger(id) || id <= 0 || id > U32_MAX) {
    throw new Error(`TxLINE fixture id ${id} does not fit the on-chain u32 match_id`);
  }
  return id;
}

function stageFor(kickoffMs: number): { stage: StageId; round: string } {
  const b = STAGE_BOUNDARIES.find((x) => kickoffMs < x.before) ?? STAGE_BOUNDARIES[0];
  return { stage: b.stage, round: b.round };
}

export class LiveTxOddsProvider implements TxOddsProvider {
  readonly mode = "live" as const;
  private readonly now: () => number;
  private readonly historicalClock: boolean;

  private fixturesCache: CacheEntry<Fixture[]> | null = null;
  private fixturesInflight: Promise<Fixture[]> | null = null;
  private oddsCache = new Map<number, CacheEntry<TxOddsPayload[]>>();
  /** Final results never change — memoized for the life of the process. */
  private finalStates = new Map<number, LiveState>();
  /** Odds part1/part2 orientation comes from the fixture feed. */
  private p1IsHomeById = new Map<number, boolean>();
  private kickoffMsById = new Map<number, number>();
  /** Closing lines of kicked-off fixtures never change — cache for good. */
  private closingOdds = new Map<number, TxOddsPayload[]>();

  constructor(now?: () => number) {
    this.now = now ?? (() => Date.now());
    this.historicalClock = now !== undefined;
  }

  private async rawWorldCupFixtures(): Promise<TxFixture[]> {
    // The snapshot window is "start day + 30 days"; two pages cover the
    // whole Jun 11 - Jul 19 tournament.
    const startDays = [
      Math.floor(TOURNAMENT_START_MS / DAY_MS),
      Math.floor(TOURNAMENT_START_MS / DAY_MS) + 28,
    ];
    const pages = await Promise.all(
      startDays.map((d) => fetchFixturesSnapshot(d, COMPETITION_ID)),
    );
    const byId = new Map<number, TxFixture>();
    for (const fx of pages.flat()) {
      if (COMPETITION_ID !== undefined || COMPETITION_RE.test(fx.Competition)) {
        byId.set(fx.FixtureId, fx);
        this.p1IsHomeById.set(fx.FixtureId, fx.Participant1IsHome);
        this.kickoffMsById.set(fx.FixtureId, tsToMs(fx.StartTime));
      }
    }
    return [...byId.values()];
  }

  private async liveStateFor(fx: TxFixture): Promise<LiveState | null> {
    const memo = this.finalStates.get(fx.FixtureId);
    if (memo) return memo;

    const now = this.now();
    const kickoff = tsToMs(fx.StartTime);
    // Scheduled fixtures before the window need no scores call.
    if (now < kickoff - LIVE_FROM_MS) return null;

    try {
      const events = await fetchScoresSnapshot(fx.FixtureId);
      const state = stateFromScores(events, fx.Participant1IsHome);
      if (state?.status === "final") this.finalStates.set(fx.FixtureId, state);
      // Long past kickoff with no data at all: leave as scheduled (feed gap).
      if (!state && now > kickoff + LIVE_UNTIL_MS) return null;
      return state;
    } catch (e) {
      console.warn(`[txline] scores for ${fx.FixtureId} failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async getFixtures(): Promise<Fixture[]> {
    const cached = fresh(this.fixturesCache);
    if (cached) return cached;
    if (this.fixturesInflight) return this.fixturesInflight;

    this.fixturesInflight = (async () => {
      const raw = await this.rawWorldCupFixtures();
      const fixtures = await mapLimited(raw, SCORES_CONCURRENCY, async (fx) => {
        const kickoffMs = tsToMs(fx.StartTime);
        const { stage, round } = stageFor(kickoffMs);
        const homeName = fx.Participant1IsHome ? fx.Participant1 : fx.Participant2;
        const awayName = fx.Participant1IsHome ? fx.Participant2 : fx.Participant1;
        const home = resolveTeam(homeName);
        const away = resolveTeam(awayName);
        const state = await this.liveStateFor(fx);
        const group =
          stage === "group" && home.group && home.group === away.group ? home.group : undefined;

        const fixture: Fixture = {
          id: guardId(fx.FixtureId),
          stage,
          group,
          round: group ? `Group ${group}` : round,
          home,
          away,
          kickoff: new Date(kickoffMs).toISOString(),
          venue: "",
          status: state?.status ?? "scheduled",
          ...(state?.minute !== undefined ? { minute: state.minute } : {}),
          ...(state?.score ? { score: state.score } : {}),
          ...(state?.outcome ? { outcome: state.outcome } : {}),
        };
        return this.historicalClock ? projectFixtureAt(fixture, this.now()) : fixture;
      });

      fixtures.sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id - b.id);
      this.fixturesCache = { at: Date.now(), value: fixtures };
      return fixtures;
    })();

    try {
      return await this.fixturesInflight;
    } finally {
      this.fixturesInflight = null;
    }
  }

  async getFixture(id: number): Promise<Fixture | null> {
    const fixtures = await this.getFixtures();
    return fixtures.find((f) => f.id === id) ?? null;
  }

  private async oddsPayloads(id: number): Promise<TxOddsPayload[]> {
    const closing = this.closingOdds.get(id);
    if (closing) return closing;
    const cached = fresh(this.oddsCache.get(id));
    if (cached) return cached;

    if (!this.kickoffMsById.has(id)) await this.getFixtures();
    const kickoff = this.kickoffMsById.get(id);
    const now = this.now();
    const longFinished = kickoff !== undefined && now > kickoff + LIVE_UNTIL_MS;

    // Long-finished fixtures have no live 5-minute window — go straight to the
    // closing line (historical snapshot just before kickoff).
    const snapshotAt = kickoff !== undefined && longFinished ? kickoff - 60_000 : now;
    let payloads = this.historicalClock
      ? await fetchOddsSnapshot(id, snapshotAt)
      : longFinished
        ? []
        : await fetchOddsSnapshot(id);
    if (payloads.length === 0 && kickoff && kickoff < now) {
      payloads = await fetchOddsSnapshot(id, kickoff - 60_000);
      if (payloads.length > 0) {
        if (!this.historicalClock) this.closingOdds.set(id, payloads);
        return payloads;
      }
    }
    if (!this.historicalClock) this.oddsCache.set(id, { at: Date.now(), value: payloads });
    return payloads;
  }

  /** part1/part2 -> home/away orientation, loading the fixture feed if needed. */
  private async p1IsHome(id: number): Promise<boolean> {
    if (!this.p1IsHomeById.has(id)) await this.getFixtures();
    return this.p1IsHomeById.get(id) ?? true;
  }

  async getOdds(id: number): Promise<FixtureOdds | null> {
    try {
      const payloads = await this.oddsPayloads(id);
      const parsed = parse1x2(payloads, id, await this.p1IsHome(id));
      if (!parsed) return null;
      const fair =
        parsed.fair ?? fairFromDecimal(parsed.odds);
      const ou25 =
        parseOu25(payloads, id) ?? synthesizeOu25(fair, id, parsed.odds.updatedAt);
      return { fixtureId: id, oneXtwo: parsed.odds, ou25 };
    } catch (e) {
      console.warn(`[txline] odds for ${id} failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async getFairProbabilities(id: number): Promise<FairProbabilities | null> {
    try {
      const payloads = await this.oddsPayloads(id);
      const parsed = parse1x2(payloads, id, await this.p1IsHome(id));
      if (!parsed) return null;
      return parsed.fair ?? fairFromDecimal(parsed.odds);
    } catch (e) {
      console.warn(`[txline] fair probs for ${id} failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }
}

/** Margin-removed probabilities straight from decimal prices (fallback when Pct is NA). */
function fairFromDecimal(odds: Odds1x2): FairProbabilities {
  const rh = 1 / odds.home;
  const rx = 1 / odds.draw;
  const ra = 1 / odds.away;
  const s = rh + rx + ra;
  return { fixtureId: odds.fixtureId, home: rh / s, draw: rx / s, away: ra / s };
}
