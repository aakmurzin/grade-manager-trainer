/**
 * Addendum 28 — Track 1 (retainer assignment) + Track 2 (Design split domainRep).
 * Usage:
 *   npx tsx scripts/playtest/analyze-addendum-28.ts \
 *     [design-batch.json] [a22-design.json] [a27-design.json] [a27-marketing.json]
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
};

type DomainRepQ = {
  quarter: number;
  week: number;
  maxSales: number;
  maxDelivery: number;
  maxCombined: number;
};

type Session = {
  id: string;
  bankrupt: boolean;
  weeksPlayed: number;
  netProfit: number;
  quarterNetProfit: number[];
  maxDomainReputation?: number;
  maxDomainSalesReputation?: number;
  maxDomainDeliveryReputation?: number;
  weekCombinedDomainRepGte25?: number | null;
  domainRepByQuarter?: DomainRepQ[];
  queuedProjectsAtEnd?: number;
  inProgressProjectsAtEnd?: number;
  decisions: Decision[];
};

type Batch = { sessions: Session[] };

function load(name: string): Batch {
  const p = name.startsWith('/') ? name : join(RESULTS, name);
  return JSON.parse(readFileSync(p, 'utf8')) as Batch;
}

function actionType(d: Decision): string {
  try {
    return (JSON.parse(d.action) as { type?: string }).type ?? '';
  } catch {
    return '';
  }
}

function hireRole(rationale: string): string {
  const r = rationale.toLowerCase();
  if (r.includes('marketer')) return 'marketer';
  if (r.includes('lead gen')) return 'lead_gen';
  if (r.includes('hire sales') || r.includes('sales ')) return 'sales';
  if (r.includes('hire designer') || r.includes('hire dev') || r.includes('designer')) {
    return 'delivery';
  }
  return 'other';
}

function mean(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}
function quantile(arr: number[], p: number): number | null {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const i = (a.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return a[lo]!;
  return a[lo]! * (hi - i) + a[hi]! * (i - lo);
}
const r0 = (n: number | null) => (n == null ? null : Math.round(n));
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

function forceCounts(s: Session) {
  let forcedLead = 0;
  let forcedProject = 0;
  let skip = 0;
  let q1ForcedLead = 0;
  let q1Skip = 0;
  let q1ForcedProject = 0;
  const hires: Record<string, number> = {};
  for (const d of s.decisions) {
    const t = actionType(d);
    const rat = (d.rationale || '').toLowerCase();
    const q1 = d.week <= 12;
    if (t === 'skip_lead') {
      skip += 1;
      if (q1) q1Skip += 1;
    }
    if (t === 'assign_lead' && d.success && rat.includes('forced mismatch')) {
      forcedLead += 1;
      if (q1) q1ForcedLead += 1;
    }
    if (t === 'assign_project' && d.success && rat.includes('forced mismatch')) {
      forcedProject += 1;
      if (q1) q1ForcedProject += 1;
    }
    if (t === 'hire' && d.success) {
      const role = hireRole(d.rationale);
      hires[role] = (hires[role] ?? 0) + 1;
    }
  }
  return { forcedLead, forcedProject, skip, q1ForcedLead, q1Skip, q1ForcedProject, hires };
}

function deathQuarter(s: Session): number | null {
  if (!s.bankrupt) return null;
  return Math.min(4, Math.max(1, Math.ceil(s.weeksPlayed / 12)));
}

function designRow(s: Session) {
  const qs = s.quarterNetProfit ?? [];
  const cum = qs.reduce((a, b) => a + b, 0);
  const fc = forceCounts(s);
  const byQ = s.domainRepByQuarter ?? [];
  return {
    id: s.id,
    bankrupt: s.bankrupt,
    weeks: s.weeksPlayed,
    deathQuarter: deathQuarter(s),
    q1: qs[0] ?? null,
    q2: qs[1] ?? null,
    q3: qs[2] ?? null,
    q4: qs[3] ?? null,
    cum: Math.round(cum),
    maxCombined: s.maxDomainReputation ?? null,
    maxSales: s.maxDomainSalesReputation ?? null,
    maxDelivery: s.maxDomainDeliveryReputation ?? null,
    weekGte25: s.weekCombinedDomainRepGte25 ?? null,
    salesShare:
      s.maxDomainSalesReputation != null && s.maxDomainReputation
        ? Math.round((100 * s.maxDomainSalesReputation) / Math.max(1, s.maxDomainReputation))
        : null,
    byQuarter: byQ,
    q1ForcedLead: fc.q1ForcedLead,
    q1ForcedProject: fc.q1ForcedProject,
    q1Skip: fc.q1Skip,
    forcedLead: fc.forcedLead,
    forcedProject: fc.forcedProject,
    hireDelivery: fc.hires.delivery ?? 0,
    hireSales: fc.hires.sales ?? 0,
  };
}

function split(rows: ReturnType<typeof designRow>[]) {
  return {
    bankrupt: rows.filter((r) => r.bankrupt),
    alive: rows.filter((r) => !r.bankrupt),
  };
}

function summarizeDesign(label: string, sessions: Session[]) {
  const rows = sessions.map(designRow);
  const { bankrupt, alive } = split(rows);
  const cums = rows.map((r) => r.cum);
  const weekGte = rows.map((r) => r.weekGte25).filter((w): w is number => w != null);
  const q1Sales = rows
    .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxSales)
    .filter((n): n is number => n != null);
  const q1Delivery = rows
    .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxDelivery)
    .filter((n): n is number => n != null);
  const q1Combined = rows
    .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxCombined)
    .filter((n): n is number => n != null);
  const deaths = bankrupt.map((r) => r.deathQuarter).filter((q): q is number => q != null);
  return {
    label,
    n: rows.length,
    bankrupt: bankrupt.length,
    bankruptPct: r1((100 * bankrupt.length) / rows.length),
    cumPositive: rows.filter((r) => r.cum > 0).length,
    netProfit: {
      mean: r0(mean(cums)),
      p50: r0(quantile(cums, 0.5)),
      min: cums.length ? Math.min(...cums) : null,
      max: cums.length ? Math.max(...cums) : null,
    },
    deathQuarters: deaths,
    deathQuarterDist: {
      q1: deaths.filter((q) => q === 1).length,
      q2: deaths.filter((q) => q === 2).length,
      q3: deaths.filter((q) => q === 3).length,
      q4: deaths.filter((q) => q === 4).length,
    },
    q1Np: {
      all: r0(mean(rows.map((r) => r.q1).filter((n): n is number => n != null))),
      bankrupt: r0(mean(bankrupt.map((r) => r.q1).filter((n): n is number => n != null))),
      alive: r0(mean(alive.map((r) => r.q1).filter((n): n is number => n != null))),
    },
    domainRep: {
      weekGte25: {
        n: weekGte.length,
        median: r1(quantile(weekGte, 0.5)),
        mean: r1(mean(weekGte)),
        min: weekGte.length ? Math.min(...weekGte) : null,
        max: weekGte.length ? Math.max(...weekGte) : null,
        inQ1: weekGte.filter((w) => w <= 12).length,
      },
      q1: {
        sales: { mean: r1(mean(q1Sales)), median: r1(quantile(q1Sales, 0.5)) },
        delivery: { mean: r1(mean(q1Delivery)), median: r1(quantile(q1Delivery, 0.5)) },
        combined: { mean: r1(mean(q1Combined)), median: r1(quantile(q1Combined, 0.5)), gte25: q1Combined.filter((n) => n >= 25).length },
      },
      bankruptVsAlive: {
        q1CombinedBankrupt: r1(
          mean(
            bankrupt
              .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxCombined)
              .filter((n): n is number => n != null),
          ),
        ),
        q1CombinedAlive: r1(
          mean(
            alive
              .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxCombined)
              .filter((n): n is number => n != null),
          ),
        ),
        q1SalesBankrupt: r1(
          mean(
            bankrupt
              .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxSales)
              .filter((n): n is number => n != null),
          ),
        ),
        q1SalesAlive: r1(
          mean(
            alive
              .map((r) => r.byQuarter.find((q) => q.quarter === 1)?.maxSales)
              .filter((n): n is number => n != null),
          ),
        ),
      },
    },
    forceAssign: {
      q1ForcedLead: {
        all: r1(mean(rows.map((r) => r.q1ForcedLead))),
        bankrupt: r1(mean(bankrupt.map((r) => r.q1ForcedLead))),
        alive: r1(mean(alive.map((r) => r.q1ForcedLead))),
      },
      q1ForcedProject: {
        all: r1(mean(rows.map((r) => r.q1ForcedProject))),
        bankrupt: r1(mean(bankrupt.map((r) => r.q1ForcedProject))),
        alive: r1(mean(alive.map((r) => r.q1ForcedProject))),
      },
      q1Skip: r1(mean(rows.map((r) => r.q1Skip))),
    },
    rows: [...rows].sort((a, b) => b.cum - a.cum),
  };
}

function marketingQueue(sessions: Session[]) {
  return sessions.map((s) => {
    const fc = forceCounts(s);
    let q1Leads = 0;
    let q1Projects = 0;
    for (const d of s.decisions) {
      if (d.week > 12) continue;
      const t = actionType(d);
      if (t === 'assign_lead' && d.success) q1Leads += 1;
      if (t === 'assign_project' && d.success) q1Projects += 1;
    }
    return {
      id: s.id,
      weeks: s.weeksPlayed,
      maxDR: s.maxDomainReputation ?? 0,
      closesEst: Math.floor((s.maxDomainReputation ?? 0) / 5),
      q1Leads,
      q1Projects,
      hireDelivery: fc.hires.delivery ?? 0,
      hireMarketer: fc.hires.marketer ?? 0,
      hireSales: fc.hires.sales ?? 0,
      q1Skip: fc.q1Skip,
    };
  });
}

function main() {
  const designName = process.argv[2] ?? 'batch-addendum-28-classical-design.json';
  const a22 = load(process.argv[3] ?? 'batch-addendum-22-classical-design.json');
  const a27 = load(process.argv[4] ?? 'batch-addendum-27-classical-design.json');
  const mkt = load(process.argv[5] ?? 'batch-addendum-27-marketing-classical.json');
  const design = load(designName);

  const report = {
    track1_marketing: {
      architecture:
        'Retainer payout/progress/churn require inprogress + assigned delivery employee. Delivery role for Marketing is Dev, not Marketer. Queued closed retainers do not pay at EOQ.',
      a27_queue: marketingQueue(mkt.sessions),
      hire_means: {
        delivery: r1(mean(marketingQueue(mkt.sessions).map((r) => r.hireDelivery))),
        marketer: r1(mean(marketingQueue(mkt.sessions).map((r) => r.hireMarketer))),
        sales: r1(mean(marketingQueue(mkt.sessions).map((r) => r.hireSales))),
      },
    },
    track2_design: {
      a22: summarizeDesign('a22_freeze', a22.sessions),
      a27: summarizeDesign('a27_flat_counter', a27.sessions),
      a28: summarizeDesign('a28_split_counters', design.sessions),
    },
  };

  const out = join(RESULTS, 'addendum-28-diagnosis.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('Wrote', out);
}

main();
