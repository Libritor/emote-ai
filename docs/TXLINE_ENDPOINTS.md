# TxLINE API — endpoints used by Emote AI

Live data layer for the markets board, the Sentinel trading agent, the on-chain
integrity oracle, and the Verify page. The app talks to TxLINE exclusively from
the server (`lib/txline/client.ts`); the browser never sees credentials.

Hosts: mainnet `https://txline.txodds.com` - devnet `https://txline-dev.txodds.com`
(same paths on both; pick ONE network for the whole credential chain).

## How easy it is to integrate and reuse

Auth is a one-time wallet flow; after that, every surface shares the same thin
client and provider - no per-feature wiring.

1. **One-time credentials** - Run `/setup/txline` (or `scripts/txline/activate.mjs`),
   drop `TXLINE_JWT` + `TXLINE_API_TOKEN` into `.env.local`, set `TXODDS_MODE=live`.
2. **Thin HTTP client** - `lib/txline/client.ts` is four typed helpers
   (`fetchFixturesSnapshot`, `fetchOddsSnapshot`, `fetchScoresSnapshot`,
   `fetchScoresUpdates`). Headers and origin come from env automatically.
3. **One app contract** - `LiveTxOddsProvider` maps TxLINE payloads onto
   `TxOddsProvider`. Callers use `getTxOdds()` and never touch raw TxLINE shapes.
4. **Reuse everywhere** - Markets board, Sentinel agent, Verify page, and the
   on-chain relayer all import the same `getTxOdds()`. A new route is typically
   `const provider = getTxOdds()` plus the method you need.
5. **Mock ↔ live flip** - Unset or change `TXODDS_MODE` to leave live mode and
   the identical interface serves the mock provider - useful for local UI work
   without TxLINE reachability.

## Authentication (one-time, wallet-signed)

| # | Endpoint | Purpose | Where in code |
|---|----------|---------|---------------|
| 1 | `POST /auth/guest/start` | Anonymous guest JWT, 30-day expiry | `app/api/txline/guest/route.ts`, `scripts/txline/activate.mjs` |
| 2 | on-chain `subscribe(serviceLevelId, weeks)` | Free World Cup tier registration, signed by the wallet. Program `9ExbZ…cKaA` (mainnet) / `6pW64…yP2J` (devnet); accounts incl. `pricing_matrix` + `token_treasury_v2` PDAs and the user's Token-2022 TxL ATA (created idempotently in the same tx) | `components/TxlineSetup.tsx` (Phantom, `/setup/txline`), `scripts/txline/activate.mjs` (headless keypair) |
| 3 | `POST /api/token/activate` | Exchanges `{txSig, walletSignature, leagues: []}` for the long-lived API token. `walletSignature` = base64 ed25519 detached signature over `` `${txSig}::${jwt}` `` | `app/api/txline/activate/route.ts`, `scripts/txline/activate.mjs` |

Every data request then carries BOTH headers:
`Authorization: Bearer <jwt>` and `X-Api-Token: <token>`.
Free service levels: mainnet `1` (60s delay) / `12` (real-time); devnet `1`.

## Data endpoints (per request path)

| Endpoint | Purpose | Where in code |
|----------|---------|---------------|
| `GET /api/fixtures/snapshot?startEpochDay=` | All World Cup fixtures (CompetitionId 72, "World Cup"); two pages from epoch day 20615 cover Jun 11 - Jul 19 | `LiveTxOddsProvider.rawWorldCupFixtures` (`lib/txodds/live.ts`) |
| `GET /api/odds/snapshot/{fixtureId}` | Current StablePrice consensus odds (demargined decimal odds ×1000 + `Pct` fair percentages) | `LiveTxOddsProvider.oddsPayloads` → markets board 1X2, O/U 2.5, fair probabilities, Sentinel signals |
| `GET /api/odds/snapshot/{fixtureId}?asOf=<kickoff-60s>` | Closing line for already-played fixtures (no live 5-min window) | same, fallback branch |
| `GET /api/scores/snapshot/{fixtureId}` | Latest score events → status (StatusId phase, incl. `game_finalised`=100), goals (`Stats["1"]/["2"]`), shootout goals (`6001/6002`), match clock | `stateFromScores` (`lib/txodds/live.ts`) → fixture status/score/minute/outcome, oracle settlement |

## Payload facts we rely on (probe-verified)

- 1X2 market: `SuperOddsType = "1X2_PARTICIPANT_RESULT"`, `PriceNames = ["part1","draw","part2"]` — participant-relative, oriented to home/away via the fixture's `Participant1IsHome`.
- Totals: `SuperOddsType = "OVERUNDER_PARTICIPANT_GOALS"`, `MarketParameters = "line=2.5"`.
- Full-time markets carry no `MarketPeriod`; halves arrive as `"half=1"`.
- `Prices` are demargined decimal odds ×1000 (`Bookmaker = "TXLineStablePriceDemargined"`), so `Pct` ≈ 100/odds and the overround ≈ 1.0.
- Scores payloads are PascalCase (unlike the OpenAPI YAML) and the snapshot returns one latest event per action type; post-match `action_amend` events can carry a stale `StatusId` with a higher `Seq` than the final whistle — the provider takes the MAX StatusId over regular phases.

## Credentials / env

```
TXODDS_MODE=live
TXLINE_API_ORIGIN=https://txline.txodds.com   # or https://txline-dev.txodds.com
TXLINE_JWT=…            # renew within 30 days (POST /auth/guest/start + re-activate)
TXLINE_API_TOKEN=…      # valid for the 4-week subscription
```

Obtain via the Phantom flow at `/setup/txline`, or headless:
`node scripts/txline/activate.mjs --network devnet|mainnet` (mainnet needs the
printed address funded with ~0.003 SOL; the tier itself is free).

## Roadmap (not yet integrated)

- SSE streams `GET /api/odds/stream`, `GET /api/scores/stream` (sub-second updates; we poll snapshots with a 15s cache instead).
- Merkle proof endpoints `GET /api/fixtures/validation`, `GET /api/odds/validation`, `GET /api/scores/stat-validation` + on-chain `validate_*` instructions — natural extension of the `/verify` page.

### Local-dev note

Corporate OpenDNS blocks `*.txodds.com` (betting category). Local development
pins the hosts in `/etc/hosts` (entries marked "TxLINE hackathon", added Jul 18,
2026 — remove after the event). Deployed environments are unaffected.
