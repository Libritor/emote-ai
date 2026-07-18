"use client";

import { useId, useMemo, useState } from "react";
import { useOdds } from "@/lib/hooks";
import { useOnchain } from "@/lib/solana/useOnchain";
import {
  expectedValue,
  fairPct,
  formatOdds,
  formatSignedPct,
  impliedPct,
  outcomeShort,
} from "@/lib/format";
import { isProgramConfigured, STAKE_SYMBOL, explorerTx } from "@/lib/solana/config";

type Selection = { market: "1x2" | "ou25"; pick: string; label: string; odds: number; fair?: number };

export default function MarketDetail({ id, embedded = false }: { id: number; embedded?: boolean }) {
  const { fixture: f, odds, fair, loading, error } = useOdds(id);
  const { connected, placePosition, claim, getTestTokens } = useOnchain();
  const [sel, setSel] = useState<Selection | null>(null);
  const [stake, setStake] = useState(25);
  const [busy, setBusy] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const stakeInputId = useId();

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label); setErr(null); setTxSig(null);
    try {
      setTxSig(await fn());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const edge = useMemo(() => {
    if (!sel || sel.fair === undefined) return null;
    return expectedValue(sel.fair, sel.odds);
  }, [sel]);

  if (loading && !f) {
    return (
      <div className={`grid place-items-center text-muted ${embedded ? "py-10" : "card py-24"}`}>
        Loading market…
      </div>
    );
  }
  if (!f || !odds) {
    return (
      <div className={`grid place-items-center text-muted ${embedded ? "py-10" : "card py-24"}`}>
        {error ? "Unable to load this market." : "Market not found."}
      </div>
    );
  }

  const fairFor = (pick: string): number | undefined => {
    if (!fair) return undefined;
    if (pick === "1") return fair.home;
    if (pick === "X") return fair.draw;
    if (pick === "2") return fair.away;
    return undefined;
  };

  const select = (s: Selection) => setSel((cur) => (cur?.market === s.market && cur.pick === s.pick ? null : s));
  const stakeAmount = Math.max(1, Math.round(stake));
  const payout = sel ? stakeAmount * sel.odds : 0;
  const panel = embedded ? "card-2 p-4" : "card p-5";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {/* Match Result market */}
        <div className={panel}>
          <MarketTitle title="Match Result" sub="1X2 · settles from the on-chain oracle" />
          <div className="grid grid-cols-3 gap-2">
            {(["1", "X", "2"] as const).map((pick) => {
              const price = pick === "1" ? odds.oneXtwo.home : pick === "X" ? odds.oneXtwo.draw : odds.oneXtwo.away;
              const label = pick === "1" ? f.home.name : pick === "X" ? "Draw" : f.away.name;
              const active = sel?.market === "1x2" && sel.pick === pick;
              const won = f.status === "final" && f.outcome === pick;
              return (
                <button
                  key={pick}
                  disabled={f.status === "final"}
                  onClick={() => select({ market: "1x2", pick, label, odds: price, fair: fairFor(pick) })}
                  className="odds !flex-row !justify-between px-3 py-3 disabled:cursor-default"
                  data-active={active || won ? "true" : "false"}
                >
                  <span className="truncate text-sm font-semibold">{label}</span>
                  <span className="mono font-bold">{formatOdds(price)}</span>
                </button>
              );
            })}
          </div>
          {fair && (
            <div className="mt-2 text-xs text-faint">
              Fair model win probability - home {fairPct(fair.home)}%, draw {fairPct(fair.draw)}%, away {fairPct(fair.away)}%
            </div>
          )}
        </div>

        {/* Total goals market */}
        <div className={panel}>
          <MarketTitle title="Total Goals" sub="Over / Under 2.5" />
          <div className="grid grid-cols-2 gap-2">
            {(["over", "under"] as const).map((pick) => {
              const price = pick === "over" ? odds.ou25.over : odds.ou25.under;
              const label = pick === "over" ? "Over 2.5" : "Under 2.5";
              const active = sel?.market === "ou25" && sel.pick === pick;
              return (
                <button
                  key={pick}
                  disabled={f.status === "final"}
                  onClick={() => select({ market: "ou25", pick, label, odds: price })}
                  className="odds !flex-row !justify-between px-3 py-3 disabled:cursor-default"
                  data-active={active ? "true" : "false"}
                >
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="mono font-bold">{formatOdds(price)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bet slip */}
      <aside className={`h-fit space-y-4 ${embedded ? "" : "lg:sticky lg:top-20"}`}>
        <div className={panel}>
          <div className="mb-3 text-sm font-black uppercase tracking-wide text-primary">Bet slip</div>
          {!sel ? (
            <p className="py-8 text-center text-sm text-muted">Select a price to build a position.</p>
          ) : (
            <>
              <div className="card-2 mb-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{sel.label}</span>
                  <span className="mono font-bold text-primary">{formatOdds(sel.odds)}</span>
                </div>
                <div className="text-xs text-faint">
                  {sel.market === "1x2" ? outcomeShort(sel.pick as "1" | "X" | "2") : "Total goals"} - {f.home.code} v {f.away.code}
                </div>
              </div>

              <label htmlFor={stakeInputId} className="mb-1 block text-xs font-semibold text-muted">Stake ({STAKE_SYMBOL})</label>
              <div className="mb-3 flex items-center gap-2">
                <input
                  id={stakeInputId}
                  type="number"
                  min={1}
                  step={1}
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 mono font-bold outline-none focus:border-primary"
                />
                {[10, 25, 100].map((v) => (
                  <button key={v} onClick={() => setStake(v)} className="btn-ghost btn !px-2.5 !py-2 text-xs">
                    {v}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                <Row k="Potential payout" v={`${formatOdds(payout)} ${STAKE_SYMBOL}`} />
                <Row k="Implied prob" v={`${impliedPct(sel.odds)}%`} />
                {edge !== null && (
                  <Row
                    k="Model edge (EV)"
                    v={formatSignedPct(edge)}
                    accent={edge >= 0 ? "up" : "down"}
                  />
                )}
              </div>

              {!isProgramConfigured() ? (
                <button disabled className="btn btn-primary mt-4 w-full">Devnet program deploying…</button>
              ) : !connected ? (
                <div className="mt-4 rounded-lg border border-border-bright bg-surface-2 p-3 text-center text-sm text-muted">
                  Connect a wallet to place on-chain.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => run("faucet", () => getTestTokens().then((r) => (r as { signature: string }).signature))}
                    disabled={!!busy}
                    className="btn btn-ghost w-full text-sm"
                  >
                    {busy === "faucet" ? "Requesting…" : "Get 500 test dUSDC"}
                  </button>
                  {sel.market === "1x2" ? (
                    <button
                      onClick={() => run("place", () => placePosition(f.id, sel.pick as "1" | "X" | "2", stakeAmount))}
                      disabled={!!busy}
                      className="btn btn-primary w-full"
                    >
                      {busy === "place" ? "Placing…" : "Place position on-chain ->"}
                    </button>
                  ) : (
                    <div className="rounded-lg border border-border bg-surface-2 p-2 text-center text-xs text-muted">
                      On-chain settlement currently supports Match Result (1X2).
                    </div>
                  )}
                  {txSig && (
                    <a href={explorerTx(txSig)} target="_blank" rel="noreferrer" className="block text-center text-xs font-bold text-primary">
                      View transaction on Explorer ↗
                    </a>
                  )}
                  {err && <div className="break-words text-center text-xs text-down">{err}</div>}
                </div>
              )}
            </>
          )}
        </div>

        {isProgramConfigured() && connected && f.status === "final" && (
          <div className={embedded ? "card-2 p-4" : "card p-4"}>
            <div className="mb-1 text-sm font-bold">Match settled</div>
            <p className="mb-3 text-xs text-muted">
              The oracle has written the result on-chain. If you backed the winner, claim your
              pro-rata share of the pool.
            </p>
            <button onClick={() => run("claim", () => claim(f.id))} disabled={!!busy} className="btn btn-primary w-full">
              {busy === "claim" ? "Claiming…" : "Resolve & claim winnings →"}
            </button>
          </div>
        )}

        <div className={`text-xs text-muted ${embedded ? "card-2 p-4" : "card p-4"}`}>
          <div className="mb-1 font-bold text-ink">Trustless settlement</div>
          Positions are held by the Emote AI Solana program. When the match ends, the oracle
              writes the TxODDS result on-chain and the market resolves automatically - winners claim
          pro-rata from the pool. Every result is publicly verifiable.
        </div>
      </aside>
    </div>
  );
}

function MarketTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3">
      <div className="font-black">{title}</div>
      <div className="text-xs text-faint">{sub}</div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={`mono font-bold ${accent === "up" ? "text-up" : accent === "down" ? "text-down" : ""}`}>{v}</span>
    </div>
  );
}
