// Dev sanity check for the TxODDS mock data layer. Run: npx tsx scripts/sanity.ts
import { buildTournament } from "../lib/txodds/tournament";
import { MockTxOddsProvider } from "../lib/txodds/mock";

async function main() {
  const t = buildTournament();
  const byStage: Record<string, number> = {};
  for (const f of t.fixtures) byStage[f.stage] = (byStage[f.stage] ?? 0) + 1;

  console.log("total fixtures:", t.fixtures.length, "(expect 104)");
  console.log("by stage:", byStage);
  console.log("champion:", t.championCode);

  console.log(
    "Group A:",
    t.standings["A"].map((s) => `${s.team.code} ${s.pts}pts ${s.gf}-${s.ga}`).join(" | "),
  );

  const ids = new Set(t.fixtures.map((f) => f.id));
  console.log("unique ids:", ids.size, "(expect 104)");

  const provider = new MockTxOddsProvider();
  const fx = await provider.getFixtures();
  const counts: Record<string, number> = {};
  for (const f of fx) counts[f.status] = (counts[f.status] ?? 0) + 1;
  console.log("status now:", counts);

  const live = fx.filter((f) => f.status === "live").slice(0, 3);
  for (const f of live) {
    const odds = await provider.getOdds(f.id);
    const fair = await provider.getFairProbabilities(f.id);
    console.log(
      `LIVE ${f.home.code} ${f.score?.home}-${f.score?.away} ${f.away.code} (${f.minute}') ` +
        `1X2 ${odds?.oneXtwo.home}/${odds?.oneXtwo.draw}/${odds?.oneXtwo.away} ` +
        `fair ${fair?.home.toFixed(2)}/${fair?.draw.toFixed(2)}/${fair?.away.toFixed(2)}`,
    );
  }
}

main();
