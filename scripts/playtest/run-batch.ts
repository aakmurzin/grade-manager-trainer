import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CompanyType, DecisionLogEntry, DomainId, ManagerLevel, SessionFormat } from '@/game';
import { FREE_REROLLS_PER_SESSION } from '@/game/catalog/balance';
import { HeadlessSession } from '@/game/headless';
import { sessionSeedFor } from '@/game/engine/seeds';
import { computeManagerReport } from '@/game/report/computeManagerReport';
import { createLlmAgent } from './agents/llm';
import { createReasonableAgent } from './agents/reasonable';
import type { PlayAgent } from './agents/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

type SessionPlan = {
  id: string;
  companyType: CompanyType;
  managerLevel: ManagerLevel;
  seed: number;
};

export type DecisionLogRow = {
  step: number;
  week: number;
  quarter: number;
  action: string;
  rationale: string;
  success: boolean;
  error?: string;
  budget: number;
};

export type SessionResult = {
  id: string;
  companyType: CompanyType;
  managerLevel: ManagerLevel;
  agent: string;
  seed: number;
  bankrupt: boolean;
  weeksPlayed: number;
  quartersCompleted: number;
  finalBudget: number;
  startBudget: number;
  netProfit: number;
  /** Per-quarter Net Profit from engine history (Classical: up to 4). */
  quarterNetProfit: number[];
  profitable: boolean;
  activityIndex: number;
  axes: Record<string, number | null>;
  archetype: string | null;
  avoidableMismatchHint: string | null;
  excessiveReroll: boolean;
  rerollCount: number;
  decisions: DecisionLogRow[];
  endHints: string[];
  retainerPayoutCount: number;
  retainerPayoutTotal: number;
  firstRetainerPayoutWeek: number | null;
  clientChurnCount: number;
  maxDomainReputation: number;
  maxDomainSalesReputation: number;
  maxDomainDeliveryReputation: number;
  weekCombinedDomainRepGte25: number | null;
  domainRepByQuarter: {
    quarter: number;
    week: number;
    maxSales: number;
    maxDelivery: number;
    maxCombined: number;
  }[];
  queuedProjectsAtEnd: number;
  inProgressProjectsAtEnd: number;
};

function planBatch(
  n = 24,
  scope: 'all' | 'trainee' | 'design' | 'marketing' = 'all',
): SessionPlan[] {
  const companies: { companyType: CompanyType; managerLevel: ManagerLevel }[] =
    scope === 'marketing'
      ? [{ companyType: 'marketing_agency', managerLevel: 'director' }]
      : scope === 'design'
      ? [{ companyType: 'design_agency', managerLevel: 'trainee' }]
      : scope === 'trainee'
        ? [
            { companyType: 'design_agency', managerLevel: 'trainee' },
            { companyType: 'product_studio', managerLevel: 'trainee' },
          ]
        : [
            { companyType: 'design_agency', managerLevel: 'trainee' },
            { companyType: 'product_studio', managerLevel: 'trainee' },
            { companyType: 'it_outsourcing', managerLevel: 'manager' },
            { companyType: 'marketing_agency', managerLevel: 'director' },
          ];
  const per = Math.ceil(n / companies.length);
  const plans: SessionPlan[] = [];
  let i = 0;
  const indexWithinType: Partial<Record<CompanyType, number>> = {};
  for (const c of companies) {
    for (let k = 0; k < per && plans.length < n; k++) {
      i += 1;
      const within = (indexWithinType[c.companyType] ?? 0) + 1;
      indexWithinType[c.companyType] = within;
      plans.push({
        id: `s${String(i).padStart(2, '0')}_${c.companyType}`,
        companyType: c.companyType,
        managerLevel: c.managerLevel,
        seed: sessionSeedFor(c.companyType, within),
      });
    }
  }
  return plans;
}

