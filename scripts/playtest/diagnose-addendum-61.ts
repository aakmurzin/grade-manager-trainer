/**
 * Addendum 61 — Cashflow must cap on EOQ payroll bankruptcy (positive last snap, negative final).
 */
import { createInitialState, gameReducer } from '@/game';
import { computeManagerReport } from '@/game/report/computeManagerReport';
import { WEEKS_PER_QUARTER } from '@/game/catalog/balance';

// --- Path A: synthetic — last snap positive, but opts say bankrupt ---
const snapPayload = {
  quarter: 3,
  reputation: 40,
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
  {
    id: 'a1',
    sessionId: 's',
    week: 2,
    eventType: 'assign_project' as const,
    payload: {
      projectId: 'p1',
      employeeId: 'e1',
      domain: 'ecommerce' as const,
      tier: 'middle' as const,
      value: 1000,
      engagement: 'one_off' as const,
      idleWeeks: 0,
      stackMatch: true,
      matched: true,
      forced: false,
    },
    createdAt: new Date().toISOString(),
  },
  ...Array.from({ length: 36 }, (_, i) => ({
    id: `snap-${i}`,
    sessionId: 's',
    week: i + 1,
    eventType: 'week_snapshot' as const,
    payload: {
      week: i + 1,
      // Healthy headroom all session; last snap still +$420 — pre-A61 EOQ bug surface
      budget: i === 35 ? 420 : 14_000,
      ...snapPayload,
      quarter: Math.floor(i / 12) + 1,
    },
    createdAt: new Date().toISOString(),
  })),
];

const withoutOpts = computeManagerReport(syntheticLog);
const withOpts = computeManagerReport(syntheticLog, {
  finalBudget: -1_200,
  bankrupt: true,
});

const snapOnly = withoutOpts.scores.cashflow_discipline.score;
const withScore = withOpts.scores.cashflow_discipline.score;
// Bug surface: positive last snap alone must NOT apply bankrupt cap.
if (snapOnly == null || snapOnly <= 20) {
  throw new Error(
    `A61 setup: snap-only cashflow should stay high without bankrupt opts, got ${snapOnly}`,
  );
}
if (withScore == null || withScore > 20) {
  throw new Error(`A61 opts path failed: cashflow=${withScore}, expected <= 20`);
}
if (!withOpts.flaggedMoments.some((m) => m.description.includes('bankrupt'))) {
  throw new Error('A61: missing bankrupt flagged moment');
}

// --- Path B: live EOQ — force payroll death on quarter boundary ---
let state = createInitialState({
  companyType: 'design_agency',
  speed: 1,
  managerLevel: 'trainee',
  seed: 61_061,
});

// Survive to week 12 boundary with tiny budget so EOQ salaries kill us
for (let i = 0; i < WEEKS_PER_QUARTER - 1 && !state.gameOver; i++) {
  state = gameReducer(state, { type: 'TICK_WEEK' });
}
if (state.gameOver) {
  throw new Error('Died before EOQ — adjust seed/setup');
}

// Hire expensive staff so recurring EOQ payroll exceeds remaining cash
state = {
  ...state,
  budget: 500,
  employees: [
    {
      id: 'e1',
      role: 'sales',
      name: 'Alex',
      tier: 'senior',
      salary: 2_000,
      satisfaction: 80,
      status: 'idle',
      workId: null,
      roomId: state.rooms[0]!.id,
      deskId: state.rooms[0]!.desks[0]!.id,
      completedProjects: 0,
      monthsOnSameProject: 0,
      promotionCooldownWeeks: 0,
      hiredWeek: 1,
      weeksEmployed: 11,
      weeksBusy: 0,
    },
  ],
};

const preSnapBudget = state.budget;
state = gameReducer(state, { type: 'TICK_WEEK' });

if (!state.bankrupt) {
  throw new Error(
    `Expected EOQ bankrupt, budget=${state.budget} pre=${preSnapBudget} week=${state.week}`,
  );
}

const lastSnap = [...state.decisionLog].reverse().find((e) => e.eventType === 'week_snapshot');
const lastSnapBudget =
  lastSnap && lastSnap.eventType === 'week_snapshot' ? lastSnap.payload.budget : null;

const live = computeManagerReport(state.decisionLog, {
  finalBudget: state.budget,
  bankrupt: state.bankrupt,
});
const liveCash = live.scores.cashflow_discipline.score;
if (liveCash == null || liveCash > 20) {
  throw new Error(`A61 live EOQ cashflow=${liveCash}, expected <= 20`);
}

// After reorder, last snap should also be negative
if (lastSnapBudget == null || lastSnapBudget >= 0) {
  throw new Error(
    `A61: last week_snapshot budget should be negative after EOQ, got ${lastSnapBudget}`,
  );
}

console.log(
  JSON.stringify(
    {
      opts_cashflow: withScore,
      snap_only_cashflow: snapOnly,
      live_cashflow: liveCash,
      live_final_budget: state.budget,
      live_last_snap_budget: lastSnapBudget,
      history_rows: state.history.length,
    },
    null,
    2,
  ),
);
