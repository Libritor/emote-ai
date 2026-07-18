import { INTEGRITY_DISCLAIMER } from "@/lib/emote/integrity";

export default function IntegrityDisclaimer() {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn">
      {INTEGRITY_DISCLAIMER}
    </div>
  );
}
