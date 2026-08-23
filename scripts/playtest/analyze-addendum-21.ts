/**
 * Compare Addendum 21: spawn 0.75w only vs spawn+headcount vs Addendum 20 baseline.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const RESULTS = join(ROOT, 'playtest-results');

type Decision = { action: string; rationale: string; week?: number };

type Session = {
  id: string;
  companyType: string;
  bankrupt: boolean;
  weeksPlayed: number;
  quarterNetProfit: number[];
  netProfit: number;
  axes?: Record<string, number | null>;
  decisions?: Decision[];
};

type Batch = { sessions: Session[] };

function load(name: string): Batch {
  return JSON.parse(readFileSync(join(RESULTS, name), 'utf8')) as Batch;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function actionType(row: Decision): string {
  try {
    return (JSON.parse(row.action) as { type?: string }).type ?? '';
  } catch {
    return '';
  }
}

function funnel(sessions: Session[]) {
  let assignProject = 0;
  let skipProject = 0;
  let assignLead = 0;
  let skipLead = 0;
  let forcedProject = 0;
  let hire = 0;
  let hireDesigner = 0;
  let hireSales = 0;
  let headcountReviewHire = 0;
  const lastHireWeek: number[] = [];
  const designerHires: number[] = [];
  for (const s of sessions) {
    let lastH = 0;
    let dHires = 0;
    for (const d of s.decisions ?? []) {
      const t = actionType(d);
      if (t === 'assign_project') {
        assignProject += 1;
        if (d.rationale.toLowerCase().includes('forced mismatch')) forcedProject += 1;
      }
      if (t === 'skip_project') skipProject += 1;
      if (t === 'assign_lead') assignLead += 1;
      if (t === 'skip_lead') skipLead += 1;
      if (t === 'hire') {
        hire += 1;
        lastH = d.week ?? lastH;
        const r = d.rationale.toLowerCase();
        if (r.includes('designer') || r.includes('hire designer')) {
          hireDesigner += 1;
          dHires += 1;
        }
        if (r.includes('hire sales') || r.includes('sales ')) hireSales += 1;
        if (r.includes('headcount review')) headcountReviewHire += 1;
      }
    }
    lastHireWeek.push(lastH);
    designerHires.push(dHires);
  }
  const n = sessions.length || 1;
  return {
    assignProject,
    skipProject,
    assignLead,
    skipLead,
    forcedProject,
    hire,
    hireDesigner,
    hireSales,
    headcountReviewHire,
    skipShare:
      assignProject + skipProject > 0
        ? Math.round((skipProject / (assignProject + skipProject)) * 1000) / 10
        : 0,
    assignProjectPerSession: Math.round((assignProject / n) * 10) / 10,
    lastHireWeekMedian: median(lastHireWeek),
    designerHiresMedian: median(designerHires),
    sessionsLastHireAfterW12: lastHireWeek.filter((w) => w > 12).length,
    sessionsDesignerHiresGte3: designerHires.filter((n) => n >= 3).length,
  };
}

function analyze(sessions: Session[]) {
  const completed4 = sessions.filter((s) => (s.quarterNetProfit?.length ?? 0) >= 4 && !s.bankrupt);
  const q = (i: number) =>
    sessions.map((s) => s.quarterNetProfit[i]).filter((n): n is number => typeof n === 'number');
  const cumPositive = sessions.filter((s) => {
    const qs = s.quarterNetProfit ?? [];
    if (qs.length < 4) return false;
    return qs.reduce((a, b) => a + b, 0) > 0;
  }).length;
  const q3or4plus = sessions.filter((s) => {
    const qs = s.quarterNetProfit ?? [];
    return (qs[2] ?? 0) > 0 || (qs[3] ?? 0) > 0;
  }).length;
  const q4plus = sessions.filter((s) => (s.quarterNetProfit[3] ?? 0) > 0).length;
  const fullCums = sessions
    .filter((s) => (s.quarterNetProfit?.length ?? 0) >= 4)
    .map((s) => s.quarterNetProfit.reduce((a, b) => a + b, 0));
  const dq = sessions.map((s) => s.axes?.delivery_quality).filter((n): n is number => typeof n === 'number');
  return {
    n: sessions.length,
    completed4: completed4.length,
    bankrupt: sessions.filter((s) => s.bankrupt).length,
    bankruptPct: Math.round((sessions.filter((s) => s.bankrupt).length / sessions.length) * 1000) / 10,
    cum4plus: cumPositive,
    cum4plusPct: Math.round((cumPositive / sessions.length) * 1000) / 10,
    q3or4plus,
    q4plus,
    meanNp: mean(sessions.map((s) => s.netProfit)),
    q1median: median(q(0)),
    q2median: median(q(1)),
    q3median: median(q(2)),
    q4median: median(q(3)),
    dqMean: mean(dq),
    funnel: funnel(sessions),
    bestCum: fullCums.length ? Math.max(...fullCums) : null,
    worstCum: fullCums.length ? Math.min(...fullCums) : null,
    rows: sessions.map((s) => {
      const qs = s.quarterNetProfit ?? [];
      const cum: number[] = [];
      let acc = 0;
      for (const x of qs) {
        acc += x;
        cum.push(acc);
      }
      return {
        id: s.id,
        bankrupt: s.bankrupt,
        weeks: s.weeksPlayed,
        q: qs.map((x) => Math.round(x)),
        cum: cum.map((x) => Math.round(x)),
        np: Math.round(s.netProfit),
      };
    }),
  };
}

function main() {
  const spawnName = process.argv[2] ?? 'batch-addendum-21-spawn.json';
  const combinedName = process.argv[3] ?? 'batch-addendum-21-combined.json';
  const a20 = load('batch-addendum-20-classical-design.json');
  const spawn = load(spawnName);
  const summary: Record<string, unknown> = {
    a20_check_only: analyze(a20.sessions),
    a21_spawn_only: analyze(spawn.sessions),
  };
  try {
    const combined = load(combinedName);
    summary.a21_spawn_and_headcount = analyze(combined.sessions);
  } catch {
    summary.a21_spawn_and_headcount = null;
  }
  const out = join(RESULTS, 'addendum-21-classical-summary.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('Wrote', out);
}

main();
