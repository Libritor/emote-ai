"use client";

// A rolling sparkline of the integrity/suspicion score over time. Turns the
// analyzer into a monitoring surface so spikes (and their timing) are visible —
// the core of correlating a "tell" with a match moment.

const W = 600;
const H = 120;

function levelColor(v: number): string {
  return v >= 75 ? "var(--color-down)" : v >= 55 ? "#ff8a3d" : v >= 30 ? "var(--color-warn)" : "var(--color-up)";
}

export default function IntegrityTimeline({
  data,
  windowSec = 60,
}: {
  data: number[]; // suspicion samples 0..100, oldest -> newest
  windowSec?: number;
}) {
  const n = data.length;
  const last = n ? data[n - 1] : 0;

  // Peak in the window.
  let peak = 0, peakIdx = -1;
  for (let i = 0; i < n; i++) if (data[i] > peak) { peak = data[i]; peakIdx = i; }

  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / 100) * H;

  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPts = n ? `0,${H} ${pts} ${W},${H}` : "";

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Integrity timeline</div>
        <div className="text-xs text-faint">
          last {windowSec}s · peak <span className="mono font-bold" style={{ color: levelColor(peak) }}>{peak}</span>
        </div>
      </div>
      <div className="relative w-full overflow-hidden rounded-lg bg-surface-2" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          {/* threshold guides */}
          {[30, 55, 75].map((t) => (
            <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4 4" />
          ))}
          {n > 1 && (
            <>
              <polygon points={areaPts} fill={levelColor(last)} opacity={0.14} />
              <polyline points={pts} fill="none" stroke={levelColor(last)} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {peakIdx >= 0 && peak >= 30 && (
            <circle cx={x(peakIdx)} cy={y(peak)} r={4} fill="var(--color-down)" stroke="var(--color-base)" strokeWidth={1.5} />
          )}
        </svg>
        {n <= 1 && (
          <div className="absolute inset-0 grid place-items-center text-xs text-faint">
            Recording begins when a face is detected…
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-faint">
        <span>Composed</span><span>Nervous</span><span>Elevated</span><span>Flagged</span>
      </div>
    </div>
  );
}
