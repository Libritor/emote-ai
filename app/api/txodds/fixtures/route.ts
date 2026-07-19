import { NextRequest } from "next/server";
import { parseAsOf, providerForRequest, withLiveFallback } from "@/lib/txodds/request";

// GET /api/txodds/fixtures            -> all 104 fixtures (live clock applied)
// GET /api/txodds/fixtures?status=live
// GET /api/txodds/fixtures?stage=group
export async function GET(req: NextRequest) {
  const { asOf, provider } = providerForRequest(parseAsOf(req.nextUrl.searchParams));
  const result = await withLiveFallback(
    asOf,
    provider,
    (activeProvider) => activeProvider.getFixtures(),
    (fixtures) => fixtures.length === 0,
  );

  const status = req.nextUrl.searchParams.get("status");
  const stage = req.nextUrl.searchParams.get("stage");
  let out = result.value;
  if (status) out = out.filter((f) => f.status === status);
  if (stage) out = out.filter((f) => f.stage === stage);

  return Response.json({ mode: result.provider.mode, asOf, count: out.length, fixtures: out });
}
