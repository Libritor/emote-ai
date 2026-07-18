# Emote AI — Sentinel (Trading Tools & Agents)

**An integrity-aware trading agent for the World Cup.**

> Hackathon submission branch. Architecture is in [`README.md`](./README.md); full track copy in
> [`docs/SUBMISSIONS.md`](./docs/SUBMISSIONS.md).

Sentinel fuses the Emote AI **integrity signal** with TxODDS odds: it prices every market, **flags
and hedges** matches where officiating looks suspicious, and logs every decision transparently
(deterministic strategy — an optional LLM only narrates, it never decides). A **Tilt-Guard** reads
the *trader's own* biometrics (via the same Emote AI core) and gates over-heated trading. The
liquidity + intelligence layer on top of the integrity markets.

**Try it:** `[Vercel URL]` → opens **Sentinel** → **Run agent** → watch it scan, flag a suspicious
match, and book hedges with a streaming reasoning log.

- Agent strategy: [`lib/agent/striker.ts`](./lib/agent/striker.ts) · Terminal UI: [`components/Terminal.tsx`](./components/Terminal.tsx)
- Detection core (Tilt-Guard): [`lib/emote/`](./lib/emote)

⚠ The integrity score is an **experimental heuristic for entertainment** — not a lie detector, not
evidence of wrongdoing. Devnet only.
