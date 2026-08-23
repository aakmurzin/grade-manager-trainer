/**
 * Addendum 25 — Marketing Director Classical diagnosis (addendum-07 metrics).
 * No balance changes. Usage:
 *   npx tsx scripts/playtest/analyze-addendum-25.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../..');
const SRC = join(REPO, 'playtest-results/batch-addendum-24-marketing-classical.json');

type Decision = {
  week: number;
  quarter: number;
  action: string;
  rationale: string;
  success: boolean;
  budget: number;
};

type Session = {
  id: string;
  startBudget: number;
  netProfit: number;
  weeksPlayed: number;
  quarterNetProfit: number[];
  retainerPayoutCount?: number;
  retainerPayoutTotal?: number;
  firstRetainerPayoutWeek?: number | null;
  clientChurnCount?: number;
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

function actionType(d: Decision): string {
  try {
    return (JSON.parse(d.action) as { type?: string }).type ?? '';
  } catch {
    return '';
  }
}

function hireRole(rationale: string): string {
  const r = rationale.toLowerCase();
  if (r.includes('hire sales') || r.includes('sales ')) return 'sales';
  if (r.includes('lead gen')) return 'lead_gen';
  if (r.includes('marketer')) return 'marketer';
  if (r.includes('hire dev') || r.includes('hire designer')) return 'delivery';
  if (r.includes('accountant')) return 'accountant';
  if (r.includes('recruiter')) return 'recruiter';
  if (r.includes('team lead')) return 'team_lead';
  if (r.includes(' hr')) return 'hr';
  return 'other';
}

function analyzeSession(s: Session) {
  let prev = s.startBudget;
  let wHire: number | null = null;
  let wAssignLead: number | null = null;
  let wAssignProject: number | null = null;
  let wFirstRevenue: number | null = s.firstRetainerPayoutWeek ?? null;
  let budgetBeforeFirstPayout: number | null = null;
  let q1HireCash = 0;
  let q1Bonus = 0;
  let q1LeadAssign = 0;
  let q1LeadSkip = 0;
  let q1ProjectAssign = 0;
  const q1Hires: Record<string, number> = {};
  const hires: { week: number; role: string; cash: number; rationale: string }[] = [];

  for (const d of s.decisions) {
    const t = actionType(d);
    const delta = d.budget - prev;
    const q1 = d.week <= 12;

    if (t === 'hire' && d.success) {
      if (wHire == null) wHire = d.week;
      const role = hireRole(d.rationale);
      const cash = delta < 0 ? -delta : 0;
      hires.push({ week: d.week, role, cash, rationale: d.rationale.slice(0, 80) });
      if (q1) {
        q1Hires[role] = (q1Hires[role] ?? 0) + 1;
        q1HireCash += cash;
      }
    } else if (t === 'give_bonus' && d.success && q1 && delta < 0) {
      q1Bonus += -delta;
    } else if (t === 'assign_lead' && d.success) {
      if (wAssignLead == null) wAssignLead = d.week;
      if (q1) q1LeadAssign += 1;
    } else if (t === 'skip_lead' && q1) {
      q1LeadSkip += 1;
    } else if (t === 'assign_project' && d.success) {
      if (wAssignProject == null) wAssignProject = d.week;
      if (q1) q1ProjectAssign += 1;
    }

    if (
      wFirstRevenue != null &&
      budgetBeforeFirstPayout == null &&
      d.week >= wFirstRevenue &&
      t === 'tick_week'
    ) {
      budgetBeforeFirstPayout = prev;
    }
    prev = d.budget;
  }

  const S_q1 = q1HireCash + q1Bonus + q1HireCash;
  const np1 = s.quarterNetProfit[0] ?? s.netProfit;
  const R_fromNp = np1 + 1.15 * S_q1;
  const R_payoutQ1 =
    s.weeksPlayed <= 12 ? (s.retainerPayoutTotal ?? 0) : null;

  return {
    id: s.id,
    weeks: s.weeksPlayed,
    startBudget: s.startBudget,
    np1: Math.round(np1),
    wHire,
    wAssignLead,
    wAssignProject,
    wFirstPayout: wFirstRevenue,
    capitalDrawdown:
      budgetBeforeFirstPayout != null ? s.startBudget - budgetBeforeFirstPayout : null,
    S_q1: Math.round(S_q1),
    R_fromNp: Math.round(R_fromNp),
    R_payoutLogged: s.retainerPayoutTotal ?? 0,
    R_payoutQ1,
    ratio_S_over_R: R_fromNp > 0 ? S_q1 / R_fromNp : null,
    q1LeadAssign,
    q1LeadSkip,
    q1ProjectAssign,
    q1Hires,
    hires,
    payouts: s.retainerPayoutCount ?? 0,
    lags: {
      hire_to_assign_lead:
        wHire != null && wAssignLead != null ? wAssignLead - wHire : null,
      assign_lead_to_project:
        wAssignLead != null && wAssignProject != null ? wAssignProject - wAssignLead : null,
      post_close_queue:
        wAssignLead != null && wAssignProject != null
          ? Math.max(0, wAssignProject - wAssignLead - 2)
          : null,
      project_to_payout:
        wAssignProject != null && wFirstRevenue != null ? wFirstRevenue - wAssignProject : null,
    },
  };
}

function lagStat(rows: ReturnType<typeof analyzeSession>[], key: keyof ReturnType<typeof analyzeSession>['lags']) {
  const v = rows.map((r) => r.lags[key]).filter((x): x is number => x != null);
  return { n: v.length, mean: r1(mean(v)), median: r1(quantile(v, 0.5)), dist: [...v].sort((a, b) => a - b) };
}

function main() {
  const batch = JSON.parse(readFileSync(SRC, 'utf8')) as { sessions: Session[] };
  const rows = batch.sessions.map(analyzeSession);
  const payoutWeeks = rows.map((r) => r.wFirstPayout).filter((w): w is number => w != null);
  const ratios = rows.map((r) => r.ratio_S_over_R).filter((x): x is number => x != null && Number.isFinite(x));
  const caps = rows.map((r) => r.capitalDrawdown).filter((x): x is number => x != null);
  const sumS = rows.reduce((s, r) => s + r.S_q1, 0);
  const sumR = rows.reduce((s, r) => s + Math.max(0, r.R_fromNp), 0);
  const sumRpay = rows.reduce((s, r) => s + (r.R_payoutQ1 ?? 0), 0);

  const roleKeys = ['sales', 'delivery', 'lead_gen', 'marketer', 'accountant', 'other'] as const;
  const hireMeans = Object.fromEntries(
    roleKeys.map((k) => [
      k,
      r1(mean(rows.map((r) => r.q1Hires[k] ?? 0))),
    ]),
  );

  const report = {
    source: 'batch-addendum-24-marketing-classical.json',
    n: rows.length,
    methodology: {
      m1: 'Engine firstRetainerPayoutWeek (not budget uptick — EOQ payroll often swallows the check).',
      m2: 'S_q1 = hire cash in w1–12 ×2 (first paycheck + EOQ recurring est) + bonuses. R = Q1 NP + 1.15·S. Also log engine payout totals.',
      m3: 'Hire / assign_lead / assign_project from agent log; payout week from engine. Sales close is 2w.',
      m4: 'startBudget − budget immediately before the tick_week of first payout.',
      m5: 'Q1 hire counts from agent rationale.',
    },
    metric1_weeks_to_first_payout: {
      sessions_with_payout: payoutWeeks.length,
      median: r1(quantile(payoutWeeks, 0.5)),
      mean: r1(mean(payoutWeeks)),
      p10: r1(quantile(payoutWeeks, 0.1)),
      p90: r1(quantile(payoutWeeks, 0.9)),
      distribution: [...payoutWeeks].sort((a, b) => a - b),
    },
    metric2_salary_over_revenue_Q1: {
      median: r2(quantile(ratios, 0.5)),
      mean: r2(mean(ratios)),
      p10: r2(quantile(ratios, 0.1)),
      p90: r2(quantile(ratios, 0.9)),
      pooled_sumS_over_sumR: r2(sumS / Math.max(1, sumR)),
      sumS_q1: r0(sumS),
      sumR_fromNp: r0(sumR),
      sumR_enginePayout_Q1die: r0(sumRpay),
      n_died_in_Q1: rows.filter((r) => r.weeks <= 12).length,
    },
    metric3_funnel_lags_weeks: {
      hire_to_assign_lead: lagStat(rows, 'hire_to_assign_lead'),
      assign_lead_to_project: lagStat(rows, 'assign_lead_to_project'),
      post_close_queue_after_2w_close: lagStat(rows, 'post_close_queue'),
      project_to_first_payout: lagStat(rows, 'project_to_payout'),
      q1_assign_lead_per_session: {
        mean: r1(mean(rows.map((r) => r.q1LeadAssign))),
        median: r1(quantile(rows.map((r) => r.q1LeadAssign), 0.5)),
        dist: rows.map((r) => r.q1LeadAssign),
      },
      q1_skip_lead_per_session: {
        mean: r1(mean(rows.map((r) => r.q1LeadSkip))),
        median: r1(quantile(rows.map((r) => r.q1LeadSkip), 0.5)),
      },
      q1_assign_project_per_session: {
        mean: r1(mean(rows.map((r) => r.q1ProjectAssign))),
        median: r1(quantile(rows.map((r) => r.q1ProjectAssign), 0.5)),
        dist: rows.map((r) => r.q1ProjectAssign),
      },
    },
    metric4_capital_to_first_payout: {
      n: caps.length,
      median: r0(quantile(caps, 0.5)),
      mean: r0(mean(caps)),
      p10: r0(quantile(caps, 0.1)),
      p90: r0(quantile(caps, 0.9)),
      min: caps.length ? Math.min(...caps) : null,
      max: caps.length ? Math.max(...caps) : null,
    },
    metric5_q1_hires: {
      mean_by_role: hireMeans,
      mean_headcount_hired: r1(mean(rows.map((r) => Object.values(r.q1Hires).reduce((a, b) => a + b, 0)))),
      sessions: rows.map((r) => ({ id: r.id, hires: r.q1Hires, cash: r.S_q1 / 2 })),
    },
    rows: rows.map((r) => ({
      id: r.id,
      weeks: r.weeks,
      np1: r.np1,
      wHire: r.wHire,
      wLead: r.wAssignLead,
      wProj: r.wAssignProject,
      wPay: r.wFirstPayout,
      S: r.S_q1,
      R: r.R_fromNp,
      ratio: r.ratio_S_over_R != null ? r2(r.ratio_S_over_R) : null,
      cap: r.capitalDrawdown,
      leads: r.q1LeadAssign,
      skips: r.q1LeadSkip,
      projects: r.q1ProjectAssign,
      payouts: r.payouts,
      hires: r.q1Hires,
    })),
  };

  const out = join(REPO, 'playtest-results/addendum-25-marketing-diagnosis.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('Wrote', out);
}

main();
