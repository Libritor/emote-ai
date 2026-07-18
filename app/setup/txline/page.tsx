import TxlineSetup from "@/components/TxlineSetup";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI - TxLINE setup",
};

// One-time operator page: signs the free-tier TxLINE subscription with the
// connected wallet and mints the server API credentials. Safe to leave
// deployed — it only ever writes credentials to the operator's clipboard.
export default function TxlineSetupPage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Operator setup"
        title="TxLINE live-data activation"
        desc="Subscribe to the free World Cup tier on Solana mainnet with your wallet, then activate the TxLINE API token that powers the live feed. Sign-up happens entirely through Solana."
      />
      <TxlineSetup />
    </main>
  );
}
