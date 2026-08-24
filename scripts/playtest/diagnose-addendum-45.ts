/**
 * Addendum 45 — diagnose typical [5000,7000] bankrupt death (replay A43 seeds).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANY_PROFILES } from '@/game/catalog/balance';
import { sessionSeedFor } from '@/game/engine/seeds';
import { HeadlessSession } from '@/game/headless';
import { createReasonableAgent } from './agents/reasonable';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');
const BAND: [number, number] = [5000, 7000];
const N = 24;

async function runSession(seed: number, index: number) {
  const session = new HeadlessSession({
    companyType: 'marketing_agency',
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

  const payouts = log.filter((e) => e.eventType === 'retainer_payout');
  const compliance = log.filter(
    (e) => e.eventType === 'random_event' && e.payload.kind === 'compliance',
  );
  const hires = log.filter((e) => e.eventType === 'hire');
  const accountantHire = hires.find((e) => e.eventType === 'hire' && e.payload.role === 'accountant');
  const nearBank = log.filter((e) => e.eventType === 'near_bankruptcy');

  const deathWeek = engine.week;
  const firstPayoutWeek = payouts[0]?.week ?? null;
  const payoutsBeforeDeath = payouts.filter((e) => e.week <= deathWeek).length;
  const complianceBeforeDeath = compliance.filter((e) => e.week <= deathWeek);
  const complianceFails = complianceBeforeDeath.filter(
    (e) => e.eventType === 'random_event' && e.payload.outcome === 'fail',
  );
  const complianceMitigated = complianceBeforeDeath.filter(
    (e) => e.eventType === 'random_event' && e.payload.outcome === 'mitigated',
  );
  const lastCompliance = complianceBeforeDeath[complianceBeforeDeath.length - 1];
  const weeksFromLastComplianceToDeath =
    lastCompliance != null ? deathWeek - lastCompliance.week : null;

  // Death "linked" to compliance if a fail happened and budget cratered within 4 weeks,
  // or death week == compliance week / next few weeks after fail penalty.
  const failNearDeath = complianceFails.some((e) => deathWeek - e.week <= 4);

  return {
    id: `s${String(index).padStart(2, '0')}`,
    seed,
    bankrupt: engine.bankrupt,
    profitable: netProfit > 0 && !engine.bankrupt,
    netProfit,
    deathWeek,
    quarterNetProfit: engine.history.map((h) => h.netProfit),
    firstPayoutWeek,
    payoutsBeforeDeath,
    payoutTotal: payouts.reduce(
      (s, e) => s + (e.eventType === 'retainer_payout' ? e.payload.amount : 0),
      0,
    ),
    diedBeforeFirstPayout: firstPayoutWeek == null || deathWeek < firstPayoutWeek,
    complianceEventCount: complianceBeforeDeath.length,
    complianceFailCount: complianceFails.length,
    complianceMitigatedCount: complianceMitigated.length,
    accountantHiredWeek: accountantHire?.week ?? null,
    accountantHired: accountantHire != null,
    failNearDeath,
    weeksFromLastComplianceToDeath,
    nearBankruptcyCount: nearBank.length,
    lastComplianceOutcome:
      lastCompliance?.eventType === 'random_event' ? lastCompliance.payload.outcome : null,
    lastComplianceWeek: lastCompliance?.week ?? null,
    lastComplianceCovered:
      lastCompliance?.eventType === 'random_event'
        ? lastCompliance.payload.accountantCoverage
        : null,
  };
}

async function main() {
  const prev = [...COMPANY_PROFILES.marketing_agency.checkBand] as [number, number];
  COMPANY_PROFILES.marketing_agency.checkBand = [...BAND] as [number, number];

  const all = [];
  try {
    for (let i = 1; i <= N; i++) {
      const seed = sessionSeedFor('marketing_agency', i);
      const r = await runSession(seed, i);
      all.push(r);
      console.log(
        `${r.id} seed=${seed} ${r.bankrupt ? 'BANKRUPT' : r.profitable ? 'PROFIT' : 'FLAT'} w=${r.deathWeek} payouts=${r.payoutsBeforeDeath} firstPay=${r.firstPayoutWeek} compF=${r.complianceFailCount} acc@${r.accountantHiredWeek} failNear=${r.failNearDeath}`,
      );
    }
  } finally {
    COMPANY_PROFILES.marketing_agency.checkBand = prev;
  }

  const bankrupt = all.filter((r) => r.bankrupt);
  const weeks = bankrupt.map((r) => r.deathWeek).sort((a, b) => a - b);
  const median = weeks[Math.floor((weeks.length - 1) / 2)];
  const q1 = bankrupt.filter((r) => r.deathWeek <= 12).length;
  const earlyQ2 = bankrupt.filter((r) => r.deathWeek >= 13 && r.deathWeek <= 14).length;
  const prePayout = bankrupt.filter((r) => r.diedBeforeFirstPayout).length;
  const postPayout = bankrupt.filter((r) => !r.diedBeforeFirstPayout).length;
  const anyCompliance = bankrupt.filter((r) => r.complianceEventCount > 0).length;
  const anyFail = bankrupt.filter((r) => r.complianceFailCount > 0).length;
  const failNear = bankrupt.filter((r) => r.failNearDeath).length;
  const hadAcc = bankrupt.filter((r) => r.accountantHired).length;
  const failWithAcc = bankrupt.filter(
    (r) => r.complianceFailCount > 0 && r.accountantHired,
  ).length;
  const failWithoutAcc = bankrupt.filter(
    (r) => r.complianceFailCount > 0 && !r.accountantHired,
  ).length;
  const purePayroll = bankrupt.filter(
    (r) => !r.diedBeforeFirstPayout && r.complianceFailCount === 0,
  ).length;
  const purePayrollOrOnlyMitigated = bankrupt.filter(
    (r) =>
      !r.diedBeforeFirstPayout &&
      r.complianceFailCount === 0 &&
      !r.failNearDeath,
  ).length;

  const summary = {
    n: all.length,
    bankruptN: bankrupt.length,
    deathWeeks: weeks,
    medianDeathWeek: median,
    q1Deaths: q1,
    earlyBoundary13_14: earlyQ2,
    diedBeforeFirstPayout: prePayout,
    diedAfterPayout: postPayout,
    hadComplianceEvent: anyCompliance,
    hadComplianceFail: anyFail,
    failNearDeath: failNear,
    accountantHiredAmongBankrupt: hadAcc,
    failWithAccountant: failWithAcc,
    failWithoutAccountant: failWithoutAcc,
    postPayoutNoComplianceFail: purePayroll,
    postPayoutNoFailNearDeath: purePayrollOrOnlyMitigated,
  };

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

  // Classify each bankrupt
  const classified = bankrupt.map((r) => {
    let cause: string;
    if (r.diedBeforeFirstPayout) cause = 'pre_payout_q1_runway';
    else if (r.failNearDeath) cause = 'compliance_fail_near_death';
    else if (r.complianceFailCount > 0) cause = 'compliance_fail_earlier_then_payroll';
    else cause = 'post_payout_revenue_payroll';
    return { ...r, cause };
  });
  const byCause: Record<string, number> = {};
  for (const c of classified) byCause[c.cause] = (byCause[c.cause] ?? 0) + 1;
  console.log('byCause', byCause);

  const outDir = join(REPO_ROOT, 'playtest-results');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'addendum-45-death-diagnosis.json');
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          createdAt: new Date().toISOString(),
          checkBand: BAND,
          seeds: '40001..40024',
          note: 'Deterministic replay of A43 [5000,7000] for decision-log diagnostics',
        },
        summary,
        byCause,
        bankrupt: classified,
        all,
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
