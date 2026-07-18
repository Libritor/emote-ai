# PitchProof — Superteam Earn submission materials

One shared codebase, three track submissions. Live demo + repo + a ~3-min video per track.
Fill the bracketed links once the Vercel deploys and the demo video are up.

- **Repo:** https://github.com/Libritor/pitchproof
- **Live:** Markets `[url]` · MatchDay `[url]` · Terminal `[url]`
- **Devnet program:** `3P82MFkFfDERe5ReK6wVWPbXqjPBTFLGwyq6qexacLL6`

---

## Track 1 — Prediction Markets & Settlement

### Submission copy (paste into Superteam Earn)

**PitchProof Markets — trustless World Cup markets settled by an on-chain TxODDS oracle.**

Every World Cup match becomes an on-chain pari-mutuel market (1X2 + Over/Under). Users stake a
devnet SPL token on an outcome; funds are held by a Solana program in a PDA vault. When a match
ends, an oracle relayer writes the TxODDS result — plus a sha256 `data_hash` of the canonical
record — into the match account, and the market resolves **automatically**. Winners claim their
pro-rata share of the pool. No bookmaker, no manual resolution, no disputes.

What makes it different from existing sports markets (e.g. Chainlink-settled books): the oracle is
**TxODDS' own feed**, and every settlement is **independently verifiable** — our `/verify` explorer
lets anyone recompute the hash and confirm exactly what the market settled against.

- **On Solana:** one Anchor program (oracle + markets), PDA vaults, SPL token stakes, pari-mutuel
  payout math, sub-cent settlement fees.
- **TxODDS:** live feed drives fixtures, prices, and the settlement source of truth (swappable mock
  today; one env flip to the real API).
- **Impact:** the settlement layer every sports prediction market on Solana needs — provably fair,
  instant, and cheap enough to run on all 104 matches.

Repo: [link] · Live: [link] · Demo video: [link] · Program (devnet): `3P82MF…acLL6`

### Demo video script (~3 min)

1. **(0:00–0:25) Hook.** Landing page. "PitchProof turns TxODDS' live World Cup feed into a
   verifiable Solana oracle. Here's the prediction-markets app built on it." Show the live ticker.
2. **(0:25–1:05) Place a position.** Open Markets → a live match → connect Phantom (devnet) →
   airdrop demo dUSDC → stake on Home. Show the bet slip: potential payout, implied prob, model edge.
   Confirm the transaction; open the tx on Solana Explorer.
3. **(1:05–1:50) Settlement.** Trigger "Sync oracle" (or wait for the match clock to tick to FT).
   Show the market flip to resolved, the winning side highlighted, and the Claim button. Claim →
   winnings land in the wallet. Show the payout tx on Explorer.
4. **(1:50–2:35) The proof.** Open `/verify/[match]`. Show the canonical record, the sha256 hash,
   and that it's the exact bytes stored in the on-chain match account. "Anyone can recompute this —
   settlement is trustless."
5. **(2:35–3:00) Close.** "One Anchor program, the TxODDS feed as the oracle, verifiable settlement
   on every match. That's the infrastructure sports markets on Solana are missing."

### Pitch deck outline

1. Problem — sports prediction markets rely on opaque, trusted resolution.
2. Insight — the sponsor's own live feed can be the on-chain oracle.
3. Product — markets + automatic, verifiable settlement (screens).
4. How it works — TxODDS → relayer → Solana program → resolve/claim (diagram).
5. Why now / why us — World Cup 2026, TxODDS data, Solana speed & cost.
6. Solana usage — Anchor program, PDA vaults, SPL, pari-mutuel math.
7. Business — take rate on settled volume; white-label settlement SDK.
8. Ask / roadmap — mainnet, real TxODDS keys, audited program.

---

## Track 2 — Consumer & Fan Experiences

### Submission copy

**PitchProof MatchDay — a free-to-play World Cup pick'em that a non-crypto fan actually enjoys.**

Call the result of every match, climb a global leaderboard, keep your streak alive, and mint
collectible **Moments** from the games you got right. Picks are recorded on-chain (one PDA per
user+match), so the leaderboard is verifiable and Moments are real assets — but the wallet is
invisible: you can play as a guest and connect later. All powered by the same on-chain match feed
as the rest of PitchProof.

