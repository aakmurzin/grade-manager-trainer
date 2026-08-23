/**
 * Addendum 23: distribution of A22 cumulative NP — no new batch.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const RESULTS = join(ROOT, 'playtest-results');

type Session = {
  id: string;
  bankrupt: boolean;
  quarterNetProfit: number[];
  netProfit: number;
};

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! * (hi - i) + sorted[hi]! * (i - lo);
}

function main() {
  const batch = JSON.parse(
    readFileSync(join(RESULTS, 'batch-addendum-22-classical-design.json'), 'utf8'),
  ) as { sessions: Session[] };
  const rows = batch.sessions.map((s) => {
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
  const nearZero = rows.filter((r) => r.cum > -1000 && r.cum <= 0);
  const mid = rows.filter((r) => r.cum > -5000 && r.cum <= -1000);
  const deep = rows.filter((r) => r.cum <= -5000);
  const plus = rows.filter((r) => r.cum > 0);
  const summary = {
    n: rows.length,
    bands: {
      cum_positive: plus.length,
      near_zero_minus1k_to_0: nearZero.length,
      mid_minus5k_to_minus1k: mid.length,
      deep_at_or_below_minus5k: deep.length,
    },
    netProfit: {
      mean: Math.round(cums.reduce((a, b) => a + b, 0) / cums.length),
      p10: Math.round(quantile(cums, 0.1)),
      p50: Math.round(quantile(cums, 0.5)),
      p90: Math.round(quantile(cums, 0.9)),
      min: cums[0],
      max: cums[cums.length - 1],
    },
    verdict: 'lever_exhausted',
    reason:
      '0 sessions in −$1k…$0; 8/12 at or below −$5k; s08 (+$896) is an isolated max. Further start-budget would stretch the max, not the median.',
    rows: [...rows].sort((a, b) => b.cum - a.cum),
  };
  const out = join(RESULTS, 'addendum-23-distribution.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('Wrote', out);
}

main();
