import type { DecisionLogEntry, DecisionEventType } from '@/game/decisionLog/types';
import { AVOIDABLE_MISMATCH_WINDOW_WEEKS, FREE_REROLLS_PER_SESSION } from '@/game/catalog/balance';

export type ManagerAxis =
  | 'hiring_discipline'
  | 'delivery_quality'
  | 'client_retention'
  | 'people_leadership'
  | 'cashflow_discipline'
  | 'prioritization'
  | 'capacity_planning';

export type ManagerArchetype =
  | 'firefighter'
  | 'hoarder'
  | 'cautious_builder'
  | 'gambler'
  | 'people_first'
  | 'specialist'
  | 'generalist'
  | 'inactive'
  | 'insufficient_data';

export type AxisConfidence = 'n/a' | 'low' | 'medium' | 'high';

export interface AxisScore {
  score: number | null;
  confidence: AxisConfidence;
  n: number;
}

export interface FlaggedMoment {
  week: number;
  description: string;
  axis: ManagerAxis;
}

export type ManagerReportScores = Record<ManagerAxis, AxisScore>;

/** Adizes PAEI — derived from the 7 axes (interpretation layer, not separate measurement). */
export interface PaeiScores {
  p: number | null;
  a: number | null;
  e: number | null;
  i: number | null;
}

export interface ManagerReportResult {
  scores: ManagerReportScores;
  archetype: ManagerArchetype | null;
  flaggedMoments: FlaggedMoment[];
  activityIndex: number;
  paei: PaeiScores;
}

const AXES: ManagerAxis[] = [
  'hiring_discipline',
  'delivery_quality',
  'client_retention',
  'people_leadership',
  'cashflow_discipline',
  'prioritization',
  'capacity_planning',
];

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ofType<T extends DecisionEventType>(log: DecisionLogEntry[], type: T) {
  return log.filter((e): e is Extract<DecisionLogEntry, { eventType: T }> => e.eventType === type);
}

function confidenceFromN(n: number): AxisConfidence {
  if (n <= 0) return 'n/a';
  if (n <= 4) return 'low';
  if (n <= 9) return 'medium';
  return 'high';
}

function axis(score: number | null, n: number, forceNa = false): AxisScore {
  if (forceNa || n <= 0 || score == null) {
    return { score: null, confidence: 'n/a', n };
  }
  return { score: clamp(score), confidence: confidenceFromN(n), n };
}

/**
 * Soften raw score when sample is small (Addendum A + prior inactivity guard).
 */
function withEvidence(raw: number, samples: number, minSamples: number, unproven = 28): number {
  if (samples <= 0) return unproven;
  if (samples >= minSamples) return raw;
  const t = samples / minSamples;
  return unproven + (raw - unproven) * t;
}

