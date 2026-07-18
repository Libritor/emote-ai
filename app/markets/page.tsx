import MatchBoard from "@/components/MatchBoard";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "PitchProof Markets — trustless World Cup prediction markets on Solana",
};

export default function MarketsPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Prediction Markets & Settlement"
        title="Markets"
        desc="Every World Cup match is a market. Stake on the outcome, and settlement happens automatically from the on-chain TxODDS oracle — no bookmaker, no dispute, fully verifiable."
      />
      <MatchBoard />
    </main>
  );
}
