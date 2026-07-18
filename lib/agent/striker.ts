// "Striker" — an autonomous edge-hunting trading agent.
//
// The strategy is deterministic and transparent (no black box): for every open
// market it compares the TxODDS market price against its own model-fair
// probability and books the positive expected-value side. On the mock feed the
// edges come from seeded mispricings; on the live TxLINE feed (demargined
// consensus) the agent's own elo model supplies the divergent view — see
// `modelFair`. An optional LLM only ever narrates; it never decides.

import type { Fixture, Odds1x2, FairProbabilities, Outcome1x2 } from "@/lib/txodds/types";
import { matchupLambdas, outcomeProbabilities } from "@/lib/txodds/tournament";
import { expectedValue, impliedPct } from "@/lib/format";

export interface StrikerInput {
  fixture: Fixture;
  oneXtwo: Odds1x2;
  fair: FairProbabilities;
}

export interface Signal {
  fixtureId: number;
  match: string;
  pick: Outcome1x2;
  pickLabel: string;
  odds: number;
  fairProb: number;
  impliedProb: number;
  /** Expected value per unit staked (e.g. 0.07 = +7%). */
  ev: number;
  /** Kelly-optimal stake fraction, capped. */
  kelly: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  status: Fixture["status"];
}

const MIN_EV = 0.02; // only surface edges above +2%
const KELLY_CAP = 0.1; // never stake more than 10% (fractional Kelly)

/** Weight of the agent's own elo model vs the market consensus. */
const MODEL_WEIGHT = 0.35;
/** resolveTeam() marks feed teams missing from the elo table with this flag. */
const SYNTHETIC_FLAG = "🏳️";

/**
 * The agent's own probability view: market consensus blended with the elo
 * model. Teams outside the elo table get no model opinion (pure consensus),
 * so no artificial edges appear on unknown sides.
 */
export function modelFair(fixture: Fixture, marketFair: FairProbabilities): FairProbabilities {
  const { home, away } = fixture;
  if (home.flag === SYNTHETIC_FLAG || away.flag === SYNTHETIC_FLAG) return marketFair;
  const { lambdaHome, lambdaAway } = matchupLambdas(home, away, true);
  const elo = outcomeProbabilities(lambdaHome, lambdaAway);
  const blend = (market: number, model: number) =>
    (1 - MODEL_WEIGHT) * market + MODEL_WEIGHT * model;
  const h = blend(marketFair.home, elo.home);
  const d = blend(marketFair.draw, elo.draw);
  const a = blend(marketFair.away, elo.away);
  const s = h + d + a;
  return { fixtureId: marketFair.fixtureId, home: h / s, draw: d / s, away: a / s };
}

function kellyFraction(p: number, odds: number): number {
  const b = odds - 1;
  const f = (b * p - (1 - p)) / b;
  return Math.max(0, Math.min(KELLY_CAP, f * 0.5)); // half-Kelly, capped
}

function confidenceFor(ev: number): Signal["confidence"] {
  if (ev >= 0.08) return "high";
  if (ev >= 0.045) return "medium";
  return "low";
}

/** Scan a set of markets and return ranked +EV signals (best first). */
export function scanForEdges(inputs: StrikerInput[]): Signal[] {
  const signals: Signal[] = [];

  for (const { fixture, oneXtwo, fair } of inputs) {
    if (fixture.status === "final") continue;

    const legs: { pick: Outcome1x2; label: string; odds: number; prob: number }[] = [
      { pick: "1", label: fixture.home.name, odds: oneXtwo.home, prob: fair.home },
      { pick: "X", label: "Draw", odds: oneXtwo.draw, prob: fair.draw },
      { pick: "2", label: fixture.away.name, odds: oneXtwo.away, prob: fair.away },
    ];

    for (const leg of legs) {
      const ev = expectedValue(leg.prob, leg.odds);
      if (ev < MIN_EV) continue;
      const implied = 1 / leg.odds;
      signals.push({
        fixtureId: fixture.id,
        match: `${fixture.home.code} v ${fixture.away.code}`,
        pick: leg.pick,
        pickLabel: leg.label,
        odds: leg.odds,
        fairProb: leg.prob,
        impliedProb: implied,
        ev,
        kelly: kellyFraction(leg.prob, leg.odds),
        confidence: confidenceFor(ev),
        reasoning:
          `Model fair ${(leg.prob * 100).toFixed(0)}% vs market ${impliedPct(leg.odds)}% ` +
          `(${leg.odds.toFixed(2)}). Edge +${(ev * 100).toFixed(1)}% → half-Kelly stake.`,
        status: fixture.status,
      });
    }
  }

  return signals.sort((a, b) => b.ev - a.ev);
}

export interface AgentSummary {
  scanned: number;
  edgesFound: number;
  avgEv: number;
  bestEv: number;
}

export function summarize(signals: Signal[], scanned: number): AgentSummary {
  const evs = signals.map((s) => s.ev);
  return {
    scanned,
    edgesFound: signals.length,
    avgEv: evs.length ? evs.reduce((a, b) => a + b, 0) / evs.length : 0,
    bestEv: evs.length ? Math.max(...evs) : 0,
  };
}
