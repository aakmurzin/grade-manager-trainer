#!/usr/bin/env npx tsx
/**
 * Addendum 07 — reconstruct economy timing metrics from addendum-06 playtest JSON.
 * Does not change balance. Usage:
 *   npx tsx scripts/playtest/analyze-addendum-07.ts [path-to-batch.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../..');
const DEFAULT = join(
  REPO,
  'playtest-results/batch-reasonable-2026-08-16T21-10-17-183Z.json',
);

type Decision = {
  week: number;
  action: string;
  success: boolean;
  budget: number;
};

type Session = {
  id: string;
  companyType: string;
  startBudget: number;
  finalBudget: number;
  netProfit: number;
  decisions: Decision[];
};

function quantile(arr: number[], p: number): number | null {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const i = (a.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return a[lo]!;
  return a[lo]! * (hi - i) + a[hi]! * (i - lo);
}

function mean(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

const r0 = (n: number | null) => (n == null ? null : Math.round(n));
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
const r2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

function analyzeSession(s: Session) {
  let prev = s.startBudget;
  let wHire: number | null = null;
  let wAssignLead: number | null = null;
  let wAssignProject: number | null = null;
  let wFirstRevenue: number | null = null;
  let budgetBeforeFirstRevenue: number | null = null;
  let qSal = 0;
  let hireOnly = 0;
  let R_pos = 0;

  for (const d of s.decisions) {
    const a = JSON.parse(d.action) as { type: string };
    const delta = d.budget - prev;
    if (a.type === 'hire' && d.success && delta < 0) {
      if (wHire == null) wHire = d.week;
      qSal += -delta;
      hireOnly += -delta;
    } else if (a.type === 'give_bonus' && d.success && delta < 0) {
      qSal += -delta;
    } else if (a.type === 'assign_lead' && d.success && wAssignLead == null) {
      wAssignLead = d.week;
    } else if (a.type === 'assign_project' && d.success && wAssignProject == null) {
      wAssignProject = d.week;
    } else if (a.type === 'tick_week' && delta > 0) {
      R_pos += delta;
      if (wFirstRevenue == null) {
        wFirstRevenue = d.week;
        budgetBeforeFirstRevenue = prev;
      }
    }
    prev = d.budget;
  }

  // S = in-quarter salary cash (hire first pays + bonuses) + EOQ recurring ≈ hire pays again
  const S = qSal + hireOnly;
  const R = Math.max(0, s.netProfit + 1.15 * S);

  return {
    id: s.id,
    companyType: s.companyType,
    netProfit: s.netProfit,
    wHire,
    wAssignLead,
    wCloseProxy: wAssignProject,
    wFirstRevenue,
    capitalDrawdown:
      budgetBeforeFirstRevenue != null ? s.startBudget - budgetBeforeFirstRevenue : null,
    S: Math.round(S),
    R: Math.round(R),
    R_pos: Math.round(R_pos),
    ratio_cash_in: R_pos > 0 ? S / R : null,
    lags: {
      hire_to_assign:
        wHire != null && wAssignLead != null ? wAssignLead - wHire : null,
      assign_to_project:
        wAssignLead != null && wAssignProject != null
          ? wAssignProject - wAssignLead
          : null,
      post_close_queue:
        wAssignLead != null && wAssignProject != null
          ? Math.max(0, wAssignProject - wAssignLead - 2)
          : null,
      project_to_revenue:
        wAssignProject != null && wFirstRevenue != null
          ? wFirstRevenue - wAssignProject
          : null,
    },
  };
}

function lagStat(rows: ReturnType<typeof analyzeSession>[], key: keyof ReturnType<typeof analyzeSession>['lags']) {
  const v = rows.map((r) => r.lags[key]).filter((x): x is number => x != null);
  return { n: v.length, mean: r1(mean(v)), median: r1(quantile(v, 0.5)) };
}

function main() {
  const src = process.argv[2] ?? DEFAULT;
  const batch = JSON.parse(readFileSync(src, 'utf8')) as {
    meta: unknown;
    sessions: Session[];
  };
  const rows = batch.sessions.map(analyzeSession);
  const withRev = rows.filter((r) => r.wFirstRevenue != null);
  const cashRatios = rows
    .map((r) => r.ratio_cash_in)
    .filter((x): x is number => x != null);
  const weeks = withRev.map((r) => r.wFirstRevenue!);
  const weeksCensor = rows.map((r) => r.wFirstRevenue ?? 13);
  const caps = withRev
    .map((r) => r.capitalDrawdown)
    .filter((x): x is number => x != null);
  const sumS = rows.reduce((s, r) => s + r.S, 0);
  const sumR = rows.reduce((s, r) => s + r.R, 0);
  const sumRpos = rows.reduce((s, r) => s + r.R_pos, 0);

  const report = {
    source: src,
    batchMeta: batch.meta,
    methodology: {
      note: 'Reconstructed from agent decision budgets + netProfit (engine decisionLog not in addendum-06 JSON).',
      m1: 'First tick_week where budget increases (visible $ in). No-revenue → excluded from earner stats; censor-13 = treat as week 13.',
      m2: 'S = hire+bonus deltas + recurring_est(=hire deltas). R = netProfit + 1.15*S. Primary median = S/R among sessions with R_pos>0. Pooled = sumS/sumR.',
      m3: 'Close week not logged; proxy = first assign_project. Sales duration fixed 2w in engine.',
      m4: 'startBudget − budget immediately before first revenue tick.',
    },
    metric1_weeks_to_first_revenue: {
      sessions_with_no_budget_uptick_Q1: rows.length - withRev.length,
      among_earners_n: withRev.length,
      median: r1(quantile(weeks, 0.5)),
      mean: r1(mean(weeks)),
      p10: r1(quantile(weeks, 0.1)),
      p90: r1(quantile(weeks, 0.9)),
      distribution: [...weeks].sort((a, b) => a - b),
      median_all_sessions_censor_week13: r1(quantile(weeksCensor, 0.5)),
      mean_all_sessions_censor_week13: r1(mean(weeksCensor)),
    },
    metric2_salary_over_revenue: {
      sessions_with_no_cash_in: rows.length - cashRatios.length,
      median_among_cash_in: r2(quantile(cashRatios, 0.5)),
      mean_among_cash_in: r2(mean(cashRatios)),
      p10: r2(quantile(cashRatios, 0.1)),
      p90: r2(quantile(cashRatios, 0.9)),
      batch_pooled_sumS_over_sumR: r2(sumS / Math.max(1, sumR)),
      batch_pooled_sumS_over_sumR_pos: r2(sumS / Math.max(1, sumRpos)),
      sumS: r0(sumS),
      sumR: r0(sumR),
      sumR_pos: r0(sumRpos),
    },
    metric3_funnel_lags_weeks: {
      hire_to_first_assign_lead: lagStat(rows, 'hire_to_assign'),
      assign_lead_to_first_assign_project: lagStat(rows, 'assign_to_project'),
      of_which_fixed_sales_close_weeks: 2,
      of_which_post_close_queue_or_mismatch: lagStat(rows, 'post_close_queue'),
      assign_project_to_first_revenue: lagStat(rows, 'project_to_revenue'),
    },
    metric4_capital_drawdown_before_first_revenue: {
      n: caps.length,
      median: r0(quantile(caps, 0.5)),
      mean: r0(mean(caps)),
      p10: r0(quantile(caps, 0.1)),
      p90: r0(quantile(caps, 0.9)),
      min: caps.length ? r0(Math.min(...caps)) : null,
      max: caps.length ? r0(Math.max(...caps)) : null,
    },
    metric5_by_company: {} as Record<string, unknown>,
  };

  for (const ct of [
    'design_agency',
    'product_studio',
    'it_outsourcing',
    'marketing_agency',
  ]) {
    const sub = rows.filter((r) => r.companyType === ct);
    const wr = sub.filter((r) => r.wFirstRevenue != null);
    const ratios = sub
      .map((r) => r.ratio_cash_in)
      .filter((x): x is number => x != null);
    const w = wr.map((r) => r.wFirstRevenue!);
    const c = wr
      .map((r) => r.capitalDrawdown)
      .filter((x): x is number => x != null);
    const sS = sub.reduce((a, r) => a + r.S, 0);
    const sR = sub.reduce((a, r) => a + r.R, 0);
    report.metric5_by_company[ct] = {
      n: sub.length,
      no_budget_uptick: sub.length - wr.length,
      weeks_to_revenue: {
        median: r1(quantile(w, 0.5)),
        mean: r1(mean(w)),
        dist: [...w].sort((a, b) => a - b),
        median_censor13: r1(
          quantile(
            sub.map((r) => r.wFirstRevenue ?? 13),
            0.5,
          ),
        ),
      },
      salary_over_revenue: {
        median_cash_in: r2(quantile(ratios, 0.5)),
        batch_pooled: sR > 0 ? r2(sS / sR) : null,
        sumS: r0(sS),
        sumR: r0(sR),
      },
      capital_drawdown: { median: r0(quantile(c, 0.5)), mean: r0(mean(c)) },
      funnel: {
        hire_to_assign: lagStat(sub, 'hire_to_assign'),
        assign_to_project: lagStat(sub, 'assign_to_project'),
        post_close_queue: lagStat(sub, 'post_close_queue'),
        project_to_revenue: lagStat(sub, 'project_to_revenue'),
      },
    };
  }

  const out = join(REPO, 'playtest-results/addendum-07-summary.json');
  writeFileSync(out, JSON.stringify({ report, sessions: rows }, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${out}`);
}

main();
