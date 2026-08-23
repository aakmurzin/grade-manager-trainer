import type { Employee, GameState } from '@/game/engine/reducer';
import type { SkillTier } from '@/game/decisionLog/types';
import { isDeliveryRole } from '@/game/catalog/balance';

function tierRank(t: SkillTier): number {
  return t === 'junior' ? 0 : t === 'middle' ? 1 : 2;
}

function bestOf(emps: Employee[]): Employee | null {
  if (!emps.length) return null;
  return emps.reduce((a, b) => (tierRank(a.tier) >= tierRank(b.tier) ? a : b));
}

/** Marketer: +% to lead check. */
export function marketerLeadBonus(state: GameState): number {
  const m = bestOf(state.employees.filter((e) => e.role === 'marketer'));
  if (!m) return 0;
  return m.tier === 'junior' ? 0.05 : m.tier === 'middle' ? 0.1 : 0.15;
}

/** Lead Gen: faster spawns + sales parallel capacity hint. */
export function leadGenSpawnMult(state: GameState): number {
  const lg = bestOf(state.employees.filter((e) => e.role === 'lead_gen'));
  if (!lg) return 1;
  const boost = lg.tier === 'junior' ? 0.2 : lg.tier === 'middle' ? 0.35 : 0.5;
  return 1 / (1 + boost);
}

export function salesParallelCapacity(state: GameState): number {
  const lg = bestOf(state.employees.filter((e) => e.role === 'lead_gen'));
  if (!lg) return 1;
  return lg.tier === 'junior' ? 1 : 2;
}

/** Recruiter hire discount + consume a charge. */
export function recruiterDiscount(state: GameState): { discount: number; recruiter: Employee | null } {
  const active = state.employees.filter(
    (e) => e.role === 'recruiter' && (e.recruiterCharges ?? 0) > 0,
  );
  const r = bestOf(active);
  if (!r) return { discount: 0, recruiter: null };
  const discount = r.tier === 'junior' ? 0.05 : r.tier === 'middle' ? 0.08 : 0.1;
  return { discount, recruiter: r };
}

export function recruiterMaxCharges(tier: SkillTier, hasHr: boolean): number {
  const base = tier === 'junior' ? 3 : tier === 'middle' ? 4 : 5;
  return hasHr ? base + 2 : base;
}

/** Team Lead coverage for auto-assign. */
export function teamLeadInfo(state: GameState): {
  lead: Employee | null;
  coverage: number;
  effectiveTier: SkillTier;
} | null {
  const leads = state.employees.filter((e) => e.role === 'team_lead');
  const lead = bestOf(leads);
  if (!lead) return null;
  const coverage = lead.tier === 'junior' ? 5 : lead.tier === 'middle' ? 10 : 16;
  const deliveryCount = state.employees.filter((e) => isDeliveryRole(e.role)).length;
  let effective: SkillTier = lead.tier;
  if (deliveryCount > coverage) {
    if (effective === 'senior') effective = 'middle';
    else if (effective === 'middle') effective = 'junior';
  }
  if (lead.satisfaction < 30) {
    if (effective === 'senior') effective = 'middle';
    else if (effective === 'middle') effective = 'junior';
  }
  return { lead, coverage, effectiveTier: effective };
}

/** Accountant vs compliance load. */
export function accountantCoverage(state: GameState): {
  covered: boolean;
  chanceReduction: number;
  penaltyReduction: number;
} {
  const acc = bestOf(state.employees.filter((e) => e.role === 'accountant'));
  const complianceLoad = state.projects.filter(
    (p) => p.status === 'inprogress' && p.engagement === 'long_delivery',
  ).length;

  if (!acc) {
    return { covered: false, chanceReduction: 0, penaltyReduction: 0 };
  }
  const cover = acc.tier === 'junior' ? 3 : acc.tier === 'middle' ? 6 : 10;
  const covered = complianceLoad <= cover;
  if (!covered) {
    return { covered: false, chanceReduction: 0.1, penaltyReduction: 0 };
  }
  if (acc.tier === 'junior') return { covered: true, chanceReduction: 0.3, penaltyReduction: 0 };
  if (acc.tier === 'middle') return { covered: true, chanceReduction: 0.5, penaltyReduction: 0.25 };
  return { covered: true, chanceReduction: 0.7, penaltyReduction: 0.5 };
}

export function baseComplianceChance(state: GameState): number {
  const load = state.projects.filter(
    (p) => p.status === 'inprogress' && p.engagement === 'long_delivery',
  ).length;
  return Math.min(0.35, 0.04 + load * 0.03);
}

