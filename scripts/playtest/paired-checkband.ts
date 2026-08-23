/**
 * Addendum 43 — paired Marketing checkBand comparison on identical seeds.
 * Mutates COMPANY_PROFILES.marketing_agency.checkBand per config; restores [4500,6500] after.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANY_PROFILES } from '@/game/catalog/balance';
import { sessionSeedFor } from '@/game/engine/seeds';
import { HeadlessSession } from '@/game/headless';
import { createReasonableAgent } from './agents/reasonable';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

const BANDS: [number, number][] = [
  [4000, 5500],
  [4500, 6500],
  [5000, 7000],
];
const N = 24;
const FINAL_BAND: [number, number] = [5000, 7000];

type SessionOut = {
  id: string;
  seed: number;
  bankrupt: boolean;
  profitable: boolean;
  netProfit: number;
  weeksPlayed: number;
  quarterNetProfit: number[];
};

function summarize(sessions: SessionOut[]) {
  const profits = sessions.map((s) => s.netProfit).sort((a, b) => a - b);
  const pct = (n: number) => Math.round((n / sessions.length) * 1000) / 10;
  const mean = profits.reduce((a, b) => a + b, 0) / profits.length;
  const quantile = (p: number) => {
    const i = (profits.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return profits[lo]!;
    return profits[lo]! * (hi - i) + profits[hi]! * (i - lo);
  };
  return {
    n: sessions.length,
    bankruptPct: pct(sessions.filter((s) => s.bankrupt).length),
    profitablePct: pct(sessions.filter((s) => s.profitable).length),
    netProfit: {
      mean: Math.round(mean),
      p10: Math.round(quantile(0.1)),
      p50: Math.round(quantile(0.5)),
      p90: Math.round(quantile(0.9)),
      min: profits[0]!,
      max: profits[profits.length - 1]!,
    },
  };
}

async function runSession(seed: number, index: number): Promise<SessionOut> {
  const session = new HeadlessSession({
    companyType: 'marketing_agency',
    format: 'classical_4q',
    speed: 1,
    managerLevel: 'director',
    seed,
  });
  const agent = createReasonableAgent(seed);
  let stuckTicks = 0;
  for (let step = 0; step < 1200; step++) {
    const view = session.getState();
    if (view.gameOver) break;
    const decision = await agent.decide(view);
    const result = session.applyAction(decision.action);
    if (decision.action.type === 'tick_week') {
      stuckTicks = 0;
    } else if (!result.success) {
      stuckTicks += 1;
      if (stuckTicks >= 3) {
        session.applyAction({ type: 'tick_week' });
        stuckTicks = 0;
      }
    } else {
      stuckTicks = 0;
    }
  }
  const engine = session.getEngineState();
  const netProfit = engine.history.reduce((s, h) => s + h.netProfit, 0);
  return {
    id: `s${String(index).padStart(2, '0')}_marketing_agency`,
    seed,
    bankrupt: engine.bankrupt,
    profitable: netProfit > 0 && !engine.bankrupt,
    netProfit,
    weeksPlayed: engine.week,
    quarterNetProfit: engine.history.map((h) => h.netProfit),
  };
}

async function runBand(band: [number, number]) {
  COMPANY_PROFILES.marketing_agency.checkBand = [...band] as [number, number];
  const sessions: SessionOut[] = [];
  for (let i = 1; i <= N; i++) {
    const seed = sessionSeedFor('marketing_agency', i);
    const r = await runSession(seed, i);
    sessions.push(r);
    const tag = r.bankrupt ? 'BANKRUPT' : r.profitable ? 'PROFIT' : 'FLAT/LOSS';
    console.log(
      `  [${band[0]}-${band[1]}] ${r.id} seed=${seed}: ${tag} cum=${r.netProfit}`,
    );
  }
  return { band, summary: summarize(sessions), sessions };
}

async function main() {
  const original = [...COMPANY_PROFILES.marketing_agency.checkBand] as [number, number];
  console.log(
    `Paired checkBand re-verification: ${BANDS.map((b) => `[${b}]`).join(' vs ')} on seeds ${sessionSeedFor('marketing_agency', 1)}..${sessionSeedFor('marketing_agency', N)}`,
  );

  const results = [];
  try {
    for (const band of BANDS) {
      console.log(`\n=== checkBand [${band[0]}, ${band[1]}] ===`);
      results.push(await runBand(band));
    }
  } finally {
    COMPANY_PROFILES.marketing_agency.checkBand = [...FINAL_BAND] as [number, number];
    console.log(`\nRestored checkBand to [${FINAL_BAND[0]}, ${FINAL_BAND[1]}] (was ${original})`);
  }

  const comparison = {
    meta: {
      createdAt: new Date().toISOString(),
      addendum: 43,
      method: 'paired',
      seeds: Array.from({ length: N }, (_, i) => sessionSeedFor('marketing_agency', i + 1)),
      note: 'Same seeds for all three bands; Accountant heuristic active; classical_4q reasonable.',
      finalBandRestored: FINAL_BAND,
    },
    bands: results.map((r) => ({
      checkBand: r.band,
      summary: r.summary,
    })),
    sessionsByBand: Object.fromEntries(
      results.map((r) => [`${r.band[0]}_${r.band[1]}`, r.sessions]),
    ),
  };

  const outDir = join(REPO_ROOT, 'playtest-results');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'batch-addendum-43-paired-checkband.json');
  writeFileSync(outPath, JSON.stringify(comparison, null, 2));

  console.log('\n=== PAIRED COMPARISON ===');
  for (const r of results) {
    const s = r.summary;
    console.log(
      `[${r.band[0]}, ${r.band[1]}]: bankrupt=${s.bankruptPct}% profitable=${s.profitablePct}% mean=${s.netProfit.mean} p50=${s.netProfit.p50} p90=${s.netProfit.p90}`,
    );
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  COMPANY_PROFILES.marketing_agency.checkBand = [...FINAL_BAND] as [number, number];
  process.exit(1);
});
