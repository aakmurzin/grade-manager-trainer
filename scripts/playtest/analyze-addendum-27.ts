/**
 * Addendum 27 — domainReputation on successful close.
 * Usage:
 *   npx tsx scripts/playtest/analyze-addendum-27.ts \
 *     playtest-results/batch-addendum-27-marketing-classical.json \
 *     playtest-results/batch-addendum-27-classical-design.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../..');
const RESULTS = join(REPO, 'playtest-results');

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
  bankrupt: boolean;
  startBudget: number;
  netProfit: number;
  weeksPlayed: number;
  quarterNetProfit: number[];
  maxDomainReputation?: number;
  decisions: Decision[];
};

type Batch = { sessions: Session[] };

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
  return 'other';
}

function load(name: string): Batch {
  const p = name.startsWith('/') ? name : join(RESULTS, name);
  return JSON.parse(readFileSync(p, 'utf8')) as Batch;
}

function funnel(sessions: Session[]) {
  let leads = 0;
  let projects = 0;
  let skips = 0;
  const q1Leads: number[] = [];
  const q1Projects: number[] = [];
  const q1Skips: number[] = [];
  const marketer: number[] = [];
  for (const s of sessions) {
    let l = 0;
    let p = 0;
    let k = 0;
    let m = 0;
    for (const d of s.decisions) {
      if (d.week > 12) continue;
      const t = actionType(d);
      if (t === 'assign_lead' && d.success) l += 1;
      if (t === 'assign_project' && d.success) p += 1;
      if (t === 'skip_lead') k += 1;
      if (t === 'hire' && d.success && hireRole(d.rationale) === 'marketer') m += 1;
    }
    leads += l;
    projects += p;
    skips += k;
    q1Leads.push(l);
    q1Projects.push(p);
    q1Skips.push(k);
    marketer.push(m);
  }
  return {
    q1_assign_lead_sum: leads,
    q1_assign_project_sum: projects,
    q1_skip_sum: skips,
    conversion: leads ? r2(projects / leads) : null,
    conversion_label: leads ? `${projects}/${leads} (${Math.round((100 * projects) / leads)}%)` : 'n/a',
    q1_leads: { mean: r1(mean(q1Leads)), median: r1(quantile(q1Leads, 0.5)), dist: q1Leads },
    q1_projects: { mean: r1(mean(q1Projects)), median: r1(quantile(q1Projects, 0.5)), dist: q1Projects },
    q1_skips: { mean: r1(mean(q1Skips)), median: r1(quantile(q1Skips, 0.5)) },
    marketer_hires_total: marketer.reduce((a, b) => a + b, 0),
    sessions_hired_marketer: marketer.filter((n) => n > 0).length,
  };
}

function domainRep(sessions: Session[]) {
  const vals = sessions.map((s) => s.maxDomainReputation ?? 0);
  return {
    dist: vals,
    mean: r1(mean(vals)),
    median: r1(quantile(vals, 0.5)),
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
    gte25: vals.filter((v) => v >= 25).length,
    gte25_share: `${vals.filter((v) => v >= 25).length}/${vals.length}`,
  };
}

function designBaseline(sessions: Session[]) {
  const rows = sessions.map((s) => {
    const qs = s.quarterNetProfit ?? [];
    const cum = qs.reduce((a, b) => a + b, 0);
    return {
      id: s.id,
      bankrupt: s.bankrupt,
      q1: qs[0] ?? null,
      q2: qs[1] ?? null,
      q3: qs[2] ?? null,
      q4: qs[3] ?? null,
      cum: Math.round(cum),
    };
  });
  const cums = [...rows.map((r) => r.cum)].sort((a, b) => a - b);
  const poc = [...rows].sort((a, b) => b.cum - a.cum)[0];
  return {
    n: rows.length,
    bankrupt: sessions.filter((s) => s.bankrupt).length,
    bankruptPct: r1((100 * sessions.filter((s) => s.bankrupt).length) / sessions.length),
    cum_positive: rows.filter((r) => r.cum > 0).length,
    netProfit: {
      mean: r0(mean(cums)),
      p10: r0(quantile(cums, 0.1)),
      p50: r0(quantile(cums, 0.5)),
      p90: r0(quantile(cums, 0.9)),
      min: cums[0] ?? null,
      max: cums[cums.length - 1] ?? null,
    },
    proof_of_concept: poc
      ? {
          id: poc.id,
          cum: poc.cum,
          q1: poc.q1,
          q2: poc.q2,
          q3: poc.q3,
          q4: poc.q4,
          shape_q1_neg_then_pos: (poc.q1 ?? 0) < 0 && (poc.q2 ?? 0) > 0 && (poc.q3 ?? 0) > 0 && (poc.q4 ?? 0) > 0,
        }
      : null,
    maxDomainReputation: domainRep(sessions),
    rows: [...rows].sort((a, b) => b.cum - a.cum),
  };
}

function main() {
  const mktName = process.argv[2] ?? 'batch-addendum-27-marketing-classical.json';
  const desName = process.argv[3] ?? 'batch-addendum-27-classical-design.json';
  const mkt = load(mktName);
  const a26 = load('batch-addendum-26-marketing-classical.json');
  const a24 = load('batch-addendum-24-marketing-classical.json');
  const des = load(desName);
  const a22 = load('batch-addendum-22-classical-design.json');

  const report = {
    marketing: {
      a24: { funnel: funnel(a24.sessions), domainRep: domainRep(a24.sessions), bankrupt: a24.sessions.filter((s) => s.bankrupt).length },
      a26: { funnel: funnel(a26.sessions), domainRep: domainRep(a26.sessions), bankrupt: a26.sessions.filter((s) => s.bankrupt).length },
      a27: { funnel: funnel(mkt.sessions), domainRep: domainRep(mkt.sessions), bankrupt: mkt.sessions.filter((s) => s.bankrupt).length },
    },
    design: {
      a22_frozen: designBaseline(a22.sessions),
      a27: designBaseline(des.sessions),
    },
  };

  const out = join(RESULTS, 'addendum-27-comparison.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('Wrote', out);
}

main();