export function computeManagerReport(log: DecisionLogEntry[]): ManagerReportResult {
  const starts = ofType(log, 'session_start');
  const hires = ofType(log, 'hire');
  const assigns = ofType(log, 'assign_project');
  const leadAssigns = ofType(log, 'assign_lead');
  const bonuses = ofType(log, 'bonus');
  const quits = ofType(log, 'quit');
  const reworks = ofType(log, 'rework');
  const churns = ofType(log, 'client_churn');
  const nearBroke = ofType(log, 'near_bankruptcy');
  const randomEvents = ofType(log, 'random_event');
  const snapshots = ofType(log, 'week_snapshot');
  const buildRooms = ofType(log, 'build_room');
  const buildDesks = ofType(log, 'build_desk');
  const builds = [...buildRooms, ...buildDesks];
  const promotions = [
    ...ofType(log, 'promotion_accept'),
    ...ofType(log, 'promotion_decline'),
  ];
  const rerolls = ofType(log, 'candidates_rerolled');
  const leadSkips = ofType(log, 'lead_skipped');
  const projectSkips = ofType(log, 'project_skipped');
  const terminations = ofType(log, 'employee_terminated');
  const flagged: FlaggedMoment[] = [];

  const startBudget = starts[0]?.payload.startBudget ?? 10_000;
  const lastSnap = snapshots[snapshots.length - 1];
  const endBudget = lastSnap?.payload.budget ?? startBudget;

  const workAssigns = assigns.length + leadAssigns.length;
  const activityIndex = activityFromLog({
    hires: hires.length,
    workAssigns,
    bonuses: bonuses.length,
    builds: builds.length,
    reworks: reworks.length,
    promotions: promotions.length,
    weeks: snapshots.length,
    skips: leadSkips.length + projectSkips.length,
  });

  // --- Hiring Discipline ---
  const avoidable = avoidableMismatchRate(log, leadAssigns, assigns, snapshots, hires);
  const rerollCount = rerolls.reduce(
    (m, r) => Math.max(m, r.payload.rerollCountThisSession),
    0,
  );
  const excessiveRerollPenalty = Math.max(0, rerollCount - FREE_REROLLS_PER_SESSION) * 4;
  let hireN = hires.length;
  let hireRaw: number | null;
  if (hires.length === 0) {
    hireRaw = null;
    flagged.push({
      week: lastSnap?.week ?? 0,
      description: 'No hires — staffing decisions were never tested',
      axis: 'hiring_discipline',
    });
  } else {
    const seniorCount = hires.filter((h) => h.payload.tier === 'senior').length;
    const juniorCount = hires.filter((h) => h.payload.tier === 'junior').length;
    const overpayPenalty = seniorCount * 4;
    const understaffPenalty = juniorCount > seniorCount * 3 ? 8 : 0;
    hireRaw = 100 - overpayPenalty - understaffPenalty - excessiveRerollPenalty;
    hireRaw -= bonuses.filter((b) => b.payload.class === 'wasted').length * 5;
    hireRaw -= avoidable.rate * 18;

    // Addendum 04 — early fires of busy people hurt; idle fires do not
    const earlyTerms = terminations.filter((t) => t.payload.jobsCompleted === 0);
    const earlyBusy = earlyTerms.filter((t) => t.payload.recentUtilization >= 0.4);
    const earlyIdle = earlyTerms.filter((t) => t.payload.recentUtilization < 0.4);
    if (hires.length > 0 && earlyBusy.length > 0) {
      const rate = earlyBusy.length / hires.length;
      hireRaw -= rate * 28;
      flagged.push({
        week: lastSnap?.week ?? 0,
        description: `Cut ${earlyBusy.length} busy hire(s) before they delivered — poor entry judgment`,
        axis: 'hiring_discipline',
      });
    }
    if (earlyIdle.length > 0) {
      hireN += earlyIdle.length; // healthy correction still counts as staffing signal
    }

    if (workAssigns === 0) {
      hireRaw = Math.min(hireRaw, 42);
      flagged.push({
        week: hires[hires.length - 1]?.week ?? 0,
        description: 'Hired staff but never assigned leads or projects',
        axis: 'hiring_discipline',
      });
    }
    if (excessiveRerollPenalty > 0) {
      flagged.push({
        week: lastSnap?.week ?? 0,
        description: `Excessive candidate rerolls (${rerollCount} this session)`,
        axis: 'hiring_discipline',
      });
    }
    if (avoidable.rate >= 0.4 && avoidable.forced > 0) {
      flagged.push({
        week: lastSnap?.week ?? 0,
        description: `Avoidable mismatches: ${avoidable.avoidable}/${avoidable.forced} forced assigns (match freed within ${AVOIDABLE_MISMATCH_WINDOW_WEEKS}w)`,
        axis: 'hiring_discipline',
      });
    }
    hireRaw = withEvidence(hireRaw, hires.length, 3, 40);
    hireN = hires.length + Math.min(rerollCount, 5);
  }

  // --- Delivery Quality ---
  let deliveryN = 0;
  let deliveryRaw: number | null;
  if (assigns.length === 0) {
    deliveryRaw = null;
    flagged.push({
      week: lastSnap?.week ?? 0,
      description: 'No projects assigned — delivery quality is unproven',
      axis: 'delivery_quality',
    });
  } else {
    const projectsTouched = new Set(assigns.map((a) => a.payload.projectId)).size;
    deliveryN = projectsTouched;
    const reworkProjects = new Set(reworks.map((r) => r.payload.projectId)).size;
    const reworkRate = reworkProjects / Math.max(1, projectsTouched);
    const complianceFails = randomEvents.filter(
      (c) => c.payload.kind === 'compliance' && c.payload.outcome === 'fail',
    ).length;
    deliveryRaw = 100 * (1 - reworkRate) - complianceFails * 3;
    // Prefer avoidable forced mismatches over raw forced rate
    deliveryRaw -= avoidable.rate * 15;
    const mismatchRate =
      assigns.filter((a) => !a.payload.stackMatch && !a.payload.matched).length /
      assigns.length;
    deliveryRaw -= mismatchRate * 12;
    deliveryRaw = withEvidence(deliveryRaw, projectsTouched, 3, 32);
  }

  // --- Client Retention ---
  const retainerish = assigns.filter(
    (a) =>
      a.payload.engagement === 'long_delivery' ||
      a.payload.engagement === 'recurring_retainer',
  );
  const retentionNa = retainerish.length === 0 && churns.length === 0;
  let retentionRaw: number | null = null;
  let retentionN = 0;
  if (!retentionNa) {
    retentionN = retainerish.length + churns.length;
    retentionRaw = 100 - churns.length * 18;
    retentionRaw = withEvidence(retentionRaw, retentionN, 2, 40);
  }
  for (const c of churns.slice(0, 3)) {
    flagged.push({
      week: c.week,
      description: `Client churned with satisfaction ${c.payload.clientSatisfaction} (lost ~$${c.payload.remainingValue})`,
      axis: 'client_retention',
    });
  }

  // --- People Leadership ---
  let peopleN = bonuses.length + promotions.length + quits.length;
  let peopleRaw: number | null;
  if (hires.length === 0 && peopleN === 0) {
    peopleRaw = null;
  } else if (peopleN === 0) {
    peopleRaw = 38;
    peopleN = 1;
    flagged.push({
      week: lastSnap?.week ?? 0,
      description: 'Team sat without bonuses or promotion decisions',
      axis: 'people_leadership',
    });
  } else {
    const proactive = bonuses.filter((b) => b.payload.class === 'proactive').length;
    const firefighting = bonuses.filter((b) => b.payload.class === 'firefighting').length;
    const totalBonuses = Math.max(1, bonuses.length);
    peopleRaw =
      100 * (proactive / totalBonuses) - firefighting * 2 - quits.length * 5;
    peopleRaw += promotions.filter((p) => p.eventType === 'promotion_accept').length * 4;
    peopleRaw -= promotions.filter((p) => p.eventType === 'promotion_decline').length * 6;
    peopleRaw = withEvidence(peopleRaw, peopleN, 2, 35);
  }
  for (const q of quits.slice(0, 2)) {
    flagged.push({
      week: q.week,
      description: `${q.payload.role} quit (${q.payload.reason}) at morale ${Math.round(q.payload.morale)}`,
      axis: 'people_leadership',
    });
  }

  // --- Cashflow Discipline ---
  let cashN = snapshots.length;
  let cashRaw: number | null =
    cashN === 0 && nearBroke.length === 0 ? null : 100 - nearBroke.length * 15;
  if (cashRaw != null && snapshots.length > 0) {
    const avgBudget =
      snapshots.reduce((s, x) => s + x.payload.budget, 0) / snapshots.length;
    const headroom = avgBudget / Math.max(1, startBudget);
    if (headroom < 0.25) cashRaw -= 20;
    else if (headroom < 0.4) cashRaw -= 10;
    else if (headroom > 0.85 && workAssigns === 0) cashRaw -= 25;
    const burnRatio = (startBudget - endBudget) / Math.max(1, startBudget);
    if (workAssigns === 0 && burnRatio > 0.05) {
      cashRaw = Math.min(cashRaw, 40);
      flagged.push({
        week: lastSnap?.week ?? 0,
        description: `Burned ~${Math.round(burnRatio * 100)}% of budget with almost no delivery activity`,
        axis: 'cashflow_discipline',
      });
    }
    cashN = Math.max(cashN, nearBroke.length);
  }
  for (const n of nearBroke) {
    flagged.push({
      week: n.week,
      description: `Budget near bankruptcy ($${Math.round(n.payload.budget)} / start $${n.payload.startBudget})`,
      axis: 'cashflow_discipline',
    });
  }

  // --- Prioritization ---
  // Only count waits when a match was available during the queue window
  const matchWeeks = snapshots.filter((s) => s.payload.anyMatchAvailable === true);
  const idleWaits = [
    ...leadAssigns
      .filter((a) => a.payload.hadIdleSales && a.payload.idleWeeks > 0)
      .filter((a) => waitOverlappedMatch(a.week, a.payload.idleWeeks, snapshots))
      .map((a) => a.payload.idleWeeks),
    ...assigns
      .filter((a) => a.payload.idleWeeks > 0)
      .filter((a) => waitOverlappedMatch(a.week, a.payload.idleWeeks, snapshots))
      .map((a) => a.payload.idleWeeks),
  ];
  const skipN = leadSkips.length + projectSkips.length;
  const priorityN = idleWaits.length + matchWeeks.length + skipN;
  let priorityRaw: number | null;
  if (priorityN === 0 && workAssigns === 0) {
    priorityRaw = null;
    flagged.push({
      week: lastSnap?.week ?? 0,
      description: 'No assignment decisions — prioritization untested',
      axis: 'prioritization',
    });
  } else if (idleWaits.length === 0 && matchWeeks.length > 0) {
    // Had match opportunities but never assigned
    priorityRaw = 22;
    flagged.push({
      week: lastSnap?.week ?? 0,
      description: `Queue waited while matching staff were idle across ${matchWeeks.length} weeks`,
      axis: 'prioritization',
    });
  } else if (idleWaits.length === 0) {
    priorityRaw = skipN > 0 ? 62 : 48;
    priorityRaw += Math.min(12, skipN * 3); // patient skips when mismatch-only are positive
  } else {
    const avgWait = idleWaits.reduce((a, b) => a + b, 0) / idleWaits.length;
    priorityRaw = 100 - avgWait * 12 - Math.min(24, matchWeeks.length);
    priorityRaw += Math.min(10, skipN * 2);
    priorityRaw = withEvidence(priorityRaw, idleWaits.length, 3, 36);
  }

  // --- Capacity Planning ---
  let earlyPenalty = 0;
  let latePenalty = 0;
  for (const b of builds) {
    if (b.payload.occupancyAtBuild < 0.5) earlyPenalty += 8;
    if (b.payload.queuedDemand >= 3) latePenalty += 6;
  }
  const crampedWeeks = snapshots.filter(
    (s) =>
      s.payload.totalDesks > 0 &&
      s.payload.occupiedDesks >= s.payload.totalDesks &&
      s.payload.queuedLeads + s.payload.queuedProjects >= 2,
  ).length;
  latePenalty += crampedWeeks;
  let capacityN = builds.length + (crampedWeeks > 0 ? crampedWeeks : snapshots.length > 0 ? 1 : 0);
  let capacityRaw: number | null;
  if (builds.length === 0 && snapshots.length === 0) {
    capacityRaw = null;
    capacityN = 0;
  } else if (builds.length === 0) {
    capacityRaw = crampedWeeks > 0 ? 28 : 48;
    if (crampedWeeks > 0) {
      flagged.push({
        week: lastSnap?.week ?? 0,
        description: `Office stayed full with backlog for ${crampedWeeks} weeks — no expansion`,
        axis: 'capacity_planning',
      });
    }
  } else {
    capacityRaw = 100 - earlyPenalty - Math.min(40, latePenalty);
    capacityRaw = withEvidence(capacityRaw, builds.length, 2, 45);
  }
  // Healthy idle fires — capacity correction, not a hiring failure
  const idleFires = terminations.filter(
    (t) => t.payload.jobsCompleted === 0 && t.payload.recentUtilization < 0.4,
  ).length;
  if (capacityRaw != null && idleFires > 0) {
    capacityRaw = Math.min(100, capacityRaw + Math.min(10, idleFires * 4));
  }

  const drag = inactivityDrag(activityIndex);
  const applyDrag = (raw: number | null): number | null =>
    raw == null ? null : raw * drag;

  const scores: ManagerReportScores = {
    hiring_discipline: axis(applyDrag(hireRaw), hireN),
    delivery_quality: axis(applyDrag(deliveryRaw), deliveryN),
    client_retention: axis(applyDrag(retentionRaw), retentionN, retentionNa),
    people_leadership: axis(applyDrag(peopleRaw), peopleN),
    cashflow_discipline: axis(applyDrag(cashRaw), cashN),
    prioritization: axis(applyDrag(priorityRaw), priorityN),
    capacity_planning: axis(applyDrag(capacityRaw), capacityN),
  };

  if (activityIndex < 0.25) {
    flagged.unshift({
      week: lastSnap?.week ?? 0,
      description:
        'Session had almost no management activity — scores stay low until you hire, assign, and deliver',
      axis: 'prioritization',
    });
  }

  return {
    scores,
    archetype: pickArchetype(scores, activityIndex),
    flaggedMoments: flagged.slice(0, 6),
    activityIndex,
    paei: derivePaei(scores, leadAssigns, buildRooms, buildDesks, snapshots.length),
  };
}

