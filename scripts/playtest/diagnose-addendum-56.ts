/**
 * Addendum 56 — avoidable mismatch diagnosis for Design seed 10005.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AVOIDABLE_MISMATCH_WINDOW_WEEKS } from '@/game/catalog/balance';
import { sessionSeedFor } from '@/game/engine/seeds';
import { HeadlessSession } from '@/game/headless';
import type { DecisionLogEntry } from '@/game/decisionLog/types';
import { createReasonableAgent } from './agents/reasonable';

const SEED = sessionSeedFor('design_agency', 5);
const WINDOW = AVOIDABLE_MISMATCH_WINDOW_WEEKS;

async function replay() {
  const session = new HeadlessSession({
    companyType: 'design_agency',
    managerLevel: 'trainee',
    seed: SEED,
  });
  const agent = createReasonableAgent(SEED);
  let stuck = 0;
  for (let step = 0; step < 1200; step++) {
    const view = session.getState();
    if (view.gameOver) break;
    const d = await agent.decide(view);
    const r = session.applyAction(d.action);
    if (d.action.type === 'tick_week') stuck = 0;
    else if (!r.success) {
      stuck += 1;
      if (stuck >= 3) {
        session.applyAction({ type: 'tick_week' });
        stuck = 0;
      }
    } else stuck = 0;
  }
  return session.getEngineState().decisionLog;
}

function ofType<T extends DecisionLogEntry['eventType']>(
  log: DecisionLogEntry[],
  type: T,
) {
  return log.filter((e): e is Extract<DecisionLogEntry, { eventType: T }> => e.eventType === type);
}

function currentAvoidable(
  leadAssigns: ReturnType<typeof ofType<'assign_lead'>>,
  assigns: ReturnType<typeof ofType<'assign_project'>>,
  snapshots: ReturnType<typeof ofType<'week_snapshot'>>,
  hires: ReturnType<typeof ofType<'hire'>>,
) {
  const forcedLeads = leadAssigns.filter((a) => a.payload.forced);
  const forcedProjects = assigns.filter((a) => a.payload.forced);
  const forced = forcedLeads.length + forcedProjects.length;
  let avoidable = 0;
  const details: object[] = [];

  for (const a of forcedLeads) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + WINDOW &&
        h.payload.role === 'sales' &&
        h.payload.domain === domain,
    );
    const matchFreed = snapshots.some(
      (s) =>
        s.week > w0 &&
        s.week <= w0 + WINDOW &&
        s.payload.anyMatchAvailable === true &&
        s.payload.idleSales > 0,
    );
    if (matchHire || matchFreed) avoidable += 1;
    details.push({
      kind: 'lead',
      week: w0,
      domain,
      matchHire,
      matchFreed,
      avoidable: matchHire || matchFreed,
      trigger: matchHire ? 'matchHire' : matchFreed ? 'matchFreed_global' : 'none',
    });
  }

  for (const a of forcedProjects) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const stack = a.payload.stack;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + WINDOW &&
        (stack
          ? h.payload.role === 'dev' && h.payload.stack === stack
          : h.payload.role === 'designer' && h.payload.domain === domain),
    );
    const matchFreed = snapshots.some(
      (s) =>
        s.week > w0 &&
        s.week <= w0 + WINDOW &&
        s.payload.anyMatchAvailable === true &&
        s.payload.idleDevs > 0,
    );
    if (matchHire || matchFreed) avoidable += 1;
    details.push({
      kind: 'project',
      week: w0,
      domain,
      stack,
      matchHire,
      matchFreed,
      avoidable: matchHire || matchFreed,
      trigger: matchHire ? 'matchHire' : matchFreed ? 'matchFreed_global' : 'none',
    });
  }

  return { forced, avoidable, rate: forced ? avoidable / forced : 0, details };
}

/** Stricter: match freed only if domain-specific idle capacity appeared after assign. */
function strictAvoidable(
  leadAssigns: ReturnType<typeof ofType<'assign_lead'>>,
  assigns: ReturnType<typeof ofType<'assign_project'>>,
  snapshots: ReturnType<typeof ofType<'week_snapshot'>>,
  hires: ReturnType<typeof ofType<'hire'>>,
) {
  const forcedLeads = leadAssigns.filter((a) => a.payload.forced);
  const forcedProjects = assigns.filter((a) => a.payload.forced);
  const forced = forcedLeads.length + forcedProjects.length;
  let avoidable = 0;
  const details: object[] = [];

  for (const a of forcedLeads) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + WINDOW &&
        h.payload.role === 'sales' &&
        h.payload.domain === domain,
    );
    // Proxy: week after assign had idle sales AND global match — still weak
    const matchFreedStrict = snapshots.some(
      (s) =>
        s.week > w0 &&
        s.week <= w0 + WINDOW &&
        s.payload.idleSales > 0 &&
        s.payload.anyMatchAvailable === true,
    );
    // Tighter: only matchHire counts as avoidable for leads (domain hire in window)
    const avoid = matchHire;
    if (avoid) avoidable += 1;
    details.push({
      kind: 'lead',
      week: w0,
      domain,
      matchHire,
      matchFreedGlobal: matchFreedStrict,
      avoidable: avoid,
    });
  }

  for (const a of forcedProjects) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + WINDOW &&
        h.payload.role === 'designer' &&
        h.payload.domain === domain,
    );
    const avoid = matchHire;
    if (avoid) avoidable += 1;
    details.push({
      kind: 'project',
      week: w0,
      domain,
      matchHire,
      avoidable: avoid,
    });
  }

  return { forced, avoidable, rate: forced ? avoidable / forced : 0, details };
}

