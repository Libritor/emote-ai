"use client";

// useEmoteEngine — owns the per-frame loop that drives the tested Emote AI
// engines (rPPG, fatigue, emotion, stress) from a <video> (webcam OR an
// uploaded clip) and exposes the signals + the composite Integrity reading as
// React state. Adapted from the multi-file app's main.js controller.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFaceLandmarker,
  landmarkBox,
  faceBounds,
  averageEAR,
  FOREHEAD,
  LEFT_CHEEK,
  RIGHT_CHEEK,
  type Rect,
} from "./face";
import { RppgEngine } from "./rppg.js";
import { FatigueDetector } from "./fatigue.js";
import { classifyEmotion } from "./emotion.js";
import { StressEstimator } from "./stress.js";
import { computeIntegrity, type EmotionProbs, type IntegrityReading } from "./integrity";
import { asInt, asScore100 } from "@/lib/format";

export interface EmoteSignals {
  facePresent: boolean;
  /** Heart rate in BPM, nearest integer when available. */
  bpm: number | null;
  /** RMSSD in ms, nearest integer when available. */
  rmssd: number | null;
  sdnn: number | null;
  /** Signal quality 0–100. */
  quality: number;
  progress: number;
  ear: number;
  blinks: number;
  /** Fatigue 0–100. */
  fatigueScore: number;
  emotion: { dominant: string; confidence: number; probabilities: EmotionProbs } | null;
  /** Stress / arousal 0–100. */
  stress: number | null;
  integrity: IntegrityReading | null;
  waveform: number[];
  status: string;
}

const INITIAL: EmoteSignals = {
  facePresent: false, bpm: null, rmssd: null, sdnn: null, quality: 0, progress: 0,
  ear: 0, blinks: 0, fatigueScore: 0, emotion: null, stress: null, integrity: null,
  waveform: [], status: "Idle",
};

