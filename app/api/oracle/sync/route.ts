import { NextRequest } from "next/server";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { serverConnection, loadTreasury, keypairWallet } from "@/lib/solana/server";
import { PROGRAM_ID, isProgramConfigured } from "@/lib/solana/config";
import { oraclePda, matchPda } from "@/lib/solana/pda";
import { getTxOdds } from "@/lib/txodds";
import { attest } from "@/lib/oracle/attest";
import idlJson from "@/lib/solana/idl/pitchproof.json";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS = { scheduled: 0, live: 1, final: 2 } as const;
const OUTCOME: Record<string, number> = { "1": 1, X: 2, "2": 3 };

function codeBytes(code: string): number[] {
  const b = [0, 0, 0];
  for (let i = 0; i < 3 && i < code.length; i++) b[i] = code.charCodeAt(i);
  return b;
}

// POST /api/oracle/sync { limit? } -> writes live/final match results on-chain.
export async function POST(req: NextRequest) {
  const treasury = loadTreasury();
  if (!treasury || !isProgramConfigured()) {
    return Response.json({ error: "oracle not configured (program not yet deployed)" }, { status: 503 });
  }
  const limit = Math.min(12, Number((await req.json().catch(() => ({}))).limit ?? 8));

  const connection = serverConnection();
  const programId = new PublicKey(PROGRAM_ID);
  const provider = new AnchorProvider(connection, keypairWallet(treasury) as never, { commitment: "confirmed" });
  const program: any = new Program(idlJson as Idl, provider);
  const [oracle] = oraclePda(programId);

  // Bootstrap the oracle config if needed.
  const oracleInfo = await connection.getAccountInfo(oracle);
  if (!oracleInfo) {
    await program.methods
      .initOracle(treasury.publicKey)
      .accountsPartial({ oracle, admin: treasury.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
  }

  const fixtures = await getTxOdds().getFixtures();
  const targets = fixtures.filter((f) => f.status !== "scheduled").sort((a, b) => a.id - b.id).slice(0, limit);

  const written: { id: number; sig: string }[] = [];
  for (const f of targets) {
    const [matchData] = matchPda(programId, f.id);
    const a = attest(f);
    const score = f.score ?? { home: 0, away: 0 };
    const args = {
      matchId: f.id,
      home: codeBytes(f.home.code),
      away: codeBytes(f.away.code),
      kickoff: new BN(Math.floor(new Date(f.kickoff).getTime() / 1000)),
      status: STATUS[f.status],
      homeScore: score.home,
      awayScore: score.away,
      outcome: f.status === "final" && f.outcome ? OUTCOME[f.outcome] : 0,
      dataHash: [...Buffer.from(a.dataHash, "hex")],
    };
    try {
      const sig = await program.methods
        .upsertMatch(args)
        .accountsPartial({ oracle, matchData, authority: treasury.publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      written.push({ id: f.id, sig });
    } catch {
      /* skip a failed match, keep going */
    }
  }

  return Response.json({ synced: written.length, matches: written });
}
