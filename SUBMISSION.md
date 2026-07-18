# Emote AI — Integrity Markets (Prediction Markets & Settlement)

**Trade the integrity of the game — settled by an on-chain, verifiable integrity signal.**

> Hackathon submission branch. Architecture is in [`README.md`](./README.md); the shared detection
> core lives at `/analyze`; full track copy in [`docs/SUBMISSIONS.md`](./docs/SUBMISSIONS.md).

On-chain markets on each World Cup match — the result, and whether officiating gets **flagged** by
the Emote AI integrity signal ("Clean match?", "Ref suspicion over threshold?"). Positions are held
by a Solana program; markets settle automatically from the on-chain integrity oracle + the TxODDS
result. `/verify` lets anyone recompute the sha256 evidence hash — a transparent integrity oracle,
not an opaque "trust us" call.

**Try it:** `[Vercel URL]` → connect Phantom (devnet) → get test tokens → stake → oracle settles →
claim. Open **Verify** to recompute any reading's hash.

- Markets UI: [`components/MarketDetail.tsx`](./components/MarketDetail.tsx)
- Detection core: [`lib/emote/`](./lib/emote) · Integrity signal: [`lib/emote/integrity.ts`](./lib/emote/integrity.ts)
- On-chain program: [`programs/pitchproof/src/lib.rs`](./programs/pitchproof/src/lib.rs)

⚠ The integrity score is an **experimental heuristic for entertainment** — not a lie detector, not
evidence of wrongdoing. Devnet only.