export function useEmoteEngine() {
  const [signals, setSignals] = useState<EmoteSignals>(INITIAL);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = useRef({
    rppg: new RppgEngine({ windowSec: 12, minSec: 6 }),
    fatigue: new FatigueDetector({ earThreshold: 0.21 }),
    stress: new StressEstimator({ calibrationSec: 20 }),
    landmarker: null as any,
    video: null as HTMLVideoElement | null,
    sampler: null as HTMLCanvasElement | null,
    sctx: null as CanvasRenderingContext2D | null,
    raf: 0,
    lastTs: 0,
    lastAnalysis: 0,
    lastRoi: null as Rect | null,
    lastSampleT: 0,
    stream: null as MediaStream | null,
  });
  const loopRef = useRef<FrameRequestCallback | null>(null);

  const meanColorInRect = useCallback((rect: Rect) => {
    const { sampler, sctx } = s.current;
    if (!sampler || !sctx) return null;
    const sw = sampler.width, sh = sampler.height;
    const x0 = Math.max(0, Math.floor(rect.x * sw));
    const y0 = Math.max(0, Math.floor(rect.y * sh));
    const w = Math.min(sw - x0, Math.ceil(rect.w * sw));
    const h = Math.min(sh - y0, Math.ceil(rect.h * sh));
    if (w <= 0 || h <= 0) return null;
    const data = sctx.getImageData(x0, y0, w, h).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const R = data[i], G = data[i + 1], B = data[i + 2];
      if (R + G + B < 60 || Math.min(R, G, B) > 245) continue;
      r += R; g += G; b += B; n++;
    }
    if (n < 8) return null;
    return { r: r / n, g: g / n, b: b / n };
  }, []);

  const loop = useCallback(() => {
    const st = s.current;
    const video = st.video;
    if (!video) return;
    if (loopRef.current) st.raf = requestAnimationFrame(loopRef.current);
    if (video.readyState < 2 || !video.videoWidth) return;

    const targetW = 256;
    const scale = targetW / video.videoWidth;
    const sw = targetW, sh = Math.round(video.videoHeight * scale);
    const sampler = st.sampler!;
    if (sampler.width !== sw || sampler.height !== sh) { sampler.width = sw; sampler.height = sh; }
    st.sctx!.drawImage(video, 0, 0, sw, sh);

    const nowMs = performance.now();
    const t = nowMs / 1000;

    let facePresent = false;
    let emotion = null as EmoteSignals["emotion"];
    let ear = 0;

    if (st.landmarker) {
      let ts = nowMs;
      if (ts <= st.lastTs) ts = st.lastTs + 1;
      st.lastTs = ts;
      let result: any = null;
      try { result = st.landmarker.detectForVideo(video, ts); } catch { result = null; }
      if (result?.faceLandmarks?.length) {
        facePresent = true;
        let primary = result.faceLandmarks[0], bestArea = 0, bestIdx = 0;
        for (let i = 0; i < result.faceLandmarks.length; i++) {
          const b = faceBounds(result.faceLandmarks[i]);
          const area = b.w * b.h;
          if (area > bestArea) { bestArea = area; primary = result.faceLandmarks[i]; bestIdx = i; }
        }
        // rPPG ROI colour (forehead + cheeks, forehead weighted).
        const fore = landmarkBox(primary, FOREHEAD, 0.15);
        const parts = [
          { c: meanColorInRect(fore), w: 0.5 },
          { c: meanColorInRect(landmarkBox(primary, LEFT_CHEEK, 0.18)), w: 0.25 },
          { c: meanColorInRect(landmarkBox(primary, RIGHT_CHEEK, 0.18)), w: 0.25 },
        ].filter((p) => p.c) as { c: { r: number; g: number; b: number }; w: number }[];
        if (parts.length) {
          let r = 0, g = 0, b = 0, wsum = 0;
          for (const p of parts) { r += p.c.r * p.w; g += p.c.g * p.w; b += p.c.b * p.w; wsum += p.w; }
          st.rppg.push(t, r / wsum, g / wsum, b / wsum);
          st.lastRoi = fore; st.lastSampleT = t;
        }
        ear = averageEAR(primary);
        const cats = result.faceBlendshapes?.[bestIdx]?.categories;
        emotion = cats ? (classifyEmotion(cats) as unknown as EmoteSignals["emotion"]) : null;
      }
    }

    // Throttled heavy analysis (~3 Hz).
    if (nowMs - st.lastAnalysis > 333) {
      st.lastAnalysis = nowMs;
      const progress = st.rppg.progress() * 100;
      const stale = st.lastSampleT && t - st.lastSampleT > 2.0;
      const res = !stale ? st.rppg.compute() : null;
      if (!facePresent) st.fatigue.clearTransient();
      const fat = (facePresent
        ? st.fatigue.update(ear)
        : { ear: 0, score: 0, blinks: st.fatigue.blinks ?? 0, status: "OK" }) as {
        ear: number; score: number; blinks: number; status: string;
      };

      let stressIdx: number | null = null;
      let quality = 0, bpm: number | null = null, rmssd: number | null = null, sdnn: number | null = null, wave: number[] = [];
      let status = progress < 100 ? "Collecting" : "Analyzing";
      if (res) {
        quality = asScore100(res.quality);
        bpm = asInt(res.bpm);
        wave = res.waveform ? Array.from(res.waveform as ArrayLike<number>) : [];
        rmssd = asInt(res.hrv?.rmssd ?? null);
        sdnn = asInt(res.hrv?.sdnn ?? null);
        status = quality > 55 ? "Live" : quality > 25 ? "Analyzing" : "Low signal";
        const st2 = st.stress.update(t, res.bpm, rmssd, quality);
        stressIdx = st2.calibrating ? null : asScore100(st2.index);
      } else if (stale) {
        status = "No signal";
      }

      const integrity = computeIntegrity({
        emotion: emotion?.probabilities ?? null,
        stress: stressIdx,
        quality,
      });

      setSignals({
        facePresent,
        bpm,
        rmssd,
        sdnn,
        quality,
        progress: asScore100(progress),
        ear: fat.ear,
        blinks: fat.blinks,
        fatigueScore: asScore100(fat.score),
        emotion,
        stress: stressIdx,
        integrity,
        waveform: wave,
        status,
      });
    }
  }, [meanColorInRect]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const begin = useCallback(async (video: HTMLVideoElement) => {
    const st = s.current;
    st.video = video;
    if (!st.sampler) {
      st.sampler = document.createElement("canvas");
      st.sctx = st.sampler.getContext("2d", { willReadFrequently: true });
    }
    if (!st.landmarker) {
      try { st.landmarker = await createFaceLandmarker(1); }
      catch (e) { setError("Face model failed to load (needs internet). " + (e as Error).message); }
    }
    setRunning(true);
    if (loopRef.current) st.raf = requestAnimationFrame(loopRef.current);
  }, []);

  const startWebcam = useCallback(async (video: HTMLVideoElement) => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      s.current.stream = stream;
      video.srcObject = stream;
      await video.play().catch(() => {});
      await begin(video);
    } catch (e) {
      setError("Camera access denied or unavailable: " + (e as Error).message);
    }
  }, [begin]);

  const startClip = useCallback(async (video: HTMLVideoElement) => {
    setError(null);
    await video.play().catch(() => {});
    await begin(video);
  }, [begin]);

  const stop = useCallback(() => {
    const st = s.current;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    if (st.stream) { st.stream.getTracks().forEach((t) => t.stop()); st.stream = null; }
    if (st.video) st.video.srcObject = null;
    st.rppg.reset(); st.fatigue.reset(); st.stress.reset();
    st.lastSampleT = 0; st.lastAnalysis = 0;
    setRunning(false);
    setSignals(INITIAL);
  }, []);

  return { signals, running, error, startWebcam, startClip, stop };
}
