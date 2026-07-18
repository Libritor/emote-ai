// A captured integrity "reading" — a timestamped snapshot of the experimental
// suspicion signal, reduced to a canonical string + sha256 evidence hash. This
// is the on-chain-ready attestation: the same shape the oracle would publish so
// anyone can recompute it and audit exactly what was recorded (transparency is
// the whole point — this is NOT evidence of wrongdoing).

export interface CapturedReading {
  subject: string;
  suspicion: number;
  guilt: number;
  tells: number;
  masking: number;
  hr: number | null;
  ts: number; // epoch ms
}

export function readingCanonical(r: CapturedReading): string {
  return [
    "EMOTEAI-INTEGRITY-V1",
    `subj:${r.subject}`,
    `susp:${r.suspicion}`,
    `g:${r.guilt}`,
    `t:${r.tells}`,
    `m:${r.masking}`,
    `hr:${r.hr ?? "na"}`,
    `ts:${r.ts}`,
  ].join("|");
}

/** sha256 hex of the canonical record (Web Crypto — browser & modern Node). */
export async function hashReading(r: CapturedReading): Promise<string> {
  const bytes = new TextEncoder().encode(readingCanonical(r));
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
