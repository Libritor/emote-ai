import Link from "next/link";
import IntegrityDisclaimer from "@/components/IntegrityDisclaimer";
import LiveTicker from "@/components/LiveTicker";

const TRACKS = [
  {
    href: "/markets",
    tag: "Prediction Markets & Settlement",
    title: "Markets",
    desc: "On-chain match-result markets using TxODDS prices and a verifiable result oracle. Integrity readings are shown as an experimental context signal.",
  },
  {
    href: "/matchday",
    tag: "Consumer & Fan Experiences",
    title: "The Integrity Room",
    desc: "Fans compare a live ref and player meter with match events, make demo picks, and collect demo Moment cards for correct calls.",
  },
  {
    href: "/terminal",
    tag: "Trading Tools & Agents",
    title: "Sentinel",
    desc: "An autonomous agent scans TxODDS prices, ranks positive expected-value edges, and books simulated positions to an inspectable blotter.",
  },
];

const FLOW = [
  { n: "01", t: "Emote AI reads the face", d: "Webcam or match clip → heart rate (rPPG), stress, fatigue, expression." },
  { n: "02", t: "Signal with context", d: "A composite suspicion score is shown beside the match feed as an experimental context layer." },
  { n: "03", t: "Markets · Room · Sentinel", d: "Each surface shares the same match feed, pricing model, and public result hash." },
];

export default function Home() {
  return (
    <main className="px-4 pb-20 sm:px-6">
      {/* Hero */}
      <section className="pt-12 sm:pt-16">
        <div className="mb-6">
          <LiveTicker />
        </div>
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="chip mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Emote AI · TxODDS × Solana · World Cup 2026
            </span>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Read the game&rsquo;s integrity,
              <br />
              <span className="hero-gradient">from the faces of the game.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Emote AI points webcam-grade emotion &amp; biometrics at referees and players, distils an
              experimental <b className="text-ink">integrity signal</b>, and pairs it with verifiable
              match-result hashes for markets, fan picks, and the Sentinel agent.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/analyze" className="btn btn-primary">Try the analyzer -&gt;</Link>
              <Link href="/verify" className="btn btn-ghost">See the on-chain proof</Link>
            </div>
            <div className="mt-4 max-w-xl">
              <IntegrityDisclaimer />
            </div>
          </div>

          {/* Flow */}
          <div className="card p-6">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-primary">How it works</div>
            <div className="space-y-3">
              {FLOW.map((s, i) => (
                <div key={s.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="mono grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-bright text-sm font-bold text-primary">
                      {s.n}
                    </span>
                    {i < FLOW.length - 1 && <span className="my-1 h-8 w-px bg-border" />}
                  </div>
                  <div className="pb-1">
                    <div className="font-bold">{s.t}</div>
                    <div className="text-sm text-muted">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tracks */}
      <section className="mt-16">
        <h2 className="mb-1 text-2xl font-black tracking-tight">One signal. Three products.</h2>
        <p className="mb-6 text-sm text-muted">
          Each surface shares the same feed, design system, and experimental integrity context.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {TRACKS.map((t) => (
            <Link key={t.href} href={t.href} className="card group p-6 transition hover:border-border-bright">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{t.tag}</div>
              <div className="mt-1 text-2xl font-black">{t.title}</div>
              <p className="mt-3 text-sm text-muted">{t.desc}</p>
              <div className="mt-5 text-sm font-bold text-primary opacity-0 transition group-hover:opacity-100">Open -&gt;</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why it wins */}
      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["rPPG", "real heart-rate & HRV from a webcam"],
          ["1", "shared Solana program for oracle result settlement"],
          ["0", "trust required: every reading is verifiable"],
          ["104", "World Cup matches to watch over"],
        ].map(([k, v]) => (
          <div key={v} className="card p-5">
            <div className="text-3xl font-black text-primary">{k}</div>
            <div className="mt-1 text-sm text-muted">{v}</div>
          </div>
        ))}
      </section>

      <p className="mt-16 text-sm text-faint">
        Detection is real (rPPG/HRV/EAR/expression); the integrity score is an
        experimental heuristic for entertainment, shown separately from the on-chain result hash.{" "}
        <Link href="/wiki" className="text-muted hover:text-primary">
          Methods &amp; research →
        </Link>
      </p>
    </main>
  );
}
