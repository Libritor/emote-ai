// Canonical match attestation + data hash. Server-side (uses node:crypto).
//
// This is the single source of truth for "what the oracle commits on-chain".
// Both the relayer (scripts/relayer.ts) and the public Verify explorer compute
// the hash here, so the on-chain data_hash always matches what users can verify.

import { createHash } from "crypto";
import type { Fixture } from "@/lib/txodds/types";

export interface Attestation {
  matchId: number;
  home: string;
  away: string;
  kickoff: string;
  outcome: "1" | "X" | "2" | "?";
  score: string; // "h-a"
  /** Canonical string that gets hashed. */
  canonical: string;
  /** sha256 hex of `canonical` - stored on-chain as [u8;32]. */
  dataHash: string;
}

/** Deterministic canonical serialization of a settled fixture. */
export function canonicalString(f: Fixture): string {
  const score = f.score ? `${f.score.home}-${f.score.away}` : "0-0";
  return [
    "PITCHPROOF-WC26",
    `match:${f.id}`,
    `${f.home.code}v${f.away.code}`,
    `ko:${f.kickoff}`,
    `res:${f.outcome ?? "?"}`,
    `score:${score}`,
  ].join("|");
}

export function attest(f: Fixture): Attestation {
  const canonical = canonicalString(f);
  const dataHash = createHash("sha256").update(canonical).digest("hex");
  return {
    matchId: f.id,
    home: f.home.code,
    away: f.away.code,
    kickoff: f.kickoff,
    outcome: f.outcome ?? "?",
    score: f.score ? `${f.score.home}-${f.score.away}` : "0-0",
    canonical,
    dataHash,
  };
}
