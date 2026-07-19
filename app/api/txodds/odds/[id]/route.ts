import { NextRequest } from "next/server";
import { parseAsOf, providerForRequest, withLiveFallback } from "@/lib/txodds/request";

// GET /api/txodds/odds/:id -> market odds (1X2 + O/U 2.5) and margin-free fair probs.
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/txodds/odds/[id]">,
) {
  const { id } = await ctx.params;
  const fixtureId = Number(id);
  if (!Number.isFinite(fixtureId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const { asOf, provider } = providerForRequest(parseAsOf(req.nextUrl.searchParams));
  const result = await withLiveFallback(asOf, provider, async (activeProvider) => {
    const [odds, fair, fixture] = await Promise.all([
      activeProvider.getOdds(fixtureId),
      activeProvider.getFairProbabilities(fixtureId),
      activeProvider.getFixture(fixtureId),
    ]);
    return { odds, fair, fixture };
  }, (value) => !value.odds || !value.fixture);
  const { odds, fair, fixture } = result.value;
  if (!odds || !fixture) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ mode: result.provider.mode, asOf, fixture, odds, fair });
}
