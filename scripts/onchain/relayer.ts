// Oracle relayer: reads the TxODDS feed (mock) and writes each match's current
// state — teams, status, score, outcome, and a sha256 data hash — into the
// on-chain match account. Final matches are settled. This is the exact data the
// markets resolve against and the Verify page recomputes.
//
// Run: npx tsx scripts/onchain/relayer.ts [limit]

import { SystemProgram } from "@solana/web3.js";
import { getContext } from "./setup";
import { oraclePda, matchPda } from "../../lib/solana/pda";
import { MockTxOddsProvider, trueResult } from "../../lib/txodds/mock";
import { attest } from "../../lib/oracle/attest";

const STATUS = { scheduled: 0, live: 1, final: 2 } as const;
const OUTCOME = { "1": 1, X: 2, "2": 3, unset: 0 } as const;

function codeBytes(code: string): number[] {
  const b = [0, 0, 0];
  for (let i = 0; i < 3 && i < code.length; i++) b[i] = code.charCodeAt(i);
  return b;
}

async function main() {
  const limit = Number(process.argv[2] ?? 24);
  const { program, kp } = getContext();
  const [oracle] = oraclePda(program.programId);

  const provider = new MockTxOddsProvider();
  const fixtures = await provider.getFixtures();
  // Push matches that have kicked off (live/final) first — those are settle-able
  // and interesting to show; cap at `limit` to keep devnet costs sane.
  const targets = fixtures
    .filter((f) => f.status !== "scheduled")
    .sort((a, b) => a.id - b.id)
    .slice(0, limit);

  console.log(`relayer: syncing ${targets.length} matches to devnet...`);
  for (const f of targets) {
    const [matchData] = matchPda(program.programId, f.id);
    const a = attest(f);
    // For final matches, use the true result; else current (possibly partial) score.
    const res = f.status === "final" ? trueResult(f.id) : null;
    const outcome = f.status === "final" && res ? OUTCOME[res.outcome] : OUTCOME.unset;
    const score = f.score ?? { home: 0, away: 0 };
    const dataHash = [...Buffer.from(a.dataHash, "hex")];

    const args = {
      matchId: f.id,
      home: codeBytes(f.home.code),
      away: codeBytes(f.away.code),
      kickoff: Math.floor(new Date(f.kickoff).getTime() / 1000),
      status: STATUS[f.status],
      homeScore: score.home,
      awayScore: score.away,
      outcome,
      dataHash,
    };

    try {
      const sig = await program.methods
        .upsertMatch(args as never)
        .accounts({ oracle, matchData, authority: kp.publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      console.log(`  #${f.id} ${f.home.code}-${f.away.code} ${f.status} outcome=${outcome} ${sig.slice(0, 8)}…`);
    } catch (e) {
      console.error(`  #${f.id} failed:`, (e as Error).message);
    }
  }
  console.log("relayer: done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
