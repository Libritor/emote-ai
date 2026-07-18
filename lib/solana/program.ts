"use client";

// Client-side Anchor program access. Uses the generated IDL. Untyped `Program`
// (methods/accounts are `any`) to avoid friction with the JSON IDL — the PDAs
// and account shapes are enforced by lib/solana/pda.ts and the program itself.

import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import idlJson from "./idl/pitchproof.json";

export const IDL = idlJson as Idl;

export interface SignerWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function getProgram(connection: Connection, wallet: SignerWallet): any {
  const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });
  return new Program(IDL, provider);
}

/** Read-only program (no signer) for fetching accounts on pages without a wallet. */
export function getReadonlyProgram(connection: Connection): any {
  const dummy = Keypair.generate();
  const wallet = {
    publicKey: dummy.publicKey,
    signTransaction: async (t: any) => t,
    signAllTransactions: async (t: any) => t,
  };
  const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });
  return new Program(IDL, provider);
}

export async function fetchMatch(program: any, pda: PublicKey) {
  try {
    return await program.account.matchData.fetch(pda);
  } catch {
    return null;
  }
}

export async function fetchMarket(program: any, pda: PublicKey) {
  try {
    return await program.account.market.fetch(pda);
  } catch {
    return null;
  }
}

export async function fetchPosition(program: any, pda: PublicKey) {
  try {
    return await program.account.position.fetch(pda);
  } catch {
    return null;
  }
}
