import Link from "next/link";
import { notFound } from "next/navigation";
import { getTxOdds } from "@/lib/txodds";
import { attest } from "@/lib/oracle/attest";
import { Flag } from "@/components/ui";
import { PROGRAM_ID, SOLANA_CLUSTER, explorerAddr, isProgramConfigured } from "@/lib/solana/config";
import { kickoffLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VerifyMatchPage({ params }: PageProps<"/verify/[id]">) {
  const { id } = await params;
  const provider = getTxOdds();
  const f = await provider.getFixture(Number(id));
  if (!f) notFound();
  const a = attest(f);
  const configured = isProgramConfigured();

  const rows: [string, React.ReactNode][] = [
    ["Match ID", <span key="id" className="mono">{a.matchId}</span>],
    ["Fixture", `${f.home.name} v ${f.away.name}`],
    ["Kickoff", kickoffLabel(f.kickoff)],
    ["Status", f.status],
    ["Result", a.outcome === "1" ? `${f.home.name} win` : a.outcome === "2" ? `${f.away.name} win` : "Draw"],
    ["Score", <span key="s" className="mono">{a.score}</span>],
  ];

  return (
    <main className="mx-auto max-w-[820px] px-4 py-8 sm:px-6">
      <Link href="/verify" className="mb-4 inline-block text-sm text-muted hover:text-ink">
        ← All attestations
      </Link>

      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag code={f.home.code} flag={f.home.flag} size="text-3xl" />
            <span className="mono text-2xl font-black">{f.score?.home ?? "–"}–{f.score?.away ?? "–"}</span>
            <Flag code={f.away.code} flag={f.away.flag} size="text-3xl" />
          </div>
          <span className={`chip ${f.status === "final" ? "chip-final" : ""}`}>
            {f.status === "final" ? "Settled" : f.status}
          </span>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>

        {/* The proof */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Attestation</div>
          <div className="card-2 space-y-3 p-4">
            <Field label="Canonical record (pre-image)">
              <code className="mono block break-all text-xs text-muted">{a.canonical}</code>
            </Field>
            <Field label="Data hash — sha256, stored on-chain as [u8;32]">
              <code className="mono block break-all text-xs text-primary">{a.dataHash}</code>
            </Field>
          </div>
        </div>

        {/* On-chain */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 p-4 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${configured ? "bg-primary" : "bg-warn"}`} />
          {configured ? (
            <>
              <span>Committed by the oracle on {SOLANA_CLUSTER}.</span>
              <a href={explorerAddr(PROGRAM_ID)} target="_blank" rel="noreferrer" className="ml-auto font-bold text-primary">
                View program on Explorer ↗
              </a>
            </>
          ) : (
            <span className="text-muted">
              Attestation is computed and ready. On-chain commit goes live once the devnet relayer
              is deployed — the hash above is exactly what gets written to the oracle account.
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-faint">
          Verify it yourself: <code className="mono">sha256(canonical record)</code> equals the data
          hash above. That hash is stored in the on-chain match account the markets settle against.
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-faint">{label}</div>
      {children}
    </div>
  );
}
