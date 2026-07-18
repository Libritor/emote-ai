import { getTxOdds } from "@/lib/txodds";
import { attest } from "@/lib/oracle/attest";
import { SectionHeading, Flag } from "@/components/ui";
import SyncOracleButton from "@/components/SyncOracleButton";
import { PROGRAM_ID, SOLANA_CLUSTER, explorerAddr, isProgramConfigured } from "@/lib/solana/config";
import { EMPTY, formatScoreline, kickoffLabel, shorten } from "@/lib/format";
import type { Fixture } from "@/lib/txodds/types";

export const metadata = { title: "Emote AI Verify - on-chain settlement proof" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const provider = getTxOdds();
  const fixtures = await provider.getFixtures();
  const settled = fixtures
    .filter((f) => f.status === "final")
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
    .slice(0, 24);
  const configured = isProgramConfigured();

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
      <SectionHeading
        eyebrow="Oracle Tooling"
        title="Verify"
        desc="Every settled result gets a sha256 evidence hash written into the oracle program. Anyone can recompute the match metadata hash and confirm exactly what the markets settled against - no trust required."
      />

      {/* Oracle status */}
      <div className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-faint">Oracle program</div>
          <a href={explorerAddr(PROGRAM_ID)} target="_blank" rel="noreferrer" className="mono text-sm font-bold hover:text-primary">
            {shorten(PROGRAM_ID, 6)} ↗
          </a>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-faint">Network</div>
          <div className="text-sm font-bold capitalize">{SOLANA_CLUSTER}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-faint">Relayer</div>
          <div className={`text-sm font-bold ${configured ? "text-primary" : "text-warn"}`}>
            {configured ? "● Live" : "○ Deploying to devnet"}
          </div>
        </div>
      </div>

      {configured && (
        <div className="mb-6">
          <SyncOracleButton />
        </div>
      )}

      <div className="space-y-2">
        {settled.map((f) => {
          const a = attest(f);
          const rows: [string, React.ReactNode][] = [
            ["Match ID", <span key="id" className="mono">{a.matchId}</span>],
            ["Fixture", `${f.home.name} v ${f.away.name}`],
            ["Kickoff", kickoffLabel(f.kickoff)],
            ["Status", f.status === "final" ? "Settled" : f.status],
            ["Result", resultLabel(a.outcome, f)],
            ["Score", <span key="score" className="mono">{a.score}</span>],
          ];

          return (
            <details
              key={f.id}
              className="card group overflow-hidden transition hover:border-border-bright"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 p-3.5 marker:hidden [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <Flag code={f.home.code} flag={f.home.flag} />
                  <span className="font-bold">{f.home.code}</span>
                  <span className="mono font-black">{formatScoreline(f.score?.home, f.score?.away)}</span>
                  <span className="font-bold">{f.away.code}</span>
                  <Flag code={f.away.code} flag={f.away.flag} />
                </div>
                <span className="chip ml-2 hidden sm:inline-flex">
                  {a.outcome === "1" ? "Home" : a.outcome === "2" ? "Away" : a.outcome === "X" ? "Draw" : "Unset"}
                </span>
                <span className="mono ml-auto truncate text-xs text-faint" title={a.dataHash}>
                  {shorten(a.dataHash, 8)}
                </span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${configured ? "bg-primary" : "bg-warn"}`} />
                <span className="text-xs font-bold text-primary transition group-open:rotate-90">-&gt;</span>
              </summary>

              <div className="border-t border-border p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                        <span className="text-muted">{k}</span>
                        <span className="text-right font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="card-2 space-y-3 p-4">
                    <Field label="Canonical record (pre-image)">
                      <code className="mono block break-all text-xs text-muted">{a.canonical}</code>
                    </Field>
                    <Field label="Data hash - sha256, stored on-chain as [u8;32]">
                      <code className="mono block break-all text-xs text-primary">{a.dataHash}</code>
                    </Field>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 p-4 text-sm">
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
                      is deployed - the hash above is exactly what gets written to the oracle account.
                    </span>
                  )}
                </div>
              </div>
            </details>
          );
        })}
        {settled.length === 0 && (
          <div className="card grid place-items-center py-20 text-muted">
            No settled matches are available to verify yet.
          </div>
        )}
      </div>
    </main>
  );
}

function resultLabel(outcome: "1" | "X" | "2" | "?", fixture: Fixture): string {
  if (outcome === "1") return `${fixture.home.name} win`;
  if (outcome === "2") return `${fixture.away.name} win`;
  if (outcome === "X") return "Draw";
  return EMPTY;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-faint">{label}</div>
      {children}
    </div>
  );
}
