// Mock TxODDS provider.
//
// Wraps the deterministic tournament (tournament.ts) with:
//   1. a rolling match clock so, relative to "now", games are final / live /
//      upcoming — this is what makes on-chain settlement demoable;
//   2. a 1X2 + O/U pricing model with a small, seeded per-fixture mispricing so
//      the Striker trading agent has genuine +EV edges to discover.
//
// It implements the exact same TxOddsProvider contract as the (future) live
// provider, so flipping TXODDS_MODE=live changes nothing downstream.

import {
  buildTournament,
  outcomeProbabilities,
  type SimFixture,
  type Tournament,
} from "./tournament";
import type {
  FairProbabilities,
  Fixture,
  FixtureOdds,
  Odds1x2,
  OddsOu25,
  Outcome1x2,
  Score,
  TxOddsProvider,
} from "./types";

const MINUTE = 60_000;
const SPACING_MS = 45 * MINUTE; // gap between consecutive kickoffs on the timeline
const MATCH_MS = 105 * MINUTE; // full match incl. half-time before "final"
const PIVOT = 46; // fixtures before this index have already kicked off at t=now
const OVERROUND = 1.06; // 6% bookmaker margin baked into market prices

let cached: Tournament | null = null;
function tournament(): Tournament {
  if (!cached) cached = buildTournament();
  return cached;
}

function kickoffMs(sim: SimFixture, now: number): number {
  return now + (sim.seq - PIVOT) * SPACING_MS;
}

function seededNoise(id: number, salt: number): number {
  // Deterministic value in [-1, 1] from (id, salt).
  const x = Math.sin(id * 928371 + salt * 15731) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function partialScore(trueScore: Score, minute: number): Score {
  const p = Math.min(1, minute / 90);
  return {
    home: Math.min(trueScore.home, Math.floor(trueScore.home * p + 0.15)),
    away: Math.min(trueScore.away, Math.floor(trueScore.away * p + 0.15)),
  };
}

/** Map an internal SimFixture to the public Fixture, applying the match clock. */
export function toFixture(sim: SimFixture, now: number): Fixture {
  const kickoff = kickoffMs(sim, now);
  const base: Fixture = {
    id: sim.id,
    stage: sim.stage,
    group: sim.group,
    round: sim.round,
    home: sim.home,
    away: sim.away,
    kickoff: new Date(kickoff).toISOString(),
    venue: sim.venue,
    status: "scheduled",
  };

  if (now >= kickoff + MATCH_MS) {
    base.status = "final";
    base.score = sim.trueScore;
    base.outcome = sim.trueOutcome;
    base.minute = 90;
  } else if (now >= kickoff) {
    const minute = Math.max(1, Math.min(90, Math.floor((now - kickoff) / MINUTE)));
    base.status = "live";
    base.minute = minute;
    base.score = partialScore(sim.trueScore, minute);
  }
  return base;
}

/** Clean, margin-free probabilities implied by the model lambdas. */
function fairProbs(sim: SimFixture): { home: number; draw: number; away: number; over: number } {
  return outcomeProbabilities(sim.lambdaHome, sim.lambdaAway);
}

/** Market prices: fair probs perturbed by a seeded mispricing, plus overround. */
function marketOdds(sim: SimFixture, now: number): FixtureOdds {
  const fair = fairProbs(sim);

  // Seeded mispricing (±, up to ~9% relative) — the edge the agent hunts.
  const bias = seededNoise(sim.id, 3) * 0.09;
  let mh = Math.max(0.02, fair.home * (1 + bias));
  let ma = Math.max(0.02, fair.away * (1 - bias));
  let md = Math.max(0.02, fair.draw * (1 - bias * 0.3));
  const sum = mh + md + ma;
  mh /= sum; md /= sum; ma /= sum;

  const price = (p: number) => Number((1 / (p * OVERROUND)).toFixed(2));
  const updatedAt = new Date(now).toISOString();

  const oneXtwo: Odds1x2 = {
    fixtureId: sim.id,
    home: price(mh),
    draw: price(md),
    away: price(ma),
    overround: OVERROUND,
    updatedAt,
  };

  // Over/Under 2.5 with its own small mispricing.
  const overBias = seededNoise(sim.id, 7) * 0.06;
  let pOver = Math.min(0.95, Math.max(0.05, fair.over * (1 + overBias)));
  const pUnder = 1 - pOver;
  const ou25: OddsOu25 = {
    fixtureId: sim.id,
    over: price(pOver),
    under: price(pUnder),
    line: 2.5,
    updatedAt,
  };

  return { fixtureId: sim.id, oneXtwo, ou25 };
}

export class MockTxOddsProvider implements TxOddsProvider {
  readonly mode = "mock" as const;
  private now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? (() => Date.now());
  }

  async getFixtures(): Promise<Fixture[]> {
    const t = this.now();
    return tournament().fixtures.map((s) => toFixture(s, t));
  }

  async getFixture(id: number): Promise<Fixture | null> {
    const sim = tournament().fixtures.find((s) => s.id === id);
    return sim ? toFixture(sim, this.now()) : null;
  }

  async getOdds(id: number): Promise<FixtureOdds | null> {
    const sim = tournament().fixtures.find((s) => s.id === id);
    return sim ? marketOdds(sim, this.now()) : null;
  }

  async getFairProbabilities(id: number): Promise<FairProbabilities | null> {
    const sim = tournament().fixtures.find((s) => s.id === id);
    if (!sim) return null;
    const f = fairProbs(sim);
    return { fixtureId: id, home: f.home, draw: f.draw, away: f.away };
  }
}

/** The true, settled outcome — used only by the oracle relayer, never the UI. */
export function trueResult(id: number): { outcome: Outcome1x2; score: Score } | null {
  const sim = tournament().fixtures.find((s) => s.id === id);
  return sim ? { outcome: sim.trueOutcome, score: sim.trueScore } : null;
}

export { tournament as mockTournament };
