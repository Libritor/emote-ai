// Initialize the oracle config PDA. The signer becomes both admin and the
// relayer authority allowed to write match results.
// Run: npx tsx scripts/onchain/init-oracle.ts

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getContext } from "./setup";
import { oraclePda } from "../../lib/solana/pda";

async function main() {
  const { program, kp } = getContext();
  const programId = program.programId;
  const [oracle] = oraclePda(programId);

  const existing = await program.provider.connection.getAccountInfo(oracle);
  if (existing) {
    console.log("oracle already initialized at", oracle.toBase58());
    return;
  }

  const sig = await program.methods
    .initOracle(kp.publicKey)
    .accounts({ oracle, admin: kp.publicKey, systemProgram: SystemProgram.programId })
    .rpc();
  console.log("oracle initialized:", oracle.toBase58());
  console.log("authority:", kp.publicKey.toBase58());
  console.log("tx:", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
