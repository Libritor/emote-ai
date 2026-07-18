import { TXLINE_MAINNET } from "@/lib/txline/config";

// POST /api/txline/guest -> proxy for TxLINE guest session start.
// Keeps the browser off txodds.com directly (CORS + corporate DNS filters).
export async function POST() {
  const res = await fetch(`${TXLINE_MAINNET.apiOrigin}/auth/guest/start`, {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) {
    return Response.json(
      { error: `TxLINE guest auth failed: ${res.status} ${await res.text()}` },
      { status: 502 },
    );
  }
  const data: { token: string } = await res.json();
  return Response.json(data);
}
