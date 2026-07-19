// TxODDS provider selection. Server-side only (reads server env).
//
// TXODDS_MODE=live  -> real TxODDS feed (LiveTxOddsProvider)
// otherwise         -> deterministic mock feed (MockTxOddsProvider)
//
// The rest of the app talks to the provider through /api/txodds route handlers,
// so the browser never sees keys and never learns which feed is active.

import { LiveTxOddsProvider } from "./live";
import { MockTxOddsProvider } from "./mock";
import type { TxOddsProvider } from "./types";

let singleton: TxOddsProvider | null = null;

export function getTxOdds(): TxOddsProvider {
  if (singleton) return singleton;
  singleton = process.env.TXODDS_MODE === "live"
    ? new LiveTxOddsProvider()
    : new MockTxOddsProvider();
  return singleton;
}

export function getTxOddsAt(asOfMs: number): TxOddsProvider {
  return process.env.TXODDS_MODE === "live"
    ? new LiveTxOddsProvider(() => asOfMs)
    : new MockTxOddsProvider(() => asOfMs);
}

export function getMockTxOddsAt(asOfMs: number): TxOddsProvider {
  return new MockTxOddsProvider(() => asOfMs);
}

export * from "./types";
export { trueResult } from "./mock";
export { TEAMS, GROUPS, teamByCode } from "./tournament";
