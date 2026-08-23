/**
 * Player-visible snapshot for headless / AI agents.
 * Mirrors UI information — no hidden RNG tables.
 */
import type { GameState } from '@/game/engine/reducer';
import { leadAssignOptions, projectAssignOptions, terminationCost } from '@/game/engine/reducer';
import { COMPANY_PROFILES, canHireRole, deliveryRoleFor, ROLE_LABELS } from '@/game/catalog/balance';

export type PlayerView = ReturnType<typeof buildPlayerView>;

export function buildPlayerView(state: GameState) {
  const freeDesks = state.rooms.reduce(
    (n, r) => n + r.desks.filter((d) => !d.employeeId).length,
    0,
  );
  const totalDesks = state.rooms.reduce((n, r) => n + r.desks.length, 0);

  const hints: string[] = [];
  if (state.employees.filter((e) => e.role === 'sales').length === 0) {
    hints.push('No Sales hired — leads will pile up unused.');
  }
  const deliveryRole = deliveryRoleFor(state.companyType);
  const deliveryLabel = ROLE_LABELS[deliveryRole];
  if (state.employees.filter((e) => e.role === deliveryRole).length === 0) {
    hints.push(`No ${deliveryLabel} hired — closed deals cannot become revenue.`);
  }
  const queuedLeads = state.leads.filter((l) => l.status === 'queued');
  const busySales =
    state.employees.some((e) => e.role === 'sales') &&
    !queuedLeads.some((l) => leadAssignOptions(state, l.id).hasIdle);
  if (queuedLeads.length > 0 && busySales) {
    hints.push('All Sales busy with a growing lead queue — consider hiring another Sales.');
  }
  const deliveryStaff = state.employees.filter((e) => e.role === deliveryRole);
  const idleDelivery = deliveryStaff.filter((e) => e.status === 'idle').length;
  const deliveryWork =
    state.projects.filter((p) => p.status === 'queued' || p.status === 'inprogress').length;
  if (deliveryStaff.length > 0 && idleDelivery === 0 && deliveryWork > 0) {
    hints.push(
      `All ${deliveryLabel}s are busy with work in flight — hire another only if queued work is piling up, not merely because seats are utilized.`,
    );
  }
  if (freeDesks === 0 && state.candidates.length > 0) {
    hints.push('No free desks — build a desk or room before hiring.');
  }
  if (state.budget < state.startBudget * 0.25) {
    hints.push('Budget is getting tight — watch salaries and severance.');
  }
  const forceIdle = COMPANY_PROFILES[state.companyType].forceAssignIdleThreshold;
  const staleMismatchWork = state.projects.some((p) => {
    if (p.status !== 'queued') return false;
    const opts = projectAssignOptions(state, p.id);
    return opts.mismatchOnly && p.idleWeeks >= forceIdle;
  });
  if (staleMismatchWork && state.companyType === 'design_agency') {
    hints.push(
      `Volume shop — mismatched work waiting ≥${forceIdle}w: assign any idle ${deliveryLabel} rather than waiting for a domain match.`,
    );
  }
  if (state.lastEventMessage) hints.push(state.lastEventMessage);

  return {
    companyType: state.companyType,
    companyLabel: COMPANY_PROFILES[state.companyType].label,
    managerLevel: state.managerLevel,
    format: state.format,
    budget: state.budget,
    startBudget: state.startBudget,
    week: state.week,
    quarter: state.quarter,
    maxQuarters: state.maxQuarters,
    reputation: state.reputation,
    gameOver: state.gameOver,
    bankrupt: state.bankrupt,
    freeDesks,
    totalDesks,
    roleHireCooldown: { ...state.roleHireCooldown },
    rerollCountThisSession: state.rerollCountThisSession,
    forceAssignIdleThreshold: COMPANY_PROFILES[state.companyType].forceAssignIdleThreshold,
    hints,
    candidates: state.candidates.map((c) => ({
      id: c.id,
      role: c.role,
      name: c.name,
      tier: c.tier,
      salary: c.salary,
      stack: c.stack ?? null,
      domain: c.domain ?? null,
      canHire:
        canHireRole(state.managerLevel, c.role, state.companyType) &&
        freeDesks > 0 &&
        state.budget >= c.salary,
    })),
    employees: state.employees.map((e) => {
      const fire = terminationCost(state, e.id);
      return {
        id: e.id,
        role: e.role,
        name: e.name,
        tier: e.tier,
        salary: e.salary,
        stack: e.stack ?? null,
        domain: e.domain ?? null,
        status: e.status,
        satisfaction: Math.round(e.satisfaction),
        jobsCompleted: e.completedProjects,
        fireCost: fire?.total ?? null,
        canAffordFire: fire?.canAfford ?? false,
        fireBreaksLongDelivery: fire?.brokeLongDelivery ?? false,
      };
    }),
    leads: state.leads.map((l) => {
      const opts = leadAssignOptions(state, l.id);
      return {
        id: l.id,
        domain: l.domain,
        value: l.value,
        status: l.status,
        progress: Math.round(l.progress),
        durationWeeks: l.durationWeeks,
        idleWeeks: l.idleWeeks,
        canAssign: opts.canAssign,
        mismatchOnly: opts.mismatchOnly,
        hasIdle: opts.hasIdle,
      };
    }),
    projects: state.projects.map((p) => {
      const opts = projectAssignOptions(state, p.id);
      return {
        id: p.id,
        domain: p.domain,
        stack: p.stack ?? null,
        value: p.value,
        engagement: p.engagement,
        status: p.status,
        progress: Math.round(p.progress),
        durationWeeks: p.durationWeeks,
        idleWeeks: p.idleWeeks,
        canAssign: opts.canAssign,
        mismatchOnly: opts.mismatchOnly,
        hasIdle: opts.hasIdle,
      };
    }),
    pendingPromotions: state.pendingPromotions.map((p) => {
      const emp = state.employees.find((e) => e.id === p.employeeId);
      return {
        employeeId: p.employeeId,
        name: emp?.name ?? '?',
        fromTier: p.fromTier,
        toTier: p.toTier,
        salaryDelta: p.salaryDelta,
      };
    }),
    rooms: state.rooms.map((r) => ({
      id: r.id,
      deskCount: r.desks.length,
      freeDesks: r.desks.filter((d) => !d.employeeId).length,
      nextDeskCost: r.deskCost,
    })),
    history: state.history.map((h) => ({ ...h })),
  };
}
