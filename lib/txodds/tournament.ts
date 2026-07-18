// Deterministic World Cup 2026 simulation: 48 teams, 12 groups, 104 matches.
//
// Everything here is a pure function of the team table + a fixed seed, so the
// whole tournament is reproducible and self-consistent (group results feed the
// knockout bracket which feeds the final). The `mock` provider layers a rolling
// match clock on top so that — relative to "now" — some games are final, some
// live, and the rest upcoming, which is exactly what makes on-chain settlement
// demoable: as a fixture's kickoff passes, the oracle can settle its true result.

import type { Outcome1x2, Score, StageId, Team } from "./types";

// ---------------------------------------------------------------------------
// Teams — 48 nations, 12 groups (A–L). Elo drives every simulated price/score.
// ---------------------------------------------------------------------------

export const TEAMS: Team[] = [
  { code: "USA", name: "United States", flag: "🇺🇸", group: "A", elo: 1790 },
  { code: "WAL", name: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", group: "A", elo: 1720 },
  { code: "IRN", name: "Iran", flag: "🇮🇷", group: "A", elo: 1700 },
  { code: "GHA", name: "Ghana", flag: "🇬🇭", group: "A", elo: 1680 },

  { code: "MEX", name: "Mexico", flag: "🇲🇽", group: "B", elo: 1800 },
  { code: "POL", name: "Poland", flag: "🇵🇱", group: "B", elo: 1770 },
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦", group: "B", elo: 1650 },
  { code: "AUS", name: "Australia", flag: "🇦🇺", group: "B", elo: 1710 },

  { code: "CAN", name: "Canada", flag: "🇨🇦", group: "C", elo: 1760 },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", group: "C", elo: 1930 },
  { code: "MAR", name: "Morocco", flag: "🇲🇦", group: "C", elo: 1880 },
  { code: "PER", name: "Peru", flag: "🇵🇪", group: "C", elo: 1690 },

  { code: "ARG", name: "Argentina", flag: "🇦🇷", group: "D", elo: 2110 },
  { code: "DEN", name: "Denmark", flag: "🇩🇰", group: "D", elo: 1850 },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳", group: "D", elo: 1670 },
  { code: "PAN", name: "Panama", flag: "🇵🇦", group: "D", elo: 1620 },

  { code: "FRA", name: "France", flag: "🇫🇷", group: "E", elo: 2080 },
  { code: "SEN", name: "Senegal", flag: "🇸🇳", group: "E", elo: 1840 },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨", group: "E", elo: 1720 },
  { code: "AUT", name: "Austria", flag: "🇦🇹", group: "E", elo: 1830 },

  { code: "BRA", name: "Brazil", flag: "🇧🇷", group: "F", elo: 2060 },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭", group: "F", elo: 1830 },
  { code: "CMR", name: "Cameroon", flag: "🇨🇲", group: "F", elo: 1680 },
  { code: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "F", elo: 1740 },

  { code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "G", elo: 2040 },
  { code: "NED", name: "Netherlands", flag: "🇳🇱", group: "G", elo: 1990 },
  { code: "EGY", name: "Egypt", flag: "🇪🇬", group: "G", elo: 1710 },
  { code: "NZL", name: "New Zealand", flag: "🇳🇿", group: "G", elo: 1560 },

  { code: "ESP", name: "Spain", flag: "🇪🇸", group: "H", elo: 2050 },
  { code: "JPN", name: "Japan", flag: "🇯🇵", group: "H", elo: 1820 },
  { code: "CIV", name: "Ivory Coast", flag: "🇨🇮", group: "H", elo: 1700 },
  { code: "NOR", name: "Norway", flag: "🇳🇴", group: "H", elo: 1830 },

  { code: "POR", name: "Portugal", flag: "🇵🇹", group: "I", elo: 2010 },
  { code: "URU", name: "Uruguay", flag: "🇺🇾", group: "I", elo: 1890 },
  { code: "NGA", name: "Nigeria", flag: "🇳🇬", group: "I", elo: 1720 },
  { code: "CRC", name: "Costa Rica", flag: "🇨🇷", group: "I", elo: 1640 },

  { code: "GER", name: "Germany", flag: "🇩🇪", group: "J", elo: 1980 },
  { code: "COL", name: "Colombia", flag: "🇨🇴", group: "J", elo: 1900 },
  { code: "ALG", name: "Algeria", flag: "🇩🇿", group: "J", elo: 1710 },
  { code: "JAM", name: "Jamaica", flag: "🇯🇲", group: "J", elo: 1600 },

  { code: "CRO", name: "Croatia", flag: "🇭🇷", group: "K", elo: 1900 },
  { code: "KOR", name: "South Korea", flag: "🇰🇷", group: "K", elo: 1790 },
  { code: "SRB", name: "Serbia", flag: "🇷🇸", group: "K", elo: 1800 },
  { code: "QAT", name: "Qatar", flag: "🇶🇦", group: "K", elo: 1600 },

  { code: "ITA", name: "Italy", flag: "🇮🇹", group: "L", elo: 1950 },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", group: "L", elo: 1780 },
  { code: "CHI", name: "Chile", flag: "🇨🇱", group: "L", elo: 1740 },
  { code: "GRE", name: "Greece", flag: "🇬🇷", group: "L", elo: 1730 },
];

const TEAM_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));
export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const HOST_CITIES = [
  "MetLife Stadium, New York/NJ", "SoFi Stadium, Los Angeles", "AT&T Stadium, Dallas",
  "Mercedes-Benz Stadium, Atlanta", "Arrowhead Stadium, Kansas City", "NRG Stadium, Houston",
  "Lincoln Financial Field, Philadelphia", "Levi's Stadium, San Francisco",
  "Lumen Field, Seattle", "Hard Rock Stadium, Miami", "Gillette Stadium, Boston",
  "BMO Field, Toronto", "BC Place, Vancouver", "Estadio Azteca, Mexico City",
  "Estadio Akron, Guadalajara", "Estadio BBVA, Monterrey",
];

