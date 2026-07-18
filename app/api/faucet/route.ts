import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { serverConnection, loadTreasury } from "@/lib/solana/server";
import { STAKE_DECIMALS } from "@/lib/solana/config";

const DROP = 500; // dUSDC per request

// POST /api/faucet { pubkey } -> mints demo dUSDC to the user's ATA (devnet).
export async function POST(req: NextRequest) {
  const treasury = loadTreasury();
  const mintStr = process.env.NEXT_PUBLIC_STAKE_MINT;
  if (!treasury || !mintStr || mintStr === "11111111111111111111111111111111") {
    return Response.json({ error: "faucet not configured (program not yet deployed)" }, { status: 503 });
  }

  let user: PublicKey;
  try {
    const { pubkey } = await req.json();
    user = new PublicKey(pubkey);
  } catch {
    return Response.json({ error: "invalid pubkey" }, { status: 400 });
  }

  try {
    const connection = serverConnection();
    const mint = new PublicKey(mintStr);
    const ata = await getOrCreateAssociatedTokenAccount(connection, treasury, mint, user);
    const sig = await mintTo(connection, treasury, mint, ata.address, treasury, DROP * 10 ** STAKE_DECIMALS);
    return Response.json({ signature: sig, amount: DROP });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
