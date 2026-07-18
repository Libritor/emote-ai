import { getTxOdds } from "@/lib/txodds";

// A cold live-mode scan (scores + closing lines for ~100 fixtures) can take
// ~20s; keep Vercel from killing it mid-flight.
export const maxDuration = 60;

// GET /api/txodds/board -> every fixture with its 1X2 price attached, in one
// payload (avoids N per-card fetches on the markets board).
export async function GET() {
  const provider = getTxOdds();
  const fixtures = await provider.getFixtures();
  const items = await Promise.all(
    fixtures.map(async (fixture) => {
      const odds = await provider.getOdds(fixture.id);
      return { fixture, oneXtwo: odds?.oneXtwo ?? null };
    }),
  );
  return Response.json({ mode: provider.mode, items });
}