// ---------------------------------------------------------------------------
// Seeded RNG + Poisson scoring model.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOME_ADV = 45;
const BASE_TOTAL = 2.7;

/** Expected goals (lambdas) for a matchup. Neutral venues drop home advantage. */
export function matchupLambdas(home: Team, away: Team, neutral = false): { lambdaHome: number; lambdaAway: number } {
  const sup = (home.elo - away.elo + (neutral ? 0 : HOME_ADV)) / 150;
  return {
    lambdaHome: Math.max(0.25, BASE_TOTAL / 2 + sup / 2),
    lambdaAway: Math.max(0.25, BASE_TOTAL / 2 - sup / 2),
  };
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}
function poissonPmf(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Analytic 1X2 + Over2.5 probabilities from the two lambdas. */
export function outcomeProbabilities(lambdaHome: number, lambdaAway: number) {
  let pHome = 0, pDraw = 0, pAway = 0, pOver = 0;
  const MAX = 9;
  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      if (h > a) pHome += p;
      else if (h === a) pDraw += p;
      else pAway += p;
      if (h + a > 2) pOver += p;
    }
  }
  const s = pHome + pDraw + pAway;
  return { home: pHome / s, draw: pDraw / s, away: pAway / s, over: pOver };
}

function samplePoisson(lambda: number, rnd: () => number): number {
  // Knuth's algorithm.
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}

// ---------------------------------------------------------------------------
// Internal simulated fixture (carries the "true" result + pricing lambdas).
// ---------------------------------------------------------------------------

export interface SimFixture {
  id: number;
  seq: number; // position on the synthetic tournament timeline (0..103)
  stage: StageId;
  group?: string;
  round: string;
  home: Team;
  away: Team;
  venue: string;
  neutral: boolean;
  lambdaHome: number;
  lambdaAway: number;
  trueScore: Score;
  trueOutcome: Outcome1x2; // knockout games are never "X"
}

function simulateMatch(
  id: number,
  home: Team,
  away: Team,
  neutral: boolean,
  knockout: boolean,
): { score: Score; outcome: Outcome1x2; lambdaHome: number; lambdaAway: number } {
  const { lambdaHome, lambdaAway } = matchupLambdas(home, away, neutral);
  const rnd = mulberry32(0x9e37 + id * 2654435761);
  const h = samplePoisson(lambdaHome, rnd);
  const a = samplePoisson(lambdaAway, rnd);
  let outcome: Outcome1x2 = h > a ? "1" : h < a ? "2" : "X";
  if (knockout && h === a) {
    // Decide level knockout games by an elo-weighted "shootout".
    const pHome = (home.elo + (neutral ? 0 : HOME_ADV)) / (home.elo + away.elo + (neutral ? 0 : HOME_ADV));
    outcome = rnd() < pHome ? "1" : "2";
  }
  return { score: { home: h, away: a }, outcome, lambdaHome, lambdaAway };
}

// ---------------------------------------------------------------------------
// Group stage — round-robin of 4, standings, advancers.
// ---------------------------------------------------------------------------

interface Standing {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
}

const ROUND_ROBIN: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[3, 0], [1, 2]],
];

function emptyStanding(team: Team): Standing {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
}

function applyResult(s: Standing, gf: number, ga: number) {
  s.played++;
  s.gf += gf;
  s.ga += ga;
  if (gf > ga) { s.won++; s.pts += 3; }
  else if (gf === ga) { s.drawn++; s.pts += 1; }
  else s.lost++;
}

function rankStandings(a: Standing, b: Standing): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
  if (gdB !== gdA) return gdB - gdA;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.team.elo === b.team.elo ? a.team.code.localeCompare(b.team.code) : b.team.elo - a.team.elo;
}

// Standard single-elimination seed order for a 32-team bracket.
function seedOrder(n: number): number[] {
  const rounds = Math.log2(n);
  let pots = [1, 2];
  for (let r = 1; r < rounds; r++) {
    const len = pots.length * 2 + 1;
    const next: number[] = [];
    for (const p of pots) {
      next.push(p);
      next.push(len - p);
    }
    pots = next;
  }
  return pots.map((x) => x - 1);
}

