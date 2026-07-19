import { getMockTxOddsAt, getTxOdds, getTxOddsAt } from "./index";
import type { TxOddsProvider } from "./types";

export interface RequestProvider {
  provider: TxOddsProvider;
  asOf: number | null;
}

export function parseAsOf(searchParams: URLSearchParams): number | null {
  const value = searchParams.get("asOf");
  if (!value) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  const asOfMs = parsed < 1e12 ? parsed * 1000 : parsed;
  return Number.isFinite(asOfMs) && asOfMs > 0 ? asOfMs : null;
}

export function providerForRequest(asOf: number | null): RequestProvider {
  return {
    provider: asOf === null ? getTxOdds() : getTxOddsAt(asOf),
    asOf,
  };
}

export async function withLiveFallback<T>(
  asOf: number | null,
  provider: TxOddsProvider,
  load: (provider: TxOddsProvider) => Promise<T>,
  isEmpty: (value: T) => boolean = () => false,
): Promise<{ provider: TxOddsProvider; value: T }> {
  try {
    const value = await load(provider);
    if (asOf !== null && provider.mode === "live" && isEmpty(value)) {
      const fallback = getMockTxOddsAt(asOf);
      return { provider: fallback, value: await load(fallback) };
    }
    return { provider, value };
  } catch (error) {
    if (asOf === null || provider.mode !== "live") throw error;
    const fallback = getMockTxOddsAt(asOf);
    return { provider: fallback, value: await load(fallback) };
  }
}
