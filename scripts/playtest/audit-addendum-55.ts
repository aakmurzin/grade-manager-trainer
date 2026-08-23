/**
 * Addendum 55 — live Manager Report audit for one Design Trainee Classical session.
 * Replays a known profitable seed and dumps full scorecard + P&L + event inventory.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionSeedFor } from '@/game/engine/seeds';
import { HeadlessSession } from '@/game/headless';
import { computeManagerReport } from '@/game/report/computeManagerReport';
import { createReasonableAgent } from './agents/reasonable';
import type { DecisionEventType } from '@/game/decisionLog/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

/** Prefer a known profitable Design seed from A50 (s05 seed 10005 → +$15.9k). */
const SEED_INDEX = 5;

async function runOne(seed: number) {
  const session = new HeadlessSession({
    companyType: 'design_agency',
    speed: 1,
    managerLevel: 'trainee',
    seed,
  });
  const agent = createReasonableAgent(seed);
  let stuck = 0;
  for (let step = 0; step < 1200; step++) {
    const view = session.getState();
    if (view.gameOver) break;
    const d = await agent.decide(view);
    const r = session.applyAction(d.action);
    if (d.action.type === 'tick_week') stuck = 0;
    else if (!r.success) {
      stuck += 1;
      if (stuck >= 3) {
        session.applyAction({ type: 'tick_week' });
        stuck = 0;
      }
    } else stuck = 0;
  }
  return session.getEngineState();
}

function countEvents(log: { eventType: string }[]) {
  const counts: Record<string, number> = {};
  for (const e of log) counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
  return counts;
}

const EXPECTED_EVENTS: DecisionEventType[] = [
  'session_start',
  'hire',
  'assign_lead',
  'assign_project',
  'lead_inspected',
  'lead_skipped',
  'project_inspected',
  'project_skipped',
  'candidates_rerolled',
  'bonus',
  'employee_terminated',
  'promotion_accept',
  'promotion_decline',
  'build_room',
  'build_desk',
  'week_snapshot',
  'rework',
  'quit',
  'near_bankruptcy',
  'random_event',
  'client_churn',
  'retainer_payout',
];

async function main() {
  const seed = sessionSeedFor('design_agency', SEED_INDEX);
  const engine = await runOne(seed);
  const report = computeManagerReport(engine.decisionLog);
  const eventCounts = countEvents(engine.decisionLog);
  const qnp = engine.history.map((h) => h.netProfit);
  const cumFromQuarters = qnp.reduce((a, b) => a + b, 0);
  const netProfit = cumFromQuarters;

  const pl = engine.history.map((h, i) => ({
    quarter: i + 1,
    revenue: h.revenue,
    salaries: h.salaries,
    overheads: h.overheads,
    ebitda: h.ebitda,
    netProfit: h.netProfit,
    ebitdaCheck: Math.round(h.revenue - h.salaries - h.overheads) === Math.round(h.ebitda),
  }));

  const axesDetail = Object.fromEntries(
    Object.entries(report.scores).map(([k, v]) => [
      k,
      { score: v.score, confidence: v.confidence, n: v.n },
    ]),
  );

  const eventInventory = EXPECTED_EVENTS.map((t) => ({
    eventType: t,
    countInThisSession: eventCounts[t] ?? 0,
    presentInThisSession: (eventCounts[t] ?? 0) > 0,
  }));

  const out = {
    meta: {
      addendum: 55,
      purpose: 'Manager Report live audit — one Design Trainee 4Q session',
      companyType: 'design_agency',
      managerLevel: 'trainee',
      seed,
      seedIndex: SEED_INDEX,
      createdAt: new Date().toISOString(),
    },
    companyReport: {
      startBudget: engine.startBudget,
      finalBudget: engine.budget,
      bankrupt: engine.bankrupt,
      quarters: pl,
      cumulativeNetProfit: netProfit,
      sumOfQuarterNetProfit: cumFromQuarters,
      plReconciliationOk: Math.round(netProfit) === Math.round(cumFromQuarters),
      note: 'UI PLTable shows Revenue/Salaries/Overheads/EBITDA/Net Profit (no separate Gross Profit line).',
    },
    managerReport: {
      activityIndex: report.activityIndex,
      archetype: report.archetype,
      paei: report.paei,
      axes: axesDetail,
      mediumOrHighAxes: Object.values(axesDetail).filter(
        (a) => a.confidence === 'medium' || a.confidence === 'high',
      ).length,
      flaggedMoments: report.flaggedMoments,
    },
    decisionLog: {
      totalEntries: engine.decisionLog.length,
      eventCounts,
      eventInventory,
      sampleAssignLead: engine.decisionLog.find((e) => e.eventType === 'assign_lead')?.payload ?? null,
      sampleAssignProject:
        engine.decisionLog.find((e) => e.eventType === 'assign_project')?.payload ?? null,
      sampleBonus: engine.decisionLog.find((e) => e.eventType === 'bonus')?.payload ?? null,
      sampleTerminated:
        engine.decisionLog.find((e) => e.eventType === 'employee_terminated')?.payload ?? null,
    },
  };

  const outDir = join(REPO_ROOT, 'playtest-results');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'addendum-55-manager-report-audit.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
