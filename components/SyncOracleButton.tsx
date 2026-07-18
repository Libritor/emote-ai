"use client";

import { useState } from "react";
import { isProgramConfigured, explorerTx } from "@/lib/solana/config";

// Admin/demo affordance: pushes current match results on-chain via the relayer route.
export default function SyncOracleButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);

  if (!isProgramConfigured()) return null;

  const sync = async () => {
    setBusy(true); setMsg(null); setSig(null);
    try {
      const res = await fetch("/api/oracle/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "sync failed");
      setMsg(`Synced ${data.synced} matches on-chain`);
      if (data.matches?.[0]?.sig) setSig(data.matches[0].sig);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={sync} disabled={busy} className="btn btn-primary text-sm">
        {busy ? "Syncing…" : "Sync oracle → devnet"}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
      {sig && (
        <a href={explorerTx(sig)} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary">
          view tx ↗
        </a>
      )}
    </div>
  );
}
