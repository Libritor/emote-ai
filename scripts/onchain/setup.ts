// Shared setup for the on-chain scripts (run on Windows node via tsx, hitting
// devnet RPC). Loads the connection, the signer keypair, and the Anchor program.
//
//   ORACLE_KEYPAIR   path to the signer keypair json (defaults to .keys/oracle.json)
//   SOLANA_RPC       devnet RPC (defaults to public devnet)
//
// The signer is the oracle authority + payer for admin/relayer actions.

import fs from "fs";
import path from "path";
import { AnchorProvider, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import idl from "../../lib/solana/idl/pitchproof.json";

export const RPC = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";

export function loadKeypair(p?: string): Keypair {
  const file = p ?? process.env.ORACLE_KEYPAIR ?? path.join(process.cwd(), ".keys", "oracle.json");
  const secret = JSON.parse(fs.readFileSync(file, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function getContext(keypairPath?: string) {
  const connection = new Connection(RPC, "confirmed");
  const kp = loadKeypair(keypairPath);
  const wallet = new Wallet(kp);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl as Idl, provider);
  return { connection, kp, wallet, provider, program };
}

export const PROGRAM_ID = (idl as { address: string }).address;
