/**
 * Compare Addendum 22 Design Trainee start +$2k vs Addendum 21 spawn baseline.
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
  startBudget?: number;
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
  let hireDesigner = 0;
  let headcountReviewHire = 0;
  for (const s of sessions) {
    for (const d of s.decisions ?? []) {
      const t = actionType(d);
      if (t === 'assign_project') assignProject += 1;
      if (t === 'skip_project') skipProject += 1;
      if (t === 'hire') {
        const r = d.rationale.toLowerCase();
        if (r.includes('designer')) hireDesigner += 1;
        if (r.includes('headcount review')) headcountReviewHire += 1;
      }
    }
  }
  const n = sessions.length || 1;
  return {
    assignProject,
    skipProject,
    hireDesigner,
    headcountReviewHire,
    skipShare:
      assignProject + skipProject > 0
        ? Math.round((skipProject / (assignProject + skipProject)) * 1000) / 10
        : 0,
    assignProjectPerSession: Math.round((assignProject / n) * 10) / 10,
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
  const q2to4allPlus = sessions.filter((s) => {
    const qs = s.quarterNetProfit ?? [];
    return qs.length >= 4 && (qs[1] ?? 0) > 0 && (qs[2] ?? 0) > 0 && (qs[3] ?? 0) > 0;
  }).length;
  const fullCums = sessions
    .filter((s) => (s.quarterNetProfit?.length ?? 0) >= 4)
    .map((s) => s.quarterNetProfit.reduce((a, b) => a + b, 0));
  return {
    n: sessions.length,
    startBudget: sessions[0]?.startBudget ?? null,
    completed4: completed4.length,
    bankrupt: sessions.filter((s) => s.bankrupt).length,
    bankruptPct:
      Math.round((sessions.filter((s) => s.bankrupt).length / sessions.length) * 1000) / 10,
    cum4plus: cumPositive,
    cum4plusPct: Math.round((cumPositive / sessions.length) * 1000) / 10,
    q3or4plus,
    q4plus,
    q2to4allPlus,
    meanNp: mean(sessions.map((s) => s.netProfit)),
    q1median: median(q(0)),
    q2median: median(q(1)),
    q3median: median(q(2)),
    q4median: median(q(3)),
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
        startBudget: s.startBudget,
        q: qs.map((x) => Math.round(x)),
        cum: cum.map((x) => Math.round(x)),
        np: Math.round(s.netProfit),
      };
    }),
  };
}

function main() {
  const a22Name = process.argv[2] ?? 'batch-addendum-22-classical-design.json';
  const a21spawn = load('batch-addendum-21-spawn.json');
  const a21combined = load('batch-addendum-21-combined.json');
  const a22 = load(a22Name);
  const summary = {
    a21_spawn_only: analyze(a21spawn.sessions),
    a21_combined: analyze(a21combined.sessions),
    a22_start_plus_2k: analyze(a22.sessions),
  };
  const out = join(RESULTS, 'addendum-22-classical-summary.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('Wrote', out);
}

main();
