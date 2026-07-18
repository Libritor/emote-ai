import Terminal from "@/components/Terminal";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI - Sentinel trading agent on Solana",
};

export default function TerminalPage() {
  return (
    <main className="px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Trading Tools & Agents"
        title="Sentinel"
        desc="An autonomous agent scans TxODDS prices, ranks positive expected-value edges, and logs each simulated booking transparently. Integrity readings stay visible as context rather than as an execution trigger."
      />
      <Terminal />
    </main>
  );
}
