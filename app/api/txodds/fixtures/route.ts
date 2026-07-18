import { NextRequest } from "next/server";
import { getTxOdds } from "@/lib/txodds";

// GET /api/txodds/fixtures            -> all 104 fixtures (live clock applied)
// GET /api/txodds/fixtures?status=live
// GET /api/txodds/fixtures?stage=group
export async function GET(req: NextRequest) {
  const provider = getTxOdds();
  const fixtures = await provider.getFixtures();

  const status = req.nextUrl.searchParams.get("status");
  const stage = req.nextUrl.searchParams.get("stage");
  let out = fixtures;
  if (status) out = out.filter((f) => f.status === status);
  if (stage) out = out.filter((f) => f.stage === stage);

  return Response.json({ mode: provider.mode, count: out.length, fixtures: out });
}
