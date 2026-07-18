import { NextRequest } from "next/server";
import { getTxOdds } from "@/lib/txodds";

// GET /api/txodds/odds/:id -> market odds (1X2 + O/U 2.5) and margin-free fair probs.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/txodds/odds/[id]">,
) {
  const { id } = await ctx.params;
  const fixtureId = Number(id);
  if (!Number.isFinite(fixtureId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const provider = getTxOdds();
  const [odds, fair, fixture] = await Promise.all([
    provider.getOdds(fixtureId),
    provider.getFairProbabilities(fixtureId),
    provider.getFixture(fixtureId),
  ]);
  if (!odds || !fixture) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ mode: provider.mode, fixture, odds, fair });
}
