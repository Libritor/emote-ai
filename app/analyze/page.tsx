import EmoteAnalyzer from "@/components/EmoteAnalyzer";
import { SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Emote AI — Analyze",
};

export default function AnalyzePage() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Detection core"
        title="Analyze"
        desc="Point Emote AI at a referee or player — live via webcam or an uploaded match clip. It reads heart rate (rPPG), stress/arousal, fatigue and expression, and fuses them into an experimental 'integrity' suspicion signal that can be published on-chain."
      />
      <EmoteAnalyzer subject="ref or player" />
    </main>
  );
}
