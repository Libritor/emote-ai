# Emote AI — Superteam Earn submission materials

One codebase, three track submissions, all built on the Emote AI **integrity signal** — an
experimental, on-chain, transparent "suspicion" read of referees and players, fused with TxODDS
match events. Fill the bracketed links once the Vercel deploys + demo videos are up.

- **Repo:** https://github.com/Libritor/emote-ai
- **Live:** Markets `[url]` · Integrity Room `[url]` · Sentinel `[url]`
- **Analyzer (shared core):** `/analyze`

> **Honesty note (state it up front in every submission):** the detection is real
> (rPPG heart-rate/HRV, EAR fatigue, expression). The "integrity/guilt" score is an **experimental
> heuristic for entertainment — not a lie detector and not evidence of wrongdoing.** Face/physiological
> deception detection is not scientifically reliable; we surface it transparently and publish it
> on-chain precisely so it can be audited and challenged. The transparency is the product.

---

## Track 1 — Prediction Markets & Settlement → "Integrity Markets"

**Trade the integrity of the game.** On-chain markets on each World Cup match — the result, and
whether officiating gets **flagged** by the Emote AI integrity signal ("Clean match?", "Ref suspicion
over threshold?"). Positions are held by a Solana program; markets settle automatically from the
on-chain **integrity oracle** + TxODDS result, and `/verify` lets anyone recompute the evidence hash.
Differentiator: a *verifiable, transparent* integrity oracle vs. opaque "trust us" calls.

**Demo video (~3 min):** landing → `/analyze` reads a ref's live integrity meter → open Integrity
Markets → connect Phantom, get test tokens, stake on "Clean match?" → oracle settles → claim → open
`/verify` and recompute the sha256. Emphasize the honesty framing throughout.

## Track 2 — Consumer & Fan → "The Integrity Room"

**Fans become the watchdog.** Point Emote AI at a referee/player (webcam or an uploaded clip) and
read their live suspicion meter; play **Spot the Fix** — call suspicious moments and match results,
climb the leaderboard, and mint **Controversy Moments**. Every call is recorded on-chain. This is the
flagship of the detection tech and the top of the funnel.

**Demo video:** open the Integrity Room → point the Ref Cam at a face (or upload a clip), watch HR /
stress / expression / integrity move live → make Spot-the-Fix calls → show the leaderboard + an
on-chain pick. Lead and close with the disclaimer.

## Track 3 — Trading Tools & Agents → "Sentinel"

**An integrity-aware trading agent.** Sentinel fuses the integrity signal with TxODDS odds: it prices
every market, flags/hedges matches where officiating looks suspicious, and logs every decision
transparently (deterministic — an optional LLM only narrates). A **Tilt-Guard** reads the *trader's*
own biometrics and gates over-heated trading.

**Demo video:** open Sentinel → run the agent → watch it scan, flag a suspicious match, and book
hedges with a streaming reasoning log → show the Tilt-Guard reacting to trader stress.

---

## Pitch deck outline (per track)

1. Problem — match-fixing/officiating integrity is opaque and unverifiable.
2. Insight — read the tells on the faces of refs/players; make the signal transparent & on-chain.
3. Product — the track app (screens).
4. How it works — Emote AI reads the face → integrity signal + hash on-chain → app settles against it.
5. Solana usage — program (oracle + markets), PDAs, SPL, wallet, verifiable settlement.
6. Honesty & ethics — experimental heuristic, entertainment, auditable, never an accusation.
7. Impact / business — fan engagement, integrity data, market liquidity.
8. Roadmap — real TxODDS keys, mainnet, audited program, consented/broadcast video pipeline.