- **On Solana:** on-chain picks (free `place_pick` instruction), compressed-NFT Moments for mass
  scale, invisible onboarding.
- **TxODDS:** fixtures and results drive the game and settle picks automatically.
- **Impact:** the top-of-funnel fan product — millions of casual fans, zero crypto friction,
  a natural on-ramp into the markets.

Repo: [link] · Live: [link] · Demo video: [link]

### Demo video script (~3 min)

1. **(0:00–0:30)** Open MatchDay as a guest. "No wallet, no friction — just pick." Make 3–4 picks
   on upcoming matches; show the streak/points update.
2. **(0:30–1:10)** Leaderboard — show your rank climbing; explain picks are recorded on-chain so
   ranks are verifiable, not a server's word.
3. **(1:10–1:55)** Connect Phantom → the same picks now persist on-chain (`place_pick` tx on
   Explorer). "Your picks are yours."
4. **(1:55–2:35)** A match you called goes final → a **Moment** mints (collectible card). Show the
   Moments gallery.
5. **(2:35–3:00)** Close — "Free, fun, mobile-first, and it turns fans into on-chain users. This is
   the funnel into the whole PitchProof ecosystem."

### Pitch deck outline

1. Problem — crypto fan apps feel like crypto, so fans bounce.
2. Product — pick'em + leaderboard + Moments, wallet hidden.
3. On-chain where it matters — verifiable ranks, real collectibles.
4. Engagement loop — daily picks → streaks → Moments → markets.
5. Solana usage — free picks, compressed NFTs at scale.
6. Impact/business — huge top-of-funnel; sponsorships, drops, cross-sell.
7. Roadmap — social, notifications, real TxODDS + mainnet.

---

## Track 3 — Trading Tools & Agents

### Submission copy

**PitchProof Terminal + Striker — a trading desk and an autonomous agent for World Cup markets.**

Terminal is a pro desk over the PitchProof markets: live edges, positions, P&L. **Striker** is an
autonomous agent that prices every market off the TxODDS feed, compares its model-fair probability
to the market price, and books the positive-EV side at a capped half-Kelly stake — executing on
devnet with a fully transparent, deterministic reasoning log (no black box; an optional LLM only
narrates, it never decides). Because the feed carries small real mispricings, Striker finds and
takes genuine edges.

- **On Solana:** the agent executes via the PitchProof program (place_position/claim) on devnet.
- **TxODDS:** the agent's fair model and every edge is computed from the feed.
- **Impact:** the liquidity and intelligence layer markets need — market-making, edge discovery,
  and an extensible agent framework other builders can plug into.

Repo: [link] · Live: [link] · Demo video: [link]

### Demo video script (~3 min)

1. **(0:00–0:30)** Open Terminal. Explain the live-edges table: market price vs model-fair, ranked
   by EV.
2. **(0:30–1:20)** Hit "Run agent." Watch Striker scan, book top edges into the blotter, and stream
   its reasoning log (fair% vs market%, edge, half-Kelly stake). Emphasize it's deterministic.
3. **(1:20–2:05)** Click a signal → jump to that market → show the same edge in the bet slip →
   Striker's on-chain execution (tx on Explorer, devnet).
4. **(2:05–2:45)** Show the summary stats (markets scanned, edges found, best edge, booked edge) and
   explain the strategy + risk cap.
5. **(2:45–3:00)** Close — "A transparent, autonomous trading agent on live sports data. Extend the
   strategy, and it's a framework for on-chain sports trading."

### Pitch deck outline

1. Problem — on-chain sports markets are thin and hard to trade.
2. Product — Terminal (desk) + Striker (autonomous agent).
3. Edge — deterministic, inspectable strategy on the TxODDS feed.
4. How it works — scan → price → +EV → execute on Solana (diagram).
5. Solana usage — on-chain execution, composable with the markets program.
6. Impact/business — market-making rebates, agent marketplace, data.
7. Roadmap — more markets, live in-play trading, strategy SDK.
