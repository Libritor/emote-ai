import MatchBoard from "@/components/MatchBoard";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI — Integrity Markets on Solana",
};

export default function MarketsPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Prediction Markets & Settlement"
        title="Integrity Markets"
        desc="Trade the integrity of the game. On-chain markets on every World Cup match — the outcome, and whether officiating gets flagged by the Emote AI integrity signal — settled automatically from the on-chain oracle. No bookmaker, no dispute, fully verifiable."
      />
      <div className="mb-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn">
        ⚠ Integrity markets settle from an experimental heuristic signal, published on-chain for
        transparency — for entertainment, not evidence of wrongdoing. Devnet only.
      </div>
      <MatchBoard />
    </main>
  );
}
