import Link from "next/link";
import { getTxOdds } from "@/lib/txodds";
import { attest } from "@/lib/oracle/attest";
import { SectionHeading, Flag } from "@/components/ui";
import SyncOracleButton from "@/components/SyncOracleButton";
import { PROGRAM_ID, SOLANA_CLUSTER, explorerAddr, isProgramConfigured } from "@/lib/solana/config";
import { shorten } from "@/lib/format";

export const metadata = { title: "PitchProof Verify — on-chain settlement proof" };
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
        desc="Every settled World Cup result is attested on-chain: the TxODDS outcome plus a sha256 data hash written into the PitchProof oracle program. Anyone can recompute the hash and confirm what the markets settled against — no trust required."
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
          return (
            <Link
              key={f.id}
              href={`/verify/${f.id}`}
              className="card flex items-center gap-4 p-3.5 transition hover:border-border-bright"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Flag code={f.home.code} flag={f.home.flag} />
                <span className="font-bold">{f.home.code}</span>
                <span className="mono font-black">{f.score?.home}–{f.score?.away}</span>
                <span className="font-bold">{f.away.code}</span>
                <Flag code={f.away.code} flag={f.away.flag} />
              </div>
              <span className="chip ml-2 hidden sm:inline-flex">
                {a.outcome === "1" ? "Home" : a.outcome === "2" ? "Away" : "Draw"}
              </span>
              <span className="mono ml-auto truncate text-xs text-faint" title={a.dataHash}>
                {shorten(a.dataHash, 8)}
              </span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${configured ? "bg-primary" : "bg-warn"}`} />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