async function main() {
  const log = await replay();
  const leadAssigns = ofType(log, 'assign_lead');
  const assigns = ofType(log, 'assign_project');
  const snapshots = ofType(log, 'week_snapshot');
  const hires = ofType(log, 'hire');

  const forcedLeads = leadAssigns.filter((a) => a.payload.forced).length;
  const forcedProjects = assigns.filter((a) => a.payload.forced).length;
  const matchedNotForced = leadAssigns.filter((a) => !a.payload.forced).length;

  const current = currentAvoidable(leadAssigns, assigns, snapshots, hires);
  const strict = strictAvoidable(leadAssigns, assigns, snapshots, hires);

  /** Proposed: domain-specific hire OR later matched assign on same domain within window. */
  let propAv = 0;
  let propHire = 0;
  let propLaterMatch = 0;
  for (const a of leadAssigns.filter((x) => x.payload.forced)) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + WINDOW &&
        h.payload.role === 'sales' &&
        h.payload.domain === domain,
    );
    const laterMatched = leadAssigns.some(
      (l) =>
        l.week > w0 &&
        l.week <= w0 + WINDOW &&
        l.payload.domain === domain &&
        l.payload.matched,
    );
    if (matchHire) {
      propAv += 1;
      propHire += 1;
    } else if (laterMatched) {
      propAv += 1;
      propLaterMatch += 1;
    }
  }
  for (const a of assigns.filter((x) => x.payload.forced)) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + WINDOW &&
        h.payload.role === 'designer' &&
        h.payload.domain === domain,
    );
    const laterMatched = assigns.some(
      (p) =>
        p.week > w0 &&
        p.week <= w0 + WINDOW &&
        p.payload.domain === domain &&
        p.payload.matched,
    );
    if (matchHire) {
      propAv += 1;
      propHire += 1;
    } else if (laterMatched) {
      propAv += 1;
      propLaterMatch += 1;
    }
  }
  const proposed = {
    avoidable: propAv,
    forced: current.forced,
    rate: current.forced ? propAv / current.forced : 0,
    matchHire: propHire,
    laterMatchedSameDomain: propLaterMatch,
  };

  const triggerCounts = { matchHire: 0, matchFreed_global: 0, none: 0 };
  for (const d of current.details as { trigger: string; avoidable: boolean }[]) {
    if (!d.avoidable) triggerCounts.none += 1;
    else if (d.trigger === 'matchHire') triggerCounts.matchHire += 1;
    else if (d.trigger === 'matchFreed_global') triggerCounts.matchFreed_global += 1;
  }

  const out = {
    seed: SEED,
    windowWeeks: WINDOW,
    counts: {
      assign_lead: leadAssigns.length,
      forced_lead: forcedLeads,
      assign_project: assigns.length,
      forced_project: forcedProjects,
      matched_lead_not_forced: matchedNotForced,
    },
    currentImplementation: {
      avoidable: current.avoidable,
      forced: current.forced,
      rate: current.rate,
      triggerBreakdown: triggerCounts,
    },
    strictMatchHireOnly: {
      avoidable: strict.avoidable,
      forced: strict.forced,
      rate: strict.rate,
    },
    proposedDomainSpecific: proposed,
    sampleNonAvoidable: (current.details as { avoidable: boolean }[]).filter((d) => !d.avoidable)
      .slice(0, 5),
    sampleAvoidableMatchFreed: (
      current.details as { trigger: string; avoidable: boolean; week: number; domain: string }[]
    )
      .filter((d) => d.avoidable && d.trigger === 'matchFreed_global')
      .slice(0, 5),
  };

  const path = join(process.cwd(), 'playtest-results/addendum-56-avoidable-mismatch-diagnosis.json');
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log(`\nWrote ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
