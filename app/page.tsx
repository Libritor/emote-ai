import Link from "next/link";
import LiveTicker from "@/components/LiveTicker";

const TRACKS = [
  {
    href: "/markets",
    tag: "Prediction Markets & Settlement",
    title: "Markets",
    desc: "On-chain markets on match integrity — 'Clean match?', 'Will officiating be flagged?' — settled from the verifiable integrity oracle plus the TxODDS result.",
    accent: "from-primary/20",
  },
  {
    href: "/matchday",
    tag: "Consumer & Fan Experiences",
    title: "The Integrity Room",
    desc: "Fans become the watchdog: a live ref & player suspicion meter synced to match events, a 'Spot the Fix' game with on-chain calls, and collectible Controversy Moments.",
    accent: "from-accent/20",
  },
  {
    href: "/terminal",
    tag: "Trading Tools & Agents",
    title: "Sentinel",
    desc: "An autonomous agent that fuses the integrity signal with TxODDS odds — flagging and hedging suspicious matches — plus a Tilt-Guard that reads your own biometrics.",
    accent: "from-accent/20",
  },
];

const FLOW = [
  { n: "01", t: "Emote AI reads the face", d: "Webcam or match clip → heart rate (rPPG), stress, fatigue, expression." },
  { n: "02", t: "Integrity signal, on-chain", d: "A composite 'suspicion' score + evidence hash is written to a Solana account." },
  { n: "03", t: "Markets · Room · Sentinel", d: "Every product settles against one transparent, auditable source of truth." },
];

const TRACK_BANNER: Record<string, { href: string; label: string; name: string }> = {
  markets: { href: "/markets", label: "Prediction Markets & Settlement", name: "Integrity Markets" },
  matchday: { href: "/matchday", label: "Consumer & Fan Experiences", name: "the Integrity Room" },
  terminal: { href: "/terminal", label: "Trading Tools & Agents", name: "Sentinel" },
};

export default function Home() {
  const track = TRACK_BANNER[process.env.NEXT_PUBLIC_TRACK ?? ""];
  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6">
      {track && (
        <Link
          href={track.href}
          className="mt-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm transition hover:bg-primary/15"
        >
          <span className="chip chip-live">Track</span>
          <span className="font-semibold">
            You&rsquo;re viewing the <b>{track.label}</b> submission — open {track.name}
          </span>
          <span className="ml-auto font-bold text-primary">→</span>
        </Link>
      )}

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
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                from the faces of the game.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Emote AI points webcam-grade emotion &amp; biometrics at referees and players, distils an
              experimental <b className="text-ink">integrity signal</b>, and publishes it on-chain —
              powering integrity markets, a fan watchdog room, and a trading sentinel on Solana.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/analyze" className="btn btn-primary">Try the analyzer →</Link>
              <Link href="/verify" className="btn btn-ghost">See the on-chain proof</Link>
            </div>
            <p className="mt-4 max-w-xl text-xs text-warn">
              ⚠ Experimental heuristic for entertainment — not a lie detector, not evidence of
              wrongdoing. The transparency &amp; on-chain auditability is the point.
            </p>
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
          Each hackathon track is a real app sharing the same on-chain integrity signal + design system.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {TRACKS.map((t) => (
            <Link key={t.href} href={t.href} className="card group relative overflow-hidden p-6 transition hover:border-border-bright">
              <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${t.accent} to-transparent blur-2xl`} />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{t.tag}</div>
                <div className="mt-1 text-2xl font-black">{t.title}</div>
                <p className="mt-3 text-sm text-muted">{t.desc}</p>
                <div className="mt-5 text-sm font-bold text-primary opacity-0 transition group-hover:opacity-100">Open →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why it wins */}
      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["rPPG", "real heart-rate & HRV from a webcam"],
          ["1", "shared Solana program — integrity oracle + markets"],
          ["0", "trust required: every reading is verifiable"],
          ["104", "World Cup matches to watch over"],
        ].map(([k, v]) => (
          <div key={v} className="card p-5">
            <div className="text-3xl font-black text-primary">{k}</div>
            <div className="mt-1 text-sm text-muted">{v}</div>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-sm text-faint">
        Emote AI · Built for the TxODDS × Solana World Cup Hackathon · Detection is real (rPPG/HRV/EAR/
        expression); the &ldquo;integrity&rdquo; score is an experimental heuristic for entertainment,
        published on-chain for transparency · Devnet only.
      </footer>
    </main>
  );
}
