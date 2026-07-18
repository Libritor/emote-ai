// PDA derivations — must mirror the seeds in programs/pitchproof/src/lib.rs.
import { PublicKey } from "@solana/web3.js";

function u32le(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

export function oraclePda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("oracle")], programId);
}

export function matchPda(programId: PublicKey, matchId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("match"), u32le(matchId)], programId);
}

export function marketPda(programId: PublicKey, matchId: number, kind = 0): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), u32le(matchId), Buffer.from([kind])],
    programId,
  );
}

export function vaultPda(programId: PublicKey, market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], programId);
}

export function positionPda(
  programId: PublicKey,
  market: PublicKey,
  user: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), user.toBuffer()],
    programId,
  );
}

export function pickPda(programId: PublicKey, user: PublicKey, matchId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pick"), user.toBuffer(), u32le(matchId)],
    programId,
  );
}

/** 1/X/2 outcome code -> pool index (home=0, draw=1, away=2). */
export function outcomeToIndex(outcome: "1" | "X" | "2"): number {
  return outcome === "1" ? 0 : outcome === "X" ? 1 : 2;
}
