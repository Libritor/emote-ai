import { NextRequest } from "next/server";
import { modelFair, scanForEdges, summarize, type StrikerInput } from "@/lib/agent/striker";
import { parseAsOf, providerForRequest, withLiveFallback } from "@/lib/txodds/request";

// Cold live-mode scans hit TxLINE for every open fixture — allow up to 60s.
export const maxDuration = 60;

// GET /api/agent/signals -> ranked +EV opportunities the Striker agent would take.
// `fair` is the agent's own view (consensus blended with its elo model) — on
// the demargined live feed the market price IS the consensus, so edges exist
// exactly where the agent's model disagrees with it.
export async function GET(req: NextRequest) {
  const { asOf, provider } = providerForRequest(parseAsOf(req.nextUrl.searchParams));
  const result = await withLiveFallback(
    asOf,
    provider,
    (activeProvider) => activeProvider.getFixtures(),
    (fixtures) => fixtures.length === 0,
  );
  const fixtures = result.value;
  const now = asOf ?? Date.now();
  // Skip past "scheduled" feed-gap fixtures — only live + future kickoffs are tradable.
  const open = fixtures.filter(
    (f) => f.status === "live" || (f.status === "scheduled" && +new Date(f.kickoff) >= now),
  );

  const inputs: StrikerInput[] = [];
  for (const fixture of open) {
    const [odds, fair] = await Promise.all([
      result.provider.getOdds(fixture.id),
      result.provider.getFairProbabilities(fixture.id),
    ]);
    if (odds && fair) inputs.push({ fixture, oneXtwo: odds.oneXtwo, fair: modelFair(fixture, fair) });
  }

  const signals = scanForEdges(inputs);
  return Response.json({
    mode: result.provider.mode,
    asOf,
    summary: summarize(signals, inputs.length),
    signals: signals.slice(0, 40),
  });
}
