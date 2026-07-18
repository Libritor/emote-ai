import MatchDay from "@/components/MatchDay";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "PitchProof MatchDay — free-to-play World Cup pick'em on Solana",
};

export default function MatchDayPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Consumer & Fan Experiences"
        title="MatchDay"
        desc="Free to play. Call the result of every World Cup match, climb the leaderboard, keep your streak alive, and mint collectible Moments from the games you got right — all powered by the same on-chain feed."
      />
      <MatchDay />
    </main>
  );
}
