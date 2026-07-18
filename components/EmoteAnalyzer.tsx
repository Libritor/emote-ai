"use client";

import { useRef, useState } from "react";
import { useEmoteEngine } from "@/lib/emote/useEmoteEngine";
import IntegrityDisclaimer from "@/components/IntegrityDisclaimer";
import { labelColor } from "@/lib/emote/integrity";
import { EMPTY, asInt, asScore100, formatScore100 } from "@/lib/format";

const EMOTION_ORDER = ["neutral", "happy", "sad", "angry", "surprised", "fearful", "disgusted"] as const;

function displayVital(n: number | null | undefined): string | number {
  const v = asInt(n);
  return v ?? EMPTY;
}

export default function EmoteAnalyzer({ subject = "subject" }: { subject?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { signals, running, error, startWebcam, startClip, stop } = useEmoteEngine();
  const [source, setSource] = useState<"none" | "webcam" | "clip">("none");

  const onWebcam = () => {
    if (videoRef.current) { setSource("webcam"); startWebcam(videoRef.current); }
  };
  const onClip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const v = videoRef.current;
    if (!file || !v) return;
    v.srcObject = null;
    v.src = URL.createObjectURL(file);
    v.loop = true;
    v.muted = true;
    setSource("clip");
    startClip(v);
  };
  const onStop = () => { setSource("none"); stop(); };

  const integ = signals.integrity;

  return (
    <div className="space-y-4">
      <IntegrityDisclaimer />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Video */}
        <div className="card overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              style={{ transform: source === "webcam" ? "scaleX(-1)" : "none" }}
              playsInline
              muted
            />
            {source === "none" && (
              <div className="absolute inset-0 grid place-items-center text-center text-muted">
                <div>
                  <div className="mb-1 text-lg font-bold">Point Emote AI at a {subject}</div>
                  <div className="text-sm">Start your webcam, or upload a match clip to analyze.</div>
                </div>
              </div>
            )}
            {running && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold backdrop-blur">
                <span className="live-dot" /> {signals.status}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
            {!running ? (
              <>
                <button onClick={onWebcam} className="btn btn-primary">Start webcam</button>
                <label className="btn btn-ghost cursor-pointer">
                  Upload clip
                  <input type="file" accept="video/*" onChange={onClip} className="hidden" />
                </label>
              </>
            ) : (
              <button onClick={onStop} className="btn btn-ghost">Stop</button>
            )}
            {error && <span className="text-xs text-down">{error}</span>}
          </div>
        </div>

        {/* Integrity meter */}
        <div className="card flex flex-col p-5">
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">Integrity signal</div>
          <div className="text-xs text-faint">experimental suspicion meter - {subject}</div>

          <div className="my-4 flex items-center justify-center">
            <Gauge value={integ?.suspicion} label={integ?.label} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini k="Guilt" v={integ?.guilt} />
            <Mini k="Tells" v={integ?.tells} />
            <Mini k="Masking" v={integ?.masking} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-muted">Signal confidence</span>
            <span className="mono font-bold">{formatScore100(integ?.confidence)}</span>
          </div>
        </div>
      </div>

      {/* Vitals + emotion */}
      <div className="grid gap-4 md:grid-cols-4">
        <Vital k="Heart rate" v={displayVital(signals.bpm)} unit="BPM" />
        <Vital k="HRV (RMSSD)" v={displayVital(signals.rmssd)} unit="ms" sub="est." />
        <Vital k="Stress / arousal" v={formatScore100(signals.stress)} unit="" />
        <Vital k="Fatigue" v={signals.facePresent ? formatScore100(signals.fatigueScore) : EMPTY} unit="" sub={`${signals.blinks} blinks`} />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Expression read</div>
          {signals.emotion && (
            <span className="chip capitalize">
              {signals.emotion.dominant} - {(signals.emotion.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {EMOTION_ORDER.map((e) => {
            const p = signals.emotion?.probabilities?.[e] ?? 0;
            return (
              <div key={e} className="flex items-center gap-2 text-xs">
                <span className="w-16 capitalize text-muted">{e}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full bg-primary transition-all" style={{ width: `${p * 100}%` }} />
                </div>
                <span className="mono w-8 text-right text-faint">{(p * 100).toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Gauge({ value, label }: { value?: number; label?: string }) {
  const hasValue = value != null;
  const score = asScore100(value);
  const r = 54, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  const color = score >= 75 ? "var(--color-down)" : score >= 55 ? "#ff8a3d" : score >= 30 ? "var(--color-warn)" : "var(--color-up)";
  const displayLabel = label ?? EMPTY;
  return (
    <div
      className="relative h-40 w-40"
      role="meter"
      aria-label="Integrity suspicion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={hasValue ? score : undefined}
      aria-valuetext={hasValue ? `${score}% ${displayLabel}` : "No signal"}
    >
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .3s, stroke .3s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="mono text-4xl font-black">{hasValue ? score : EMPTY}</div>
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: label ? labelColor(label as never) : "var(--color-faint)" }}>{displayLabel}</div>
      </div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v?: number }) {
  return (
    <div className="card-2 py-2">
      <div className="mono text-lg font-bold">{formatScore100(v)}</div>
      <div className="text-[10px] uppercase tracking-wide text-faint">{k}</div>
    </div>
  );
}

function Vital({ k, v, unit, sub }: { k: string; v: React.ReactNode; unit: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-faint">{k}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="mono text-2xl font-black">{v}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
      {sub && <div className="text-[10px] text-faint">{sub}</div>}
    </div>
  );
}
