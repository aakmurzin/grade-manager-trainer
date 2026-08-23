/**
 * Addendum 47 — Design Trainee Classical death/failure diagnosis on seeds 10001..10024.
 * Deterministic replay (same discipline as A45 Marketing).
 *
 * Design is one-off: "first revenue" = first week totalRevenue > 0 (project complete),
 * not retainer_payout. Most sessions finish 4Q deep-loss without bankrupt — diagnose both.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionSeedFor } from '@/game/engine/seeds';
import { HeadlessSession } from '@/game/headless';
import { createReasonableAgent } from './agents/reasonable';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');
const N = 24;

async function runSession(seed: number, index: number) {
  const session = new HeadlessSession({
    companyType: 'design_agency',
    format: 'classical_4q',
    speed: 1,
    managerLevel: 'trainee',
    seed,
  });
  const agent = createReasonableAgent(seed);
  let stuckTicks = 0;
  let firstRevenueWeek: number | null = null;
  let completedProjects = 0;
  let prevRevenue = 0;

  for (let step = 0; step < 1200; step++) {
    const view = session.getState();
    if (view.gameOver) break;
    const decision = await agent.decide(view);
    const result = session.applyAction(decision.action);
    const engine = session.getEngineState();
    if (firstRevenueWeek == null && engine.totalRevenue > 0) {
      firstRevenueWeek = engine.week;
    }
    // done projects are pruned each tick — count via revenue jumps (~checkBand)
    if (engine.totalRevenue > prevRevenue) {
      completedProjects += 1;
      prevRevenue = engine.totalRevenue;
    }
    if (decision.action.type === 'tick_week') stuckTicks = 0;
    else if (!result.success) {
      stuckTicks += 1;
      if (stuckTicks >= 3) {
        session.applyAction({ type: 'tick_week' });
        stuckTicks = 0;
      }
    } else stuckTicks = 0;
  }

  const engine = session.getEngineState();
  const log = engine.decisionLog;
  const netProfit = engine.history.reduce((s, h) => s + h.netProfit, 0);
  const deathWeek = engine.week;
  const compliance = log.filter(
    (e) => e.eventType === 'random_event' && e.payload.kind === 'compliance',
  );
  const complianceFails = compliance.filter(
    (e) => e.eventType === 'random_event' && e.payload.outcome === 'fail',
  );
  const lastFail = [...complianceFails].pop();
  const failNearDeath =
    engine.bankrupt && lastFail != null && deathWeek - lastFail.week <= 4;
  const reworks = log.filter((e) => e.eventType === 'rework').length;
  const hires = log.filter((e) => e.eventType === 'hire');
  const salesHires = hires.filter((e) => e.eventType === 'hire' && e.payload.role === 'sales');
  const designerHires = hires.filter(
    (e) => e.eventType === 'hire' && e.payload.role === 'designer',
  );

  const q = engine.history.map((h) => h.netProfit);
  const q1 = q[0] ?? 0;
  const postQ1Sum = q.slice(1).reduce((a, b) => a + b, 0);

  let cause: string;
  if (engine.bankrupt) {
    if (firstRevenueWeek == null || deathWeek < firstRevenueWeek) cause = 'pre_revenue_runway';
    else if (failNearDeath) cause = 'compliance_fail_near_death';
    else if (complianceFails.length > 0) cause = 'compliance_fail_then_payroll';
    else cause = 'post_revenue_payroll';
  } else if (netProfit > 0) {
    cause = 'profitable';
  } else if (firstRevenueWeek == null) {
    cause = 'survived_no_revenue';
  } else if (q1 < -3000 && postQ1Sum >= 0) {
    cause = 'q1_hole_partial_recovery';
  } else if (q1 < -3000 && postQ1Sum < 0) {
    cause = 'q1_hole_and_continued_loss';
  } else {
    cause = 'slow_bleed_all_quarters';
  }

  return {
    id: `s${String(index).padStart(2, '0')}`,
    seed,
    bankrupt: engine.bankrupt,
    profitable: netProfit > 0 && !engine.bankrupt,
    netProfit,
    deathWeek,
    weeksPlayed: engine.week,
    quarterNetProfit: q,
    firstRevenueWeek,
    completedProjects,
    diedBeforeFirstRevenue:
      engine.bankrupt && (firstRevenueWeek == null || deathWeek < firstRevenueWeek),
    complianceEventCount: compliance.length,
    complianceFailCount: complianceFails.length,
    failNearDeath,
    reworkCount: reworks,
    salesHireCount: salesHires.length,
    designerHireCount: designerHires.length,
    firstSalesWeek: salesHires[0]?.week ?? null,
    firstDesignerWeek: designerHires[0]?.week ?? null,
    startBudget: engine.startBudget,
    finalBudget: engine.budget,
    totalRevenue: engine.totalRevenue,
    cause,
  };
}

async function main() {
  console.log(
    `Design Trainee Classical diagnosis: seeds ${sessionSeedFor('design_agency', 1)}..${sessionSeedFor('design_agency', N)}`,
  );
  const all = [];
  for (let i = 1; i <= N; i++) {
    const seed = sessionSeedFor('design_agency', i);
    const r = await runSession(seed, i);
    all.push(r);
    const tag = r.bankrupt ? 'BANKRUPT' : r.profitable ? 'PROFIT' : 'LOSS';
    console.log(
      `${r.id} seed=${seed} ${tag} w=${r.deathWeek} NP=${r.netProfit} firstRev@${r.firstRevenueWeek} done=${r.completedProjects} compF=${r.complianceFailCount} cause=${r.cause}`,
    );
  }

  const bankrupt = all.filter((r) => r.bankrupt);
  const survived = all.filter((r) => !r.bankrupt);
  const loss = all.filter((r) => !r.bankrupt && !r.profitable);
  const weeks = bankrupt.map((r) => r.deathWeek).sort((a, b) => a - b);
  const median = (xs: number[]) =>
    xs.length ? xs[Math.floor((xs.length - 1) / 2)]! : null;
  const profits = all.map((r) => r.netProfit).sort((a, b) => a - b);
  const quantile = (p: number) => {
    const i = (profits.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return profits[lo]!;
    return profits[lo]! * (hi - i) + profits[hi]! * (i - lo);
  };

  const byCause: Record<string, number> = {};
  for (const r of all) byCause[r.cause] = (byCause[r.cause] ?? 0) + 1;

  const firstRevWeeks = all
    .map((r) => r.firstRevenueWeek)
    .filter((w): w is number => w != null)
    .sort((a, b) => a - b);

  const summary = {
    n: all.length,
    bankruptN: bankrupt.length,
    profitableN: all.filter((r) => r.profitable).length,
    lossSurvivedN: loss.length,
    startBudget: all[0]?.startBudget,
    netProfit: {
      mean: Math.round(profits.reduce((a, b) => a + b, 0) / profits.length),
      p10: Math.round(quantile(0.1)),
      p50: Math.round(quantile(0.5)),
      p90: Math.round(quantile(0.9)),
      min: profits[0],
      max: profits[profits.length - 1],
    },
    bankruptDeathWeeks: weeks,
    medianBankruptDeathWeek: median(weeks),
    q1BankruptDeaths: bankrupt.filter((r) => r.deathWeek <= 12).length,
    diedBeforeFirstRevenue: bankrupt.filter((r) => r.diedBeforeFirstRevenue).length,
    bankruptPostRevenue: bankrupt.filter((r) => !r.diedBeforeFirstRevenue).length,
    bankruptWithComplianceFail: bankrupt.filter((r) => r.complianceFailCount > 0).length,
    anyWithComplianceFail: all.filter((r) => r.complianceFailCount > 0).length,
    medianFirstRevenueWeek: median(firstRevWeeks),
    sessionsWithAnyRevenue: all.filter((r) => r.firstRevenueWeek != null).length,
    meanCompletedProjects: Math.round(
      (all.reduce((s, r) => s + r.completedProjects, 0) / all.length) * 10,
    ) / 10,
    byCause,
  };

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

  const outDir = join(REPO_ROOT, 'playtest-results');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'addendum-47-design-death-diagnosis.json');
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          createdAt: new Date().toISOString(),
          addendum: 47,
          companyType: 'design_agency',
          managerLevel: 'trainee',
          format: 'classical_4q',
          checkBand: [600, 700],
          startBudgetNote: 'trainee base 18000 + design buffer 2000 = 20000',
          seeds: Array.from({ length: N }, (_, i) => sessionSeedFor('design_agency', i + 1)),
          note: 'Deterministic seeds 10001..10024; first revenue = project complete (one-off), not retainer_payout',
        },
        summary,
        sessions: all,
        bankrupt,
        survivedLoss: loss,
        survived,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
