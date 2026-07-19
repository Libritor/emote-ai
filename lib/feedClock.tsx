"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "emote.feedAsOf";

interface FeedClockValue {
  ready: boolean;
  asOfIso: string | null;
  asOfMs: number | null;
  simulationLabel: string | null;
  querySuffix: string;
  simulate: (asOf: Date) => void;
  exitSimulation: () => void;
}

const FeedClockContext = createContext<FeedClockValue | null>(null);

function isoFromDate(date: Date): string | null {
  const ms = date.getTime();
  return Number.isFinite(ms) ? date.toISOString() : null;
}

function labelFor(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function readStoredAsOf(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && isoFromDate(new Date(stored)) ? stored : null;
  } catch {
    return null;
  }
}

export function FeedClockProvider({ children }: { children: React.ReactNode }) {
  const [asOfIso, setAsOfIso] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setAsOfIso(readStoredAsOf());
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const simulate = useCallback((asOf: Date) => {
    const iso = isoFromDate(asOf);
    if (!iso) return;
    setAsOfIso(iso);
    try {
      localStorage.setItem(STORAGE_KEY, iso);
    } catch {}
  }, []);

  const exitSimulation = useCallback(() => {
    setAsOfIso(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo<FeedClockValue>(() => {
    const asOfMs = asOfIso ? +new Date(asOfIso) : null;
    return {
      ready,
      asOfIso,
      asOfMs,
      simulationLabel: labelFor(asOfIso),
      querySuffix: asOfMs === null ? "" : `?asOf=${asOfMs}`,
      simulate,
      exitSimulation,
    };
  }, [asOfIso, exitSimulation, ready, simulate]);

  return <FeedClockContext.Provider value={value}>{children}</FeedClockContext.Provider>;
}

export function useFeedClock(): FeedClockValue {
  const value = useContext(FeedClockContext);
  if (!value) throw new Error("useFeedClock must be used inside FeedClockProvider");
  return value;
}
