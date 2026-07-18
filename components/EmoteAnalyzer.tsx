"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEmoteEngine } from "@/lib/emote/useEmoteEngine";
import IntegrityDisclaimer from "@/components/IntegrityDisclaimer";
import IntegrityTimeline from "@/components/IntegrityTimeline";
import { labelColor } from "@/lib/emote/integrity";
import { hashReading, type CapturedReading } from "@/lib/emote/reading";
import { EMPTY, asInt, asScore100, formatScore100, shorten } from "@/lib/format";

const HISTORY_LEN = 150; // ~50s at ~3 Hz

interface Attestation extends CapturedReading {
  label: string;
  hash: string;
}

const EMOTION_ORDER = ["neutral", "happy", "sad", "angry", "surprised", "fearful", "disgusted"] as const;

const roundOrNull = (n: number | null | undefined): number | null =>
  n == null || Number.isNaN(n) ? null : Math.round(n);

function displayVital(n: number | null | undefined): string | number {
  return roundOrNull(n) ?? EMPTY;
}

export default function EmoteAnalyzer({ subject = "subject" }: { subject?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { signals, running, error, startWebcam, startClip, stop } = useEmoteEngine();
  const [source, setSource] = useState<"none" | "webcam" | "clip">("none");

  const onWebcam = () => {
    if (videoRef.current) { resetDisplay(); setSource("webcam"); startWebcam(videoRef.current); }
  };
  const onClip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const v = videoRef.current;
    if (!file || !v) return;
    v.srcObject = null;
    v.src = URL.createObjectURL(file);
    v.loop = true;
    v.muted = true;
    resetDisplay();
    setSource("clip");
    startClip(v);
  };
  const [history, setHistory] = useState<number[]>([]);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [d, setD] = useState({
    bpm: null as number | null, rmssd: null as number | null, stress: null as number | null,
    fatigue: null as number | null, blinks: 0, suspicion: null as number | null,
    guilt: null as number | null, tells: null as number | null, masking: null as number | null,
    label: null as string | null, confidence: null as number | null,
    emotion: null as typeof signals.emotion,
  });
  const resetDisplay = () =>
    setD({ bpm: null, rmssd: null, stress: null, fatigue: null, blinks: 0, suspicion: null, guilt: null, tells: null, masking: null, label: null, confidence: null, emotion: null });

  const integ = signals.integrity;

  // Persist the last collected value for every metric (rounded) so the panels
  // keep showing a number instead of flickering blank when a signal drops.
  useEffect(() => {
    setD((p) => ({
      bpm: roundOrNull(signals.bpm) ?? p.bpm,
      rmssd: roundOrNull(signals.rmssd) ?? p.rmssd,
      stress: roundOrNull(signals.stress) ?? p.stress,
      fatigue: signals.facePresent ? (roundOrNull(signals.fatigueScore) ?? p.fatigue) : p.fatigue,
      blinks: Math.max(signals.blinks ?? 0, p.blinks),
      suspicion: roundOrNull(integ?.suspicion) ?? p.suspicion,
      guilt: roundOrNull(integ?.guilt) ?? p.guilt,
      tells: roundOrNull(integ?.tells) ?? p.tells,
      masking: roundOrNull(integ?.masking) ?? p.masking,
      label: integ?.label ?? p.label,
      confidence: roundOrNull(integ?.confidence) ?? p.confidence,
      emotion: signals.emotion ?? p.emotion,
    }));
  }, [signals, integ]);

  // Record the suspicion score into a rolling timeline while a face is tracked.
  useEffect(() => {
    if (!running || !signals.facePresent || !integ) return;
    setHistory((h) => [...h, integ.suspicion].slice(-HISTORY_LEN));
  }, [running, signals.facePresent, integ]);

  useEffect(() => {
    if (!running) setHistory([]);
  }, [running]);

  const capture = useCallback(async () => {
    if (!integ) return;
    const reading: CapturedReading = {
      subject,
      suspicion: integ.suspicion,
      guilt: integ.guilt,
      tells: integ.tells,
      masking: integ.masking,
      hr: asInt(signals.bpm) ?? null,
      ts: Date.now(),
    };
    const hash = await hashReading(reading);
    setAttestations((a) => [{ ...reading, label: integ.label, hash }, ...a].slice(0, 6));
  }, [integ, subject, signals.bpm]);

  const onStop = () => { setSource("none"); setHistory([]); stop(); };

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
            <Gauge value={d.suspicion ?? undefined} label={d.label ?? undefined} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini k="Guilt" v={d.guilt ?? undefined} />
            <Mini k="Tells" v={d.tells ?? undefined} />
            <Mini k="Masking" v={d.masking ?? undefined} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-muted">Signal confidence</span>
            <span className="mono font-bold">{formatScore100(d.confidence)}</span>
          </div>
          <button
            onClick={capture}
            disabled={!integ}
            className="btn btn-ghost mt-3 w-full text-sm disabled:opacity-40"
            title="Snapshot this reading into a verifiable, on-chain-ready attestation"
          >
            Capture reading → attest
          </button>
        </div>
      </div>

      {/* Live suspicion timeline */}
      <IntegrityTimeline data={history} />

      {/* Captured attestations */}
      {attestations.length > 0 && (
        <div className="card p-5">
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            Captured attestations
          </div>
          <div className="mb-3 text-xs text-faint">
            Each is a sha256 of the reading&rsquo;s canonical record — the exact bytes the oracle would
            publish on-chain, recomputable by anyone.
          </div>
          <div className="space-y-1.5">
            {attestations.map((a) => (
              <div key={a.ts} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                <span className="chip" style={{ color: labelColor(a.label as never), borderColor: "currentColor" }}>
                  {a.suspicion}
                </span>
                <span className="text-muted">{new Date(a.ts).toLocaleTimeString()}</span>
                <span className="mono ml-auto truncate text-faint" title={a.hash}>
                  {shorten(a.hash, 8)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vitals + emotion */}
      <div className="grid gap-4 md:grid-cols-4">
        <Vital k="Heart rate" v={displayVital(d.bpm)} unit="BPM" />
        <Vital k="HRV (RMSSD)" v={displayVital(d.rmssd)} unit="ms" sub="est." />
        <Vital k="Stress / arousal" v={formatScore100(d.stress)} unit="" />
        <Vital k="Fatigue" v={formatScore100(d.fatigue)} unit="" sub={`${d.blinks} blinks`} />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Expression read</div>
          {d.emotion && (
            <span className="chip capitalize">
              {d.emotion.dominant} - {Math.round(d.emotion.confidence * 100)}%
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {EMOTION_ORDER.map((e) => {
            const p = d.emotion?.probabilities?.[e] ?? 0;
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
