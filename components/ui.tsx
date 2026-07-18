import type { Fixture } from "@/lib/txodds/types";
import { stageLabel } from "@/lib/format";

export function StatusChip({ fixture }: { fixture: Fixture }) {
  if (fixture.status === "live") {
    return (
      <span className="chip chip-live">
        <span className="h-1.5 w-1.5 rounded-full bg-[#04130c]" />
        {fixture.minute}&rsquo; LIVE
      </span>
    );
  }
  if (fixture.status === "final") {
    return <span className="chip chip-final">Full time</span>;
  }
  return <span className="chip">Upcoming</span>;
}

export function StageChip({ fixture }: { fixture: Fixture }) {
  return (
    <span className="chip">
      {fixture.group ? `Group ${fixture.group}` : stageLabel(fixture.stage)}
    </span>
  );
}

export function Flag({ code, flag, size = "text-xl" }: { code: string; flag: string; size?: string }) {
  return (
    <span className={size} title={code} aria-hidden>
      {flag}
    </span>
  );
}

export function TeamRow({
  code,
  flag,
  name,
  score,
  bold,
}: {
  code: string;
  flag: string;
  name: string;
  score?: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Flag code={code} flag={flag} />
      <span className={`truncate ${bold ? "font-bold text-ink" : "font-semibold text-ink"}`}>
        {name}
      </span>
      {score !== undefined && (
        <span className="ml-auto mono text-lg font-bold tabular-nums">{score}</span>
      )}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card-2 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="mt-1 text-xl font-black tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
