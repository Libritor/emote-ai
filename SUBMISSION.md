# Emote AI — The Integrity Room (Consumer & Fan Experiences)

**Fans become the watchdog of the beautiful game.**

> Hackathon submission branch. Architecture is in [`README.md`](./README.md); full track copy in
> [`docs/SUBMISSIONS.md`](./docs/SUBMISSIONS.md).

Point Emote AI at a referee or player — live via webcam or an uploaded match clip — and read their
**live integrity meter** (heart rate, stress, expression → a suspicion score). Then play **Spot the
Fix**: call the suspicious moments and match results, climb the leaderboard, keep your streak, and
mint collectible **Controversy Moments**. Every call is recorded on-chain. This is the flagship of
the detection tech and the top of the funnel into the whole Emote AI ecosystem.

**Try it:** `[Vercel URL]` → opens **The Integrity Room** → aim the Ref Cam at a face (or upload a
clip) and watch the signals move → make Spot-the-Fix calls → connect a wallet to save them on-chain.

- The Room + Ref Cam: [`app/matchday/page.tsx`](./app/matchday/page.tsx) · [`components/EmoteAnalyzer.tsx`](./components/EmoteAnalyzer.tsx)
- Detection core: [`lib/emote/`](./lib/emote) · Integrity signal: [`lib/emote/integrity.ts`](./lib/emote/integrity.ts)

⚠ The integrity score is an **experimental heuristic for entertainment** — not a lie detector, not
evidence of wrongdoing. Use consented/fictional video. Devnet only.
