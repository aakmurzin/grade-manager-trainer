/**
 * Compare Addendum 17 Design Classical batch vs Addendum 15 Design rows.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const RESULTS = join(ROOT, 'playtest-results');

type Session = {
  id: string;
  companyType: string;
  bankrupt: boolean;
  weeksPlayed: number;
  quarterNetProfit: number[];
  netProfit: number;
};

type Batch = { sessions: Session[]; meta?: { createdAt?: string; n?: number } };

function load(name: string): Batch {
  return JSON.parse(readFileSync(join(RESULTS, name), 'utf8')) as Batch;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function analyze(sessions: Session[]) {
  const completed4 = sessions.filter((s) => (s.quarterNetProfit?.length ?? 0) >= 4 && !s.bankrupt);
  const q = (i: number) =>
    sessions.map((s) => s.quarterNetProfit[i]).filter((n): n is number => typeof n === 'number');
  const cum4plus = sessions.filter((s) => s.netProfit > 0 && !s.bankrupt).length;
  // bankrupt sessions may still have partial NP; addendum-15 counted all 12 including bankrupt as cum4plus=false
  const cumPositive = sessions.filter((s) => {
    const qs = s.quarterNetProfit ?? [];
    if (qs.length < 4) return false;
    return qs.reduce((a, b) => a + b, 0) > 0;
  }).length;
  const q3or4plus = sessions.filter((s) => {
    const qs = s.quarterNetProfit ?? [];
    return (qs[2] ?? 0) > 0 || (qs[3] ?? 0) > 0;
  }).length;
  const mono = sessions.filter((s) => {
    const qs = (s.quarterNetProfit ?? []).slice(0, 4);
    if (qs.length < 2) return false;
    for (let i = 1; i < qs.length; i++) if (qs[i]! <= qs[i - 1]!) return false;
    return true;
  }).length;
  return {
    n: sessions.length,
    completed4: completed4.length,
    bankrupt: sessions.filter((s) => s.bankrupt).length,
    cum4plus: cumPositive,
    cum4plusPct: Math.round((cumPositive / sessions.length) * 1000) / 10,
    q3or4plus,
    q3or4plusPct: Math.round((q3or4plus / sessions.length) * 1000) / 10,
    mono,
    q1median: median(q(0)),
    q2median: median(q(1)),
    q3median: median(q(2)),
    q4median: median(q(3)),
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
        completed: qs.filter((_, i) => s.weeksPlayed > i * 12).length,
      };
    }),
  };
}

function main() {
  const a15 = load('batch-addendum-15-classical-trainee.json');
  const a17Name = process.argv[2];
  if (!a17Name) {
    console.error('Usage: tsx analyze-addendum-17.ts <batch-a17.json>');
    process.exit(1);
  }
  const a17 = load(a17Name);
  const design15 = a15.sessions.filter((s) => s.companyType === 'design_agency');
  const summary = {
    a15_design: analyze(design15),
    a17_design: analyze(a17.sessions),
  };
  const out = join(RESULTS, 'addendum-17-classical-summary.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('Wrote', out);
}

main();