async function runSession(
  plan: SessionPlan,
  agentFactory: (seed: number) => PlayAgent,
  format: SessionFormat,
): Promise<SessionResult> {
  const session = new HeadlessSession({
    companyType: plan.companyType,
    format,
    speed: 1,
    managerLevel: plan.managerLevel,
    seed: plan.seed,
  });
  const agent = agentFactory(plan.seed);
  const decisions: DecisionLogRow[] = [];
  const maxSteps = format === 'classical_4q' ? 1200 : 400;
  let stuckTicks = 0;

  for (let step = 0; step < maxSteps; step++) {
    const view = session.getState();
    if (view.gameOver) break;

    const decision = await agent.decide(view);
    const result = session.applyAction(decision.action);
    decisions.push({
      step,
      week: view.week,
      quarter: view.quarter,
      action: JSON.stringify(decision.action),
      rationale: decision.rationale,
      success: result.success,
      error: result.error,
      budget: result.state.budget,
    });

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
  const view = session.getState();
  const report = computeManagerReport(engine.decisionLog);
  const netProfit = engine.history.reduce((s, h) => s + h.netProfit, 0);
  const avoidFlag =
    report.flaggedMoments.find((m) => m.description.toLowerCase().includes('avoidable'))
      ?.description ?? null;

  const retainerPays = engine.decisionLog.filter((e) => e.eventType === 'retainer_payout');
  const retainerPayoutTotal = retainerPays.reduce((s, e) => {
    return s + (e.eventType === 'retainer_payout' ? e.payload.amount : 0);
  }, 0);

  const domainSeries = domainReputationSeries(engine.decisionLog);
  const lastSnap = [...engine.decisionLog].reverse().find((e) => e.eventType === 'week_snapshot');

  return {
    id: plan.id,
    companyType: plan.companyType,
    managerLevel: plan.managerLevel,
    agent: agent.name,
    seed: plan.seed,
    bankrupt: engine.bankrupt,
    weeksPlayed: engine.week,
    quartersCompleted: engine.history.length,
    finalBudget: engine.budget,
    startBudget: engine.startBudget,
    netProfit,
    quarterNetProfit: engine.history.map((h) => h.netProfit),
    profitable: netProfit > 0 && !engine.bankrupt,
    activityIndex: report.activityIndex,
    axes: Object.fromEntries(
      Object.entries(report.scores).map(([k, v]) => [k, v.score]),
    ),
    archetype: report.archetype,
    avoidableMismatchHint: avoidFlag,
    excessiveReroll: engine.rerollCountThisSession > FREE_REROLLS_PER_SESSION,
    rerollCount: engine.rerollCountThisSession,
    decisions,
    endHints: view.hints,
    retainerPayoutCount: retainerPays.length,
    retainerPayoutTotal,
    firstRetainerPayoutWeek: retainerPays[0]?.week ?? null,
    clientChurnCount: engine.decisionLog.filter((e) => e.eventType === 'client_churn').length,
    maxDomainReputation: Math.max(0, ...Object.values(engine.domainReputation ?? {})),
    maxDomainSalesReputation: Math.max(0, ...Object.values(engine.domainSalesReputation ?? {})),
    maxDomainDeliveryReputation: Math.max(
      0,
      ...Object.values(engine.domainDeliveryReputation ?? {}),
    ),
    weekCombinedDomainRepGte25: domainSeries.weekGte25,
    domainRepByQuarter: domainSeries.byQuarter,
    queuedProjectsAtEnd:
      lastSnap?.eventType === 'week_snapshot' ? lastSnap.payload.queuedProjects : 0,
    inProgressProjectsAtEnd: engine.projects.filter((p) => p.status === 'inprogress').length,
  };
}

function maxMap(map: Partial<Record<DomainId, number>> | undefined): number {
  return Math.max(0, ...Object.values(map ?? {}));
}

function maxCombined(
  sales: Partial<Record<DomainId, number>> | undefined,
  delivery: Partial<Record<DomainId, number>> | undefined,
): number {
  const domains = new Set([
    ...Object.keys(sales ?? {}),
    ...Object.keys(delivery ?? {}),
  ]) as Set<DomainId>;
  let m = 0;
  for (const d of domains) {
    m = Math.max(m, (sales?.[d] ?? 0) + (delivery?.[d] ?? 0));
  }
  return m;
}

function domainReputationSeries(log: DecisionLogEntry[]) {
  const snaps = log.filter((e) => e.eventType === 'week_snapshot');
  let weekGte25: number | null = null;
  for (const e of snaps) {
    if (e.eventType !== 'week_snapshot') continue;
    const combined = maxCombined(
      e.payload.domainSalesReputation,
      e.payload.domainDeliveryReputation,
    );
    if (weekGte25 == null && combined >= 25) weekGte25 = e.payload.week;
  }
  const byQuarter: SessionResult['domainRepByQuarter'] = [];
  for (const q of [1, 2, 3, 4] as const) {
    const atEnd = [...snaps].reverse().find((e) => e.eventType === 'week_snapshot' && e.payload.quarter === q);
    if (!atEnd || atEnd.eventType !== 'week_snapshot') continue;
    byQuarter.push({
      quarter: q,
      week: atEnd.payload.week,
      maxSales: maxMap(atEnd.payload.domainSalesReputation),
      maxDelivery: maxMap(atEnd.payload.domainDeliveryReputation),
      maxCombined: maxCombined(
        atEnd.payload.domainSalesReputation,
        atEnd.payload.domainDeliveryReputation,
      ),
    });
  }
  return { weekGte25, byQuarter };
}

function summarize(results: SessionResult[]) {
  const profits = results.map((r) => r.netProfit).sort((a, b) => a - b);
  const pct = (n: number) => Math.round((n / results.length) * 1000) / 10;
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const quantile = (p: number) => {
    if (!profits.length) return 0;
    const i = (profits.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return profits[lo]!;
    return profits[lo]! * (hi - i) + profits[hi]! * (i - lo);
  };

  const axisKeys = Object.keys(results[0]?.axes ?? {});
  const avgAxes: Record<string, number | null> = {};
  for (const k of axisKeys) {
    const vals = results.map((r) => r.axes[k]).filter((v): v is number => v != null);
    avgAxes[k] = vals.length ? Math.round(mean(vals)) : null;
  }

  const byCompany: Record<string, ReturnType<typeof summarizeSlice>> = {};
  for (const c of new Set(results.map((r) => r.companyType))) {
    byCompany[c] = summarizeSlice(results.filter((r) => r.companyType === c));
  }

  return {
    n: results.length,
    profitablePct: pct(results.filter((r) => r.profitable).length),
    bankruptPct: pct(results.filter((r) => r.bankrupt).length),
    netProfit: {
      mean: Math.round(mean(profits)),
      p10: Math.round(quantile(0.1)),
      p50: Math.round(quantile(0.5)),
      p90: Math.round(quantile(0.9)),
      min: profits[0] ?? 0,
      max: profits[profits.length - 1] ?? 0,
    },
    avgActivityIndex: Math.round(mean(results.map((r) => r.activityIndex)) * 10) / 10,
    avgAxes,
    excessiveRerollPct: pct(results.filter((r) => r.excessiveReroll).length),
    avoidableFlagPct: pct(results.filter((r) => r.avoidableMismatchHint).length),
    byCompany,
    fairnessVerdict: fairnessVerdict(results, mean(profits), pct(results.filter((r) => r.profitable).length)),
  };
}

function summarizeSlice(results: SessionResult[]) {
  const profits = results.map((r) => r.netProfit);
  const mean = profits.length ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
  return {
    n: results.length,
    profitablePct: Math.round((results.filter((r) => r.profitable).length / results.length) * 1000) / 10,
    bankruptPct: Math.round((results.filter((r) => r.bankrupt).length / results.length) * 1000) / 10,
    netProfitMean: Math.round(mean),
  };
}

function fairnessVerdict(results: SessionResult[], meanProfit: number, profitablePct: number) {
  const bankruptPct = results.filter((r) => r.bankrupt).length / results.length;
  // Addendum 06 §4: reasonable play should land near break-even/+ in most runs.
  // Stable deep loss (even without bankruptcy) ⇒ structural economy issue.
  if ((bankruptPct >= 0.5 && meanProfit < -2000) || (meanProfit < -4000 && profitablePct < 20)) {
    return {
      label: 'structural_economy_problem' as const,
      detail:
        'Reasonable play still yields deep average Net Profit loss (and/or frequent bankruptcy) — check salaries, start budget, spawn intervals, deal timing vs quarter length.',
    };
  }
  if (meanProfit >= -1500 && profitablePct >= 35) {
    return {
      label: 'fair_winnable' as const,
      detail:
        'Reasonable play averages near break-even or better with meaningful win rate — expected risk level.',
    };
  }
  if (meanProfit >= -4000 && bankruptPct < 0.45) {
    return {
      label: 'borderline_hard' as const,
      detail:
        'Reasonable play often near zero/small loss without dominant bankruptcy — may be intentional difficulty; watch Product Studio variance.',
    };
  }
  return {
    label: 'needs_investigation' as const,
    detail:
      'Aggregates do not clearly match the fair/winnable table — inspect decision logs for UI confusion vs economy.',
  };
}

async function main() {
  const n = Number(process.env.PLAYTEST_N ?? 24);
  const mode = (process.env.PLAYTEST_AGENT ?? 'reasonable') as 'reasonable' | 'llm';
  const format: SessionFormat =
    process.env.PLAYTEST_FORMAT === 'classical_4q' ? 'classical_4q' : 'rapid_10min';
  const scope = (
    process.env.PLAYTEST_SCOPE === 'trainee'
      ? 'trainee'
      : process.env.PLAYTEST_SCOPE === 'design'
        ? 'design'
        : process.env.PLAYTEST_SCOPE === 'marketing'
          ? 'marketing'
          : 'all'
  ) as 'all' | 'trainee' | 'design' | 'marketing';
  const plans = planBatch(n, scope);

  const agentFactory =
    mode === 'llm'
      ? (seed: number) => createLlmAgent({ repoRoot: REPO_ROOT, seed })
      : (seed: number) => createReasonableAgent(seed);

  console.log(
    `Running ${plans.length} sessions agent=${mode} format=${format} scope=${scope}…`,
  );
  const results: SessionResult[] = [];
  for (const plan of plans) {
    const r = await runSession(plan, agentFactory, format);
    results.push(r);
    const tag = r.bankrupt ? 'BANKRUPT' : r.profitable ? 'PROFIT' : 'FLAT/LOSS';
    const q = r.quarterNetProfit.map((x) => Math.round(x)).join(',');
    console.log(
      `  ${r.id}: ${tag} cum=${r.netProfit} Q=[${q}] weeks=${r.weeksPlayed} activity=${r.activityIndex}`,
    );
  }

  const summary = summarize(results);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(REPO_ROOT, 'playtest-results');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `batch-${mode}-${stamp}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          createdAt: new Date().toISOString(),
          agentMode: mode,
          n: plans.length,
          format,
          scope,
          note: 'Deterministic engine+agent seeds via sessionSeedFor(); isolated and unified share per-type seed ranges.',
        },
        summary,
        sessions: results,
      },
      null,
      2,
    ),
  );

  console.log('\n=== BATCH SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
