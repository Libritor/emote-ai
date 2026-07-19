import type { Fixture, Score } from "./types";

const MINUTE_MS = 60_000;
const MATCH_MS = 105 * MINUTE_MS;

function partialScore(finalScore: Score, minute: number): Score {
  const p = Math.min(1, minute / 90);
  return {
    home: Math.min(finalScore.home, Math.floor(finalScore.home * p + 0.15)),
    away: Math.min(finalScore.away, Math.floor(finalScore.away * p + 0.15)),
  };
}

export function projectFixtureAt(fixture: Fixture, asOfMs: number): Fixture {
  const kickoffMs = +new Date(fixture.kickoff);
  if (!Number.isFinite(kickoffMs)) return fixture;

  if (asOfMs < kickoffMs) {
    const scheduled = { ...fixture };
    delete scheduled.score;
    delete scheduled.minute;
    delete scheduled.outcome;
    return { ...scheduled, status: "scheduled" };
  }

  if (asOfMs < kickoffMs + MATCH_MS) {
    const minute = Math.max(1, Math.min(90, Math.floor((asOfMs - kickoffMs) / MINUTE_MS)));
    const live: Fixture = {
      ...fixture,
      status: "live",
      minute,
    };
    if (fixture.score) live.score = partialScore(fixture.score, minute);
    delete live.outcome;
    return live;
  }

  return {
    ...fixture,
    status: "final",
    minute: fixture.minute ?? 90,
  };
}
