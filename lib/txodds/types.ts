// TxODDS-shaped data model.
//
// This is the contract the whole app depends on. Today it is served by the
// `mock` provider (real WC2026 structure + deterministic simulated odds/scores).
// When TxODDS API credentials arrive, the `live` provider implements the SAME
// interface and we flip TXODDS_MODE=live — nothing downstream changes.

export type StageId =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

export type FixtureStatus = "scheduled" | "live" | "final";

/** 1 = home win, X = draw, 2 = away win. Matches TxODDS 1X2 convention. */
export type Outcome1x2 = "1" | "X" | "2";

export interface Team {
  /** FIFA-style 3-letter code, stable id. */
  code: string;
  name: string;
  /** Flag emoji for lightweight display. */
  flag: string;
  /** Group letter A–L for the group stage. */
  group: string;
  /** Elo-ish strength rating; drives simulated odds. */
  elo: number;
}

export interface Score {
  home: number;
  away: number;
}

export interface Fixture {
  /** Stable numeric id used as the on-chain match_id seed. */
  id: number;
  stage: StageId;
  /** Group letter for group-stage games. */
  group?: string;
  /** Human label, e.g. "Round of 16 — Match 3". */
  round: string;
  home: Team;
  away: Team;
  /** ISO kickoff timestamp. */
  kickoff: string;
  venue: string;
  status: FixtureStatus;
  /** Minutes played, present when live. */
  minute?: number;
  score?: Score;
  /** Settled result, present when status === "final". */
  outcome?: Outcome1x2;
}

/** Decimal odds for the three-way 1X2 market. */
export interface Odds1x2 {
  fixtureId: number;
  home: number;
  draw: number;
  away: number;
  /** Bookmaker margin baked into the prices (e.g. 1.06 = 6% overround). */
  overround: number;
  /** ISO timestamp the price was produced. */
  updatedAt: string;
}

/** Decimal odds for the Over/Under 2.5 goals market. */
export interface OddsOu25 {
  fixtureId: number;
  over: number;
  under: number;
  line: number; // 2.5
  updatedAt: string;
}

export interface FixtureOdds {
  fixtureId: number;
  oneXtwo: Odds1x2;
  ou25: OddsOu25;
}

/** Implied probabilities (margin-removed) — used by the trading agent. */
export interface FairProbabilities {
  fixtureId: number;
  home: number;
  draw: number;
  away: number;
}

/**
 * The provider contract. `mock` and `live` both implement this so the rest of
 * the codebase never learns which feed it is talking to.
 */
export interface TxOddsProvider {
  readonly mode: "mock" | "live";
  getFixtures(): Promise<Fixture[]>;
  getFixture(id: number): Promise<Fixture | null>;
  getOdds(id: number): Promise<FixtureOdds | null>;
  /** Margin-removed "fair" probabilities implied by the 1X2 price. */
  getFairProbabilities(id: number): Promise<FairProbabilities | null>;
}
