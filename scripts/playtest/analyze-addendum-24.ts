/**
 * Addendum 24: Marketing retainer payout — Rapid edge + Classical first real batch.
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
  bankrupt: boolean;
  weeksPlayed: number;
  quarterNetProfit: number[];
  netProfit: number;
  startBudget?: number;
  retainerPayoutCount?: number;
  retainerPayoutTotal?: number;
  firstRetainerPayoutWeek?: number | null;
  clientChurnCount?: number;
  decisions?: Decision[];
};

function actionType(row: Decision): string {
  try {
    return (JSON.parse(row.action) as { type?: string }).type ?? '';
  } catch {
    return '';
  }
}

function firstAssignWeek(s: Session): number | null {
  for (const d of s.decisions ?? []) {
    if (actionType(d) === 'assign_project') return d.week ?? null;
  }
  return null;
}

function analyze(sessions: Session[]) {
  const withPayout = sessions.filter((s) => (s.retainerPayoutCount ?? 0) > 0);
  const assignWeeks = sessions.map(firstAssignWeek).filter((w): w is number => w != null);
  const payoutWeeks = sessions
    .map((s) => s.firstRetainerPayoutWeek)
    .filter((w): w is number => w != null);
  const n = sessions.length || 1;
  return {
    n: sessions.length,
    startBudget: sessions[0]?.startBudget ?? null,
    sessionsWithAssign: assignWeeks.length,
    sessionsWithPayout: withPayout.length,
    payoutRate: Math.round((withPayout.length / n) * 1000) / 10,
    bankrupt: sessions.filter((s) => s.bankrupt).length,
    cumPositive: sessions.filter((s) => s.netProfit > 0 && !s.bankrupt).length,
    meanNp: Math.round(sessions.reduce((a, s) => a + s.netProfit, 0) / n),
    meanPayoutCount:
      Math.round((sessions.reduce((a, s) => a + (s.retainerPayoutCount ?? 0), 0) / n) * 10) / 10,
    meanPayoutTotal: Math.round(
      sessions.reduce((a, s) => a + (s.retainerPayoutTotal ?? 0), 0) / n,
    ),
    meanChurn: Math.round((sessions.reduce((a, s) => a + (s.clientChurnCount ?? 0), 0) / n) * 10) / 10,
    medianAssignWeek: assignWeeks.length
      ? [...assignWeeks].sort((a, b) => a - b)[Math.floor(assignWeeks.length / 2)]
      : null,
    medianFirstPayoutWeek: payoutWeeks.length
      ? [...payoutWeeks].sort((a, b) => a - b)[Math.floor(payoutWeeks.length / 2)]
      : null,
    rows: sessions.map((s) => ({
      id: s.id,
      bankrupt: s.bankrupt,
      weeks: s.weeksPlayed,
      np: Math.round(s.netProfit),
      q: (s.quarterNetProfit ?? []).map((x) => Math.round(x)),
      assignW: firstAssignWeek(s),
      payouts: s.retainerPayoutCount ?? 0,
      payout$: s.retainerPayoutTotal ?? 0,
      firstPayoutW: s.firstRetainerPayoutWeek ?? null,
      churn: s.clientChurnCount ?? 0,
    })),
  };
}

function main() {
  const rapidName = process.argv[2];
  const classicalName = process.argv[3];
  if (!rapidName || !classicalName) {
    console.error('Usage: tsx analyze-addendum-24.ts <rapid.json> <classical.json>');
    process.exit(1);
  }
  const rapid = JSON.parse(readFileSync(join(RESULTS, rapidName), 'utf8')) as { sessions: Session[] };
  const classical = JSON.parse(readFileSync(join(RESULTS, classicalName), 'utf8')) as {
    sessions: Session[];
  };
  const summary = {
    rapid: analyze(rapid.sessions),
    classical: analyze(classical.sessions),
  };
  const out = join(RESULTS, 'addendum-24-marketing-summary.json');
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('Wrote', out);
}

main();
