import Terminal from "@/components/Terminal";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI — Sentinel trading agent on Solana",
};

export default function TerminalPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Trading Tools & Agents"
        title="Sentinel"
        desc="An autonomous agent that fuses the Emote AI integrity signal with TxODDS odds: it prices every market, flags and hedges matches where officiating looks suspicious, and logs every decision transparently. A Tilt-Guard also reads your own biometrics to gate over-heated trading."
      />
      <Terminal />
    </main>
  );
}
