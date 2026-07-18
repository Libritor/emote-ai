import Terminal from "@/components/Terminal";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "PitchProof Terminal — trading desk & autonomous agent on Solana",
};

export default function TerminalPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Trading Tools & Agents"
        title="Terminal"
        desc="A pro trading desk on top of the PitchProof markets, plus Striker — an autonomous agent that prices every market off the TxODDS feed and takes positive-EV edges with a transparent, deterministic strategy."
      />
      <Terminal />
    </main>
  );
}
