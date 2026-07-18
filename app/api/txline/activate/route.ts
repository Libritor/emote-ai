import { TXLINE_MAINNET } from "@/lib/txline/config";

interface ActivateBody {
  jwt: string;
  txSig: string;
  walletSignature: string;
  leagues: number[];
}

// POST /api/txline/activate -> proxy for TxLINE subscription activation.
// Body carries the confirmed subscribe txSig plus the wallet's detached
// signature over `${txSig}:${leagues.join(",")}:${jwt}`.
export async function POST(request: Request) {
  const body: ActivateBody = await request.json();
  if (!body.jwt || !body.txSig || !body.walletSignature) {
    return Response.json({ error: "jwt, txSig and walletSignature are required" }, { status: 400 });
  }
  const res = await fetch(`${TXLINE_MAINNET.apiOrigin}/api/token/activate`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${body.jwt}`,
    },
    body: JSON.stringify({
      txSig: body.txSig,
      walletSignature: body.walletSignature,
      leagues: body.leagues ?? [],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return Response.json(
      { error: `TxLINE activation failed: ${res.status} ${text}` },
      { status: 502 },
    );
  }
  // The endpoint may answer text/plain (the raw token) or JSON {token}.
  let apiToken = text.trim();
  try {
    const parsed: { token?: string } = JSON.parse(text);
    if (parsed.token) apiToken = parsed.token;
  } catch {
    // plain-text token — keep as-is
  }
  return Response.json({ apiToken });
}
