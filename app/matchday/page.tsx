import MatchDay from "@/components/MatchDay";
import EmoteAnalyzer from "@/components/EmoteAnalyzer";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI - The Integrity Room",
};

export default function IntegrityRoomPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Consumer & Fan Experiences"
        title="The Integrity Room"
        desc="Fans become the watchdog. Point Emote AI at a referee or player, read the live integrity meter, then make demo picks against match events and climb a demo leaderboard."
      />

      <div className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">The Ref Cam</div>
      <div className="mb-10">
        <EmoteAnalyzer subject="referee or player" />
      </div>

      <div className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">Spot the Fix</div>
      <MatchDay />
    </main>
  );
}
