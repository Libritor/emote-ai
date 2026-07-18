// Integrity Signal — an EXPERIMENTAL "suspicion" heuristic for entertainment.
//
// ⚠ HONEST SCOPE (load-bearing): this is NOT a lie detector and NOT evidence of
// any real wrongdoing. Facial/physiological deception detection is not
// scientifically reliable — the Emote AI signal-processing authors deliberately
// refuse to ship a "guilt" score for exactly this reason. We surface it here
// only as a transparent, auditable, on-chain crowd-entertainment signal for the
// World Cup: a "suspicion meter" you can point at a ref or player for fun. Every
// number is interpretable and published on-chain so it can be challenged — the
// transparency is the whole point.

export const INTEGRITY_DISCLAIMER =
  "Experimental heuristic for entertainment only — NOT a lie detector and not evidence of " +
  "wrongdoing. Facial/physiological deception detection is not scientifically reliable.";

export interface EmotionProbs {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  fearful: number;
  disgusted: number;
}

export interface IntegrityInput {
  emotion: EmotionProbs | null;
  stress: number | null; // 0-100 arousal index (from rPPG HR/HRV)
  quality: number; // 0-100 signal quality
}

export type IntegrityLabel = "Composed" | "Nervous" | "Elevated" | "Flagged";

export interface IntegrityReading {
  suspicion: number; // 0-100 composite "suspicion" score
  guilt: number; // 0-100 guilt heuristic
  tells: number; // 0-100 micro-expression tells
  masking: number; // 0-100 calm face over high arousal
  label: IntegrityLabel;
  confidence: number; // 0-100 (tracks signal quality)
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Guilt heuristic (ported from the single-file Emote AI Trust Score, adapted to
 * MediaPipe expression classes): fear + sadness + a touch of disgust, amplified
 * when the subject holds a neutral mask.
 */
function guiltHeuristic(e: EmotionProbs): number {
  let g = e.fearful * 0.6 + e.sad * 0.3 + e.disgusted * 0.1;
  if (e.neutral > 0.5) g *= 1.2; // masking a true reaction
  return clamp01(g);
}

export function computeIntegrity(input: IntegrityInput): IntegrityReading {
  const e = input.emotion;
  const stress = input.stress ?? 0;
  const quality = input.quality;

  const guilt = e ? guiltHeuristic(e) : 0; // 0-1
  const tells = e ? clamp01(e.fearful + e.disgusted * 0.8 + e.surprised * 0.4) : 0; // 0-1
  // Masking: a calm/neutral face while physiology says high arousal.
  const masking = e ? clamp01((e.neutral - 0.4) * (stress / 100) * 2) : 0; // 0-1

  // Composite, gated by how trustworthy the signal is.
  const conf = clamp01(quality / 70);
  const raw = 0.4 * guilt + 0.3 * (stress / 100) + 0.2 * tells + 0.1 * masking; // 0-1
  const suspicion = Math.round(100 * clamp01(raw) * (0.4 + 0.6 * conf));

  let label: IntegrityLabel = "Composed";
  if (suspicion >= 75) label = "Flagged";
  else if (suspicion >= 55) label = "Elevated";
  else if (suspicion >= 30) label = "Nervous";

  return {
    suspicion,
    guilt: Math.round(guilt * 100),
    tells: Math.round(tells * 100),
    masking: Math.round(masking * 100),
    label,
    confidence: Math.round(quality),
  };
}

/**
 * A deterministic per-match "integrity" reading for the demo — stands in for the
 * aggregate on-chain integrity attestation the oracle would write from live
 * Ref-Cam analysis. Seeded by match id so it's stable. Experimental heuristic.
 */
export function matchSuspicion(matchId: number): { score: number; label: IntegrityLabel } {
  const x = Math.sin(matchId * 12.9898 + 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  // Most matches are clean; a few skew suspicious.
  const score = Math.round(Math.pow(frac, 1.7) * 100);
  let label: IntegrityLabel = "Composed";
  if (score >= 75) label = "Flagged";
  else if (score >= 55) label = "Elevated";
  else if (score >= 30) label = "Nervous";
  return { score, label };
}

export function labelColor(label: IntegrityLabel): string {
  switch (label) {
    case "Composed": return "var(--color-up)";
    case "Nervous": return "var(--color-warn)";
    case "Elevated": return "#ff8a3d";
    case "Flagged": return "var(--color-down)";
  }
}