export interface Tournament {
  fixtures: SimFixture[];
  standings: Record<string, Standing[]>; // group -> ranked standings
  championCode: string;
}

/** Build the full 104-match tournament, deterministically. */
export function buildTournament(): Tournament {
  const fixtures: SimFixture[] = [];
  const standings: Record<string, Standing[]> = {};
  let id = 1;
  let seq = 0;
  let venueIdx = 0;
  const nextVenue = () => HOST_CITIES[venueIdx++ % HOST_CITIES.length];

  // --- Group stage: 12 groups x 6 matches = 72, ordered by matchday. ---
  const groupFixtures: SimFixture[] = [];
  for (const g of GROUPS) {
    const teams = TEAMS.filter((t) => t.group === g);
    const table = teams.map(emptyStanding);
    for (let md = 0; md < ROUND_ROBIN.length; md++) {
      for (const [i, j] of ROUND_ROBIN[md]) {
        const home = teams[i], away = teams[j];
        const sim = simulateMatch(id, home, away, false, false);
        groupFixtures.push({
          id, seq: 0, stage: "group", group: g,
          round: `Group ${g} — Matchday ${md + 1}`,
          home, away, venue: nextVenue(), neutral: false,
          lambdaHome: sim.lambdaHome, lambdaAway: sim.lambdaAway,
          trueScore: sim.score, trueOutcome: sim.outcome,
        });
        applyResult(table[i], sim.score.home, sim.score.away);
        applyResult(table[j], sim.score.away, sim.score.home);
        id++;
      }
    }
    table.sort(rankStandings);
    standings[g] = table;
  }
  // Order group matches matchday-first (MD1 across all groups, then MD2, MD3) so
  // the timeline mirrors a real tournament and no team is ever "live" twice at once.
  groupFixtures.sort((a, b) => {
    const mdA = a.round.slice(-1), mdB = b.round.slice(-1);
    if (mdA !== mdB) return mdA.localeCompare(mdB);
    return (a.group ?? "").localeCompare(b.group ?? "");
  });
  for (const f of groupFixtures) { f.seq = seq++; fixtures.push(f); }

  // --- Advancers: top 2 per group + 8 best third-placed = 32. ---
  const winners = GROUPS.map((g) => standings[g][0]);
  const runners = GROUPS.map((g) => standings[g][1]);
  const thirds = GROUPS.map((g) => standings[g][2]).sort(rankStandings).slice(0, 8);
  const pool = [...winners, ...runners, ...thirds].sort(rankStandings);
  const order = seedOrder(32);
  const seeded = order.map((idx) => pool[idx].team); // strongest..weakest into bracket slots

  // --- Knockout rounds. ---
  const KO: { stage: StageId; label: string }[] = [
    { stage: "r32", label: "Round of 32" },
    { stage: "r16", label: "Round of 16" },
    { stage: "qf", label: "Quarter-final" },
    { stage: "sf", label: "Semi-final" },
    { stage: "final", label: "Final" },
  ];

  let roundTeams = seeded;
  for (let r = 0; r < KO.length; r++) {
    const { stage, label } = KO[r];
    const winnersNext: Team[] = [];

    // Third-place playoff sits between the semis and the final.
    if (stage === "final" && roundTeams.length === 2) {
      // (losers of the semis handled below via `sfLosers`)
    }

    for (let m = 0; m < roundTeams.length; m += 2) {
      const home = roundTeams[m];
      const away = roundTeams[m + 1];
      const sim = simulateMatch(id, home, away, true, true);
      fixtures.push({
        id, seq: seq++, stage, group: undefined,
        round: `${label} — Match ${m / 2 + 1}`,
        home, away, venue: nextVenue(), neutral: true,
        lambdaHome: sim.lambdaHome, lambdaAway: sim.lambdaAway,
        trueScore: sim.score, trueOutcome: sim.outcome,
      });
      winnersNext.push(sim.outcome === "1" ? home : away);
      id++;
    }

    // Insert the 3rd-place playoff right before the final.
    if (stage === "sf") {
      const sfLosers: Team[] = [];
      // Recompute semi losers from the two SF fixtures we just pushed.
      const sfFixtures = fixtures.filter((f) => f.stage === "sf");
      for (const f of sfFixtures) sfLosers.push(f.trueOutcome === "1" ? f.away : f.home);
      if (sfLosers.length === 2) {
        const sim = simulateMatch(id, sfLosers[0], sfLosers[1], true, true);
        fixtures.push({
          id, seq: seq++, stage: "third", group: undefined,
          round: "Third-place play-off",
          home: sfLosers[0], away: sfLosers[1], venue: nextVenue(), neutral: true,
          lambdaHome: sim.lambdaHome, lambdaAway: sim.lambdaAway,
          trueScore: sim.score, trueOutcome: sim.outcome,
        });
        id++;
      }
    }

    roundTeams = winnersNext;
  }

  const championCode = roundTeams[0]?.code ?? seeded[0].code;
  return { fixtures, standings, championCode };
}

export function teamByCode(code: string): Team | undefined {
  return TEAM_BY_CODE.get(code);
}
