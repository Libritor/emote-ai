// Create the demo SPL "dUSDC" stake mint on devnet and mint a supply to the
// signer, so anyone can be airdropped stake tokens in the app.
// Run: npx tsx scripts/onchain/create-mint.ts

import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Connection } from "@solana/web3.js";
import { RPC, loadKeypair } from "./setup";

const DECIMALS = 6;

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const payer = loadKeypair();
  console.log("payer:", payer.publicKey.toBase58());

  const mint = await createMint(connection, payer, payer.publicKey, null, DECIMALS);
  console.log("mint:", mint.toBase58());

  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  await mintTo(connection, payer, mint, ata.address, payer, 1_000_000 * 10 ** DECIMALS);
  console.log("minted 1,000,000 dUSDC to treasury:", ata.address.toBase58());
  console.log("\nSet NEXT_PUBLIC_STAKE_MINT=" + mint.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
