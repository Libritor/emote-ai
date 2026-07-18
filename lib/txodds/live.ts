// Live TxODDS provider — the drop-in replacement for the mock once API
// credentials arrive. It implements the identical TxOddsProvider contract.
//
// Wiring notes for when keys land (request access via the hackathon Telegram):
//   - Set TXODDS_MODE=live, TXODDS_BASE_URL and TXODDS_API_KEY (server-side env).
//   - Map the TxODDS fixture/odds payloads onto our types in the `map*` helpers
//     below. The shape is intentionally isolated here so nothing else changes.

import type {
  FairProbabilities,
  Fixture,
  FixtureOdds,
  TxOddsProvider,
} from "./types";

function requireConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.TXODDS_BASE_URL;
  const apiKey = process.env.TXODDS_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "TXODDS_MODE=live but TXODDS_BASE_URL / TXODDS_API_KEY are not set. " +
        "Fall back to TXODDS_MODE=mock or provide credentials.",
    );
  }
  return { baseUrl, apiKey };
}

export class LiveTxOddsProvider implements TxOddsProvider {
  readonly mode = "live" as const;

  private async call<T>(path: string): Promise<T> {
    const { baseUrl, apiKey } = requireConfig();
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // TxODDS is a live feed — never cache.
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`TxODDS ${path} -> ${res.status}`);
    return (await res.json()) as T;
  }

  async getFixtures(): Promise<Fixture[]> {
    // TODO(map): const raw = await this.call<TxFixture[]>("/v1/worldcup/fixtures");
    //            return raw.map(mapFixture);
    throw new Error("LiveTxOddsProvider.getFixtures not yet mapped — awaiting TxODDS schema/keys.");
  }

  async getFixture(_id: number): Promise<Fixture | null> {
    throw new Error("LiveTxOddsProvider.getFixture not yet mapped — awaiting TxODDS schema/keys.");
  }

  async getOdds(_id: number): Promise<FixtureOdds | null> {
    throw new Error("LiveTxOddsProvider.getOdds not yet mapped — awaiting TxODDS schema/keys.");
  }

  async getFairProbabilities(_id: number): Promise<FairProbabilities | null> {
    throw new Error("LiveTxOddsProvider.getFairProbabilities not yet mapped — awaiting TxODDS schema/keys.");
  }
}
