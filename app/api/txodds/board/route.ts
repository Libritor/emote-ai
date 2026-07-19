import { NextRequest } from "next/server";
import { parseAsOf, providerForRequest, withLiveFallback } from "@/lib/txodds/request";

// A cold live-mode scan (scores + closing lines for ~100 fixtures) can take
// ~20s; keep Vercel from killing it mid-flight.
export const maxDuration = 60;

// GET /api/txodds/board -> every fixture with its 1X2 price attached, in one
// payload (avoids N per-card fetches on the markets board).
export async function GET(req: NextRequest) {
  const { asOf, provider } = providerForRequest(parseAsOf(req.nextUrl.searchParams));
  const result = await withLiveFallback(
    asOf,
    provider,
    async (activeProvider) => {
      const fixtures = await activeProvider.getFixtures();
      const items = await Promise.all(
        fixtures.map(async (fixture) => {
          const odds = await activeProvider.getOdds(fixture.id);
          return { fixture, oneXtwo: odds?.oneXtwo ?? null };
        }),
      );
      return items;
    },
    (items) => items.length === 0,
  );
  return Response.json({ mode: result.provider.mode, asOf, items: result.value });
}