/** Aggregate several session reports into a Trend scorecard (Addendum A). */
export function aggregateTrendReport(
  reports: ManagerReportResult[],
): ManagerReportResult | null {
  if (!reports.length) return null;
  const scores = {} as ManagerReportScores;
  for (const key of AXES) {
    let nSum = 0;
    let weighted = 0;
    let weighedN = 0;
    for (const r of reports) {
      const a = r.scores[key];
      nSum += a.n;
      if (a.score != null && a.confidence !== 'n/a') {
        weighted += a.score * Math.max(1, a.n);
        weighedN += Math.max(1, a.n);
      }
    }
    if (weighedN === 0) {
      scores[key] = { score: null, confidence: 'n/a', n: nSum };
    } else {
      scores[key] = {
        score: clamp(weighted / weighedN),
        confidence: confidenceFromN(nSum),
        n: nSum,
      };
    }
  }
  const avgActivity =
    reports.reduce((s, r) => s + r.activityIndex, 0) / reports.length;
  const paeiKeys = ['p', 'a', 'e', 'i'] as const;
  const paei = {} as PaeiScores;
  for (const k of paeiKeys) {
    const vals = reports.map((r) => r.paei?.[k]).filter((v): v is number => v != null);
    paei[k] = vals.length ? clamp(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }
  return {
    scores,
    archetype: pickArchetype(scores, avgActivity),
    flaggedMoments: [],
    activityIndex: avgActivity,
    paei,
  };
}

function activityFromLog(c: {
  hires: number;
  workAssigns: number;
  bonuses: number;
  builds: number;
  reworks: number;
  promotions: number;
  weeks: number;
  skips: number;
}): number {
  const points =
    Math.min(c.hires, 6) * 0.08 +
    Math.min(c.workAssigns, 10) * 0.1 +
    Math.min(c.bonuses, 4) * 0.05 +
    Math.min(c.builds, 3) * 0.04 +
    Math.min(c.reworks, 3) * 0.03 +
    Math.min(c.promotions, 2) * 0.04 +
    Math.min(c.skips, 4) * 0.03 +
    Math.min(c.weeks, 8) * 0.01;
  return Math.max(0, Math.min(1, points));
}

function inactivityDrag(activityIndex: number): number {
  if (activityIndex >= 0.45) return 1;
  if (activityIndex <= 0.1) return 0.45;
  return 0.45 + ((activityIndex - 0.1) / 0.35) * 0.55;
}

function pickArchetype(
  scores: ManagerReportScores,
  activityIndex: number,
): ManagerArchetype | null {
  if (activityIndex < 0.28) return 'inactive';

  const reliable = AXES.filter((k) => {
    const c = scores[k].confidence;
    return c === 'medium' || c === 'high';
  }).length;
  // Addendum A: need ≥4 axes with medium/high confidence
  if (reliable < 4) return 'insufficient_data';

  const numeric = AXES.map((k) => scores[k].score).filter((s): s is number => s != null);
  const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : 0;
  if (avg < 40) return 'firefighter';

  const people = scores.people_leadership.score ?? 0;
  const cash = scores.cashflow_discipline.score ?? 0;
  const capacity = scores.capacity_planning.score ?? 0;
  const priority = scores.prioritization.score ?? 0;
  const delivery = scores.delivery_quality.score ?? 0;
  const hiring = scores.hiring_discipline.score ?? 0;

  if (people >= 75 && cash < 55) return 'people_first';
  if (cash < 45 && capacity >= 60) return 'gambler';
  if (people < 45 && priority < 50) return 'firefighter';
  // Hoarder is more specific than Cautious Builder — check first
  if (cash >= 80 && capacity <= 40) return 'hoarder';
  if (cash >= 75 && capacity < 55) return 'cautious_builder';
  if (delivery >= 75 && hiring >= 70 && activityIndex >= 0.5) return 'specialist';
  return 'generalist';
}

function avgNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return clamp(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function derivePaei(
  scores: ManagerReportScores,
  leadAssigns: ReturnType<typeof ofType<'assign_lead'>>,
  buildRooms: ReturnType<typeof ofType<'build_room'>>,
  buildDesks: ReturnType<typeof ofType<'build_desk'>>,
  weeks: number,
): PaeiScores {
  const p = avgNullable([
    scores.delivery_quality.score,
    scores.hiring_discipline.score,
  ]);
  const a = avgNullable([
    scores.cashflow_discipline.score,
    scores.capacity_planning.score,
  ]);
  const i = avgNullable([
    scores.people_leadership.score,
    scores.client_retention.score,
  ]);

  // E — domain diversification speed + expansion aggressiveness
  const domains = new Set(leadAssigns.map((l) => l.payload.domain));
  const domainPace = domains.size * (weeks > 0 ? 12 / Math.max(weeks, 1) : 1);
  const expansion = buildRooms.length * 18 + buildDesks.length * 8;
  let eRaw: number | null = null;
  if (leadAssigns.length > 0 || buildRooms.length + buildDesks.length > 0) {
    eRaw = clamp(28 + domainPace * 10 + expansion);
  }

  return { p, a, e: eRaw, i };
}

function waitOverlappedMatch(
  assignWeek: number,
  idleWeeks: number,
  snapshots: ReturnType<typeof ofType<'week_snapshot'>>,
): boolean {
  if (idleWeeks <= 0) return false;
  const start = assignWeek - idleWeeks;
  return snapshots.some(
    (s) =>
      s.week > start &&
      s.week <= assignWeek &&
      s.payload.anyMatchAvailable === true,
  );
}

/** Forced mismatch where a match freed within the look-ahead window. */
function avoidableMismatchRate(
  _log: DecisionLogEntry[],
  leadAssigns: ReturnType<typeof ofType<'assign_lead'>>,
  assigns: ReturnType<typeof ofType<'assign_project'>>,
  snapshots: ReturnType<typeof ofType<'week_snapshot'>>,
  hires: ReturnType<typeof ofType<'hire'>>,
): { rate: number; forced: number; avoidable: number } {
  const forcedLeads = leadAssigns.filter((a) => a.payload.forced === true);
  const forcedProjects = assigns.filter((a) => a.payload.forced === true);
  const forced = forcedLeads.length + forcedProjects.length;
  if (forced === 0) return { rate: 0, forced: 0, avoidable: 0 };

  let avoidable = 0;
  const window = AVOIDABLE_MISMATCH_WINDOW_WEEKS;

  for (const a of forcedLeads) {
    const w0 = a.week;
    const domain = a.payload.domain;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + window &&
        h.payload.role === 'sales' &&
        h.payload.domain === domain,
    );
    const matchFreed = snapshots.some(
      (s) =>
        s.week > w0 &&
        s.week <= w0 + window &&
        s.payload.anyMatchAvailable === true &&
        s.payload.idleSales > 0,
    );
    if (matchHire || matchFreed) avoidable += 1;
  }

  for (const a of forcedProjects) {
    const w0 = a.week;
    const stack = a.payload.stack;
    const matchHire = hires.some(
      (h) =>
        h.week > w0 &&
        h.week <= w0 + window &&
        (stack
          ? h.payload.role === 'dev' && h.payload.stack === stack
          : h.payload.role === 'designer' && h.payload.domain === a.payload.domain),
    );
    const matchFreed = snapshots.some(
      (s) =>
        s.week > w0 &&
        s.week <= w0 + window &&
        s.payload.anyMatchAvailable === true &&
        s.payload.idleDevs > 0,
    );
    if (matchHire || matchFreed) avoidable += 1;
  }

  return { rate: avoidable / forced, forced, avoidable };
}

export function archetypeBlurb(archetype: ManagerArchetype | null): string | null {
  if (archetype === 'hoarder') {
    return 'Ты отлично защищаешь бюджет — но безопасность, которую ты копишь, не превращается в рост. Простаивающая команда стоит так же дорого, как и риск, просто медленнее и незаметнее.';
  }
  if (archetype === 'insufficient_data') {
    return 'Пока рано делать выводы — сыграй ещё.';
  }
  return null;
}
