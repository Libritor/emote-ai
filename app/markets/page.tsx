import MatchBoard from "@/components/MatchBoard";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI - Integrity Markets on Solana",
};

export default function MarketsPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Prediction Markets & Settlement"
        title="Integrity Markets"
        desc="Trade match-result markets with TxODDS prices and verifiable on-chain settlement. The Emote AI integrity signal appears as experimental context beside each fixture, not as a settlement source."
      />
      <MatchBoard />
    </main>
  );
}
