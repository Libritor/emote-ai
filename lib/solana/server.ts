// Server-only Solana helpers for the faucet + oracle-sync routes.
import { Connection, Keypair, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

/** A minimal AnchorProvider-compatible wallet from a keypair (avoids importing
 *  anchor's `Wallet`, which isn't in its ESM export used by the Next build). */
export function keypairWallet(kp: Keypair) {
  const sign = <T extends Transaction | VersionedTransaction>(tx: T): T => {
    if ("version" in tx) (tx as VersionedTransaction).sign([kp]);
    else (tx as Transaction).partialSign(kp);
    return tx;
  };
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => sign(tx),
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs.map(sign),
  };
}

export function serverConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com",
    "confirmed",
  );
}

/** The treasury / oracle-authority keypair (ORACLE_SECRET_KEY: base58 or JSON array). */
export function loadTreasury(): Keypair | null {
  const s = process.env.ORACLE_SECRET_KEY;
  if (!s) return null;
  try {
    const t = s.trim();
    if (t.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(t)));
    return Keypair.fromSecretKey(bs58.decode(t));
  } catch {
    return null;
  }
}
