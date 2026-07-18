import { getTxOdds } from "@/lib/txodds";
import { scanForEdges, summarize, type StrikerInput } from "@/lib/agent/striker";

// GET /api/agent/signals -> ranked +EV opportunities the Striker agent would take.
export async function GET() {
  const provider = getTxOdds();
  const fixtures = await provider.getFixtures();
  const open = fixtures.filter((f) => f.status !== "final");

  const inputs: StrikerInput[] = [];
  for (const fixture of open) {
    const [odds, fair] = await Promise.all([
      provider.getOdds(fixture.id),
      provider.getFairProbabilities(fixture.id),
    ]);
    if (odds && fair) inputs.push({ fixture, oneXtwo: odds.oneXtwo, fair });
  }

  const signals = scanForEdges(inputs);
  return Response.json({
    mode: provider.mode,
    summary: summarize(signals, inputs.length),
    signals: signals.slice(0, 40),
  });
}
