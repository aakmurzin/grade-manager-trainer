/**
 * Addendum 58 — verify Cashflow cap on bankruptcy + P&L Total consistency mid-quarter death.
 */
import { createInitialState, gameReducer, type QuarterPL } from '@/game';
import { computeManagerReport } from '@/game/report/computeManagerReport';

function plTotals(history: QuarterPL[]) {
  return history.reduce(
    (acc, q) => ({
      revenue: acc.revenue + q.revenue,
      salaries: acc.salaries + q.salaries,
      overheads: acc.overheads + q.overheads,
      penalties: acc.penalties + (q.penalties ?? 0),
      ebitda: acc.ebitda + q.ebitda,
      netProfit: acc.netProfit + q.netProfit,
    }),
    { revenue: 0, salaries: 0, overheads: 0, penalties: 0, ebitda: 0, netProfit: 0 },
  );
}

function assertClose(label: string, a: number, b: number, tol = 1) {
  if (Math.abs(a - b) > tol) {
    throw new Error(`${label}: ${a} != ${b} (tol ${tol})`);
  }
}

// --- Bug 1: synthetic bankrupt log with healthy near-miss-free cashflow ---
const snapPayload = {
  quarter: 2,
  reputation: 50,
  domainSalesReputation: {},
  domainDeliveryReputation: {},
  queuedLeads: 0,
  queuedProjects: 0,
  idleSales: 0,
  idleDevs: 0,
  occupiedDesks: 2,
  totalDesks: 4,
  roomOccupancy: {},
  anyMatchAvailable: false,
};

const syntheticLog = [
  {
    id: '1',
    sessionId: 's',
    week: 0,
    eventType: 'session_start' as const,
    payload: {
      companyType: 'design_agency' as const,
      speed: 1 as const,
      managerLevel: 'trainee' as const,
      startBudget: 20_000,
    },
    createdAt: new Date().toISOString(),
  },
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `snap-${i}`,
    sessionId: 's',
    week: i + 1,
    eventType: 'week_snapshot' as const,
    payload: {
      week: i + 1,
      budget: i === 17 ? -584 : 12_000,
      ...snapPayload,
      quarter: i < 12 ? 1 : 2,
    },
    createdAt: new Date().toISOString(),
  })),
];

const cashReport = computeManagerReport(syntheticLog);
const cashScore = cashReport.scores.cashflow_discipline.score;
if (cashScore == null || cashScore > 20) {
  throw new Error(`Bug 1 not fixed: cashflow=${cashScore}, expected <= 20`);
}

// --- Bug 2: mid-Q2 bankruptcy flushes partial quarter into history ---
let state = createInitialState({
  companyType: 'design_agency',
  speed: 1,
  managerLevel: 'trainee',
  seed: 58_058,
});

for (let i = 0; i < 13 && !state.gameOver; i++) {
  state = gameReducer(state, { type: 'TICK_WEEK' });
}

if (state.quarter !== 2) {
  throw new Error(`Expected Q2 before forced bankruptcy, got Q${state.quarter}`);
}

state = {
  ...state,
  quarterRevenue: 17_809,
  quarterSalaries: 4_200,
  quarterPenalties: 1_000,
  budget: -584,
};

state = gameReducer(state, { type: 'TICK_WEEK' });

if (!state.bankrupt || state.history.length < 2) {
  throw new Error(
    `Expected bankrupt with 2 history rows, got bankrupt=${state.bankrupt} rows=${state.history.length}`,
  );
}

const total = plTotals(state.history);
const expectedEbitda = total.revenue - total.salaries - total.overheads - total.penalties;
assertClose('Total EBITDA vs row sum', total.ebitda, expectedEbitda);
assertClose('Total NP vs EBITDA', total.netProfit, total.ebitda);

const liveReport = computeManagerReport(state.decisionLog);
const liveCash = liveReport.scores.cashflow_discipline.score;
if (liveCash == null || liveCash > 20) {
  throw new Error(`Live bankrupt session cashflow=${liveCash}, expected <= 20`);
}

console.log(
  JSON.stringify(
    {
      bug1_synthetic_cashflow: cashScore,
      bug2_historyRows: state.history.length,
      bug2_total: total,
      bug2_expectedEbitda: expectedEbitda,
      bug2_live_cashflow: liveCash,
      bug2_archetype: liveReport.archetype,
    },
    null,
    2,
  ),
);
