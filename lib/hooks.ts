"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFeedClock } from "@/lib/feedClock";
import type { FairProbabilities, Fixture, FixtureOdds, Odds1x2 } from "@/lib/txodds/types";

export interface BoardItem {
  fixture: Fixture;
  oneXtwo: Odds1x2 | null;
}

export interface BoardResult {
  items: BoardItem[];
  mode: "mock" | "live" | null;
  loading: boolean;
  error: string | null;
  asOf: number | null;
  clockMs: number | null;
  refresh: () => Promise<void>;
}

/** Fetch the whole board (fixtures + 1X2 prices) in one payload, polling. */
export function useBoard(pollMs = 15000): BoardResult {
  const { asOfMs, querySuffix, ready } = useFeedClock();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    const expectedSuffix = querySuffix;

    const load = async (showLoading: boolean): Promise<void> => {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch(`/api/txodds/board${expectedSuffix}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`board ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items);
        setMode(data.mode);
        setClockMs(data.asOf ?? Date.now());
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshRef.current = () => load(true);

    const start = setTimeout(() => {
      if (cancelled) return;
      // Drop previous clock's rows so the simulated badge never sits on live "now" data.
      setItems([]);
      setMode(null);
      setClockMs(asOfMs);
      void load(true);
    }, 0);

    // Historical asOf snapshots are static - only poll live "now".
    const interval = asOfMs === null ? setInterval(() => void load(false), pollMs) : undefined;

    return () => {
      cancelled = true;
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [asOfMs, pollMs, querySuffix, ready]);

  const refresh = useCallback(async () => {
    await refreshRef.current();
  }, []);

  return { items, mode, loading, error, asOf: asOfMs, clockMs, refresh };
}

export interface FixturesResult {
  fixtures: Fixture[];
  mode: "mock" | "live" | null;
  loading: boolean;
  error: string | null;
  asOf: number | null;
  clockMs: number | null;
  refresh: () => Promise<void>;
}

/** Fetch fixtures from the server feed, polling so the live clock advances. */
export function useFixtures(pollMs = 15000): FixturesResult {
  const { asOfMs, querySuffix, ready } = useFeedClock();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    const expectedSuffix = querySuffix;

    const load = async (showLoading: boolean): Promise<void> => {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch(`/api/txodds/fixtures${expectedSuffix}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`feed ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setFixtures(data.fixtures);
        setMode(data.mode);
        setClockMs(data.asOf ?? Date.now());
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshRef.current = () => load(true);

    const start = setTimeout(() => {
      if (cancelled) return;
      setFixtures([]);
      setMode(null);
      setClockMs(asOfMs);
      void load(true);
    }, 0);

    const interval = asOfMs === null ? setInterval(() => void load(false), pollMs) : undefined;

    return () => {
      cancelled = true;
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [asOfMs, pollMs, querySuffix, ready]);

  const refresh = useCallback(async () => {
    await refreshRef.current();
  }, []);

  return { fixtures, mode, loading, error, asOf: asOfMs, clockMs, refresh };
}

export interface OddsResult {
  fixture: Fixture | null;
  odds: FixtureOdds | null;
  fair: FairProbabilities | null;
  loading: boolean;
  error: string | null;
  asOf: number | null;
  clockMs: number | null;
}

export function useOdds(id: number | null, pollMs = 10000): OddsResult {
  const { asOfMs, querySuffix, ready } = useFeedClock();
  const [state, setState] = useState<OddsResult>({
    fixture: null,
    odds: null,
    fair: null,
    loading: true,
    error: null,
    asOf: null,
    clockMs: null,
  });

  useEffect(() => {
    if (id == null || !ready) return;

    let cancelled = false;
    const expectedSuffix = querySuffix;

    const load = async (showLoading: boolean): Promise<void> => {
      if (showLoading) setState((s) => ({ ...s, loading: true, asOf: asOfMs }));
      try {
        const res = await fetch(`/api/txodds/odds/${id}${expectedSuffix}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`market ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setState({
          fixture: data.fixture,
          odds: data.odds,
          fair: data.fair,
          loading: false,
          error: null,
          asOf: asOfMs,
          clockMs: data.asOf ?? Date.now(),
        });
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
        }
      }
    };

    const start = setTimeout(() => {
      if (!cancelled) void load(true);
    }, 0);
    const interval = asOfMs === null ? setInterval(() => void load(false), pollMs) : undefined;

    return () => {
      cancelled = true;
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [asOfMs, id, pollMs, querySuffix, ready]);

  return state;
}
