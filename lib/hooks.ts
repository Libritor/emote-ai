"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FairProbabilities, Fixture, FixtureOdds, Odds1x2 } from "@/lib/txodds/types";

export interface BoardItem {
  fixture: Fixture;
  oneXtwo: Odds1x2 | null;
}

/** Fetch the whole board (fixtures + 1X2 prices) in one payload, polling. */
export function useBoard(pollMs = 15000) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/txodds/board", { cache: "no-store" });
      if (!res.ok) throw new Error(`board ${res.status}`);
      const data = await res.json();
      if (!mounted.current) return;
      setItems(data.items);
      setMode(data.mode);
    } catch {
      /* keep last good data */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const t = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [load, pollMs]);

  return { items, mode, loading, refresh: load };
}

export interface FixturesResult {
  fixtures: Fixture[];
  mode: "mock" | "live" | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Fetch fixtures from the server feed, polling so the live clock advances. */
export function useFixtures(pollMs = 15000): FixturesResult {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/txodds/fixtures", { cache: "no-store" });
      if (!res.ok) throw new Error(`feed ${res.status}`);
      const data = await res.json();
      if (!mounted.current) return;
      setFixtures(data.fixtures);
      setMode(data.mode);
      setError(null);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const t = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [load, pollMs]);

  return { fixtures, mode, loading, error, refresh: load };
}

export interface OddsResult {
  fixture: Fixture | null;
  odds: FixtureOdds | null;
  fair: FairProbabilities | null;
  loading: boolean;
}

export function useOdds(id: number | null, pollMs = 10000): OddsResult {
  const [state, setState] = useState<OddsResult>({
    fixture: null,
    odds: null,
    fair: null,
    loading: true,
  });

  useEffect(() => {
    if (id == null) return;
    let on = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/txodds/odds/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (on) setState({ fixture: data.fixture, odds: data.odds, fair: data.fair, loading: false });
      } catch {
        if (on) setState((s) => ({ ...s, loading: false }));
      }
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [id, pollMs]);

  return state;
}
