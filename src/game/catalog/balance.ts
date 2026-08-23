import type {
  CompanyType,
  DomainId,
  EngagementType,
  ManagerLevel,
  RoleId,
  SkillTier,
  StackId,
} from '@/game/decisionLog/types';

/** Hypotheses for first build — calibrate after live runs (balance-spec §12). */

export const WEEKS_PER_QUARTER = 12;
export const BONUS_COST = 300;
export const MAX_DESKS_COMPANY = 30;
export const NEAR_BANKRUPTCY_RATIO = 0.1;

export const MANAGER_UNLOCK = {
  /** Avg Manager Report score over last N trainee sessions */
  managerScore: 55,
  managerSessions: 3,
  directorScore: 65,
  directorReputation: 50,
} as const;

export const START_BUDGET: Record<ManagerLevel, number> = {
  trainee: 18000,
  manager: 14000,
  director: 10000,
};

/** Per-session cash. Global table is by level; Design Trainee gets a Q1 buffer (addendum-22). */
export function startBudgetFor(company: CompanyType, managerLevel: ManagerLevel): number {
  const base = START_BUDGET[managerLevel];
  if (managerLevel === 'trainee' && company === 'design_agency') return base + 2000;
  return base;
}

export const COMPANY_PROFILES: Record<
  CompanyType,
  {
    label: string;
    leadFrequency: 'high' | 'medium' | 'low';
    engagement: EngagementType;
    checkBand: [number, number];
    variance: 'low' | 'medium' | 'high';
    domains: DomainId[];
    keySupport?: RoleId;
    unlockLevel: ManagerLevel;
    /** Sales close duration in weeks (was a global 2). */
    closeDuration: number;
    /** One-off delivery duration in weeks at stored project length; Middle speed via durationModifier. */
    baseDeliveryDuration: number;
    /**
     * Weeks a queued mismatch may wait before forced assign (addendum-19).
     * Design volume: 1. Other types keep the Dev-stack patience (~3).
     */
    forceAssignIdleThreshold: number;
  }
> = {
  design_agency: {
    label: 'Design Agency',
    leadFrequency: 'high',
    engagement: 'one_off',
    checkBand: [900, 1100], // addendum-51 final (paired A48/A50)
    variance: 'low',
    domains: ['ecommerce', 'general_b2b'],
    unlockLevel: 'trainee',
    // Addendum 17 draft — volume shop: tiny tickets, sub-week close, 1w Designer delivery
    closeDuration: 0.5,
    baseDeliveryDuration: 1,
    forceAssignIdleThreshold: 1,
  },
  product_studio: {
    label: 'Product Studio',
    leadFrequency: 'low',
    engagement: 'one_off',
    checkBand: [2000, 8000],
    variance: 'high',
    domains: ['gaming', 'healthtech'],
    unlockLevel: 'trainee',
    closeDuration: 2,
    baseDeliveryDuration: 3,
    forceAssignIdleThreshold: 3,
  },
  it_outsourcing: {
    label: 'IT Outsourcing',
    leadFrequency: 'medium',
    engagement: 'long_delivery',
    checkBand: [3000, 12000],
    variance: 'low',
    domains: ['enterprise_b2b', 'fintech'],
    keySupport: 'accountant',
    unlockLevel: 'manager',
    closeDuration: 2,
    baseDeliveryDuration: 3,
    forceAssignIdleThreshold: 3,
  },
  marketing_agency: {
    label: 'Marketing Agency',
    leadFrequency: 'high',
    engagement: 'recurring_retainer',
    // addendum-43 paired: [5000,7000] beats [4500,6500] on same seeds (no polarization)
    checkBand: [5000, 7000],
    variance: 'medium',
    domains: ['ecommerce', 'gaming'],
    keySupport: 'marketer',
    unlockLevel: 'director',
    closeDuration: 2,
    baseDeliveryDuration: 3,
    forceAssignIdleThreshold: 3,
  },
};

export const ROLE_UNLOCK: Record<RoleId, ManagerLevel> = {
  sales: 'trainee',
  dev: 'trainee',
  designer: 'trainee',
  hr: 'trainee',
  recruiter: 'manager',
  marketer: 'manager',
  lead_gen: 'manager',
  team_lead: 'manager',
  accountant: 'director',
};

export const ROLE_LABELS: Record<RoleId, string> = {
  sales: 'Sales',
  dev: 'Dev',
  designer: 'Designer',
  hr: 'HR',
  recruiter: 'Recruiter',
  marketer: 'Marketer',
  lead_gen: 'Lead Gen',
  team_lead: 'Team Lead',
  accountant: 'Accountant',
};

/** Design Agency delivers with Designer (domain match). Everyone else uses Dev (stack match). */
export function deliveryRoleFor(company: CompanyType): 'dev' | 'designer' {
  return company === 'design_agency' ? 'designer' : 'dev';
}

export function isDeliveryRole(role: RoleId): boolean {
  return role === 'dev' || role === 'designer';
}

export function companyUsesStack(company: CompanyType): boolean {
  return company !== 'design_agency';
}

export const SKILL_TIERS: Record<
  SkillTier,
  {
    salesCloseChance: number;
    devReworkRate: number;
    durationModifier: number;
    moraleDecayMultiplier: number;
    salaryMult: number;
  }
> = {
  junior: {
    salesCloseChance: 0.6,
    devReworkRate: 0.35,
    durationModifier: 1,
    moraleDecayMultiplier: 1.3,
    salaryMult: 0.85,
  },
  middle: {
    salesCloseChance: 0.8,
    devReworkRate: 0.15,
    durationModifier: 0.85,
    moraleDecayMultiplier: 1,
    salaryMult: 1,
  },
  senior: {
    salesCloseChance: 0.95,
    devReworkRate: 0.05,
    durationModifier: 0.7,
    moraleDecayMultiplier: 0.8,
    salaryMult: 1.35,
  },
};

export const ROLE_SALARY_BASE: Record<RoleId, [number, number]> = {
  sales: [800, 1200],
  dev: [1000, 1500],
  designer: [1000, 1500],
  hr: [700, 1000],
  recruiter: [750, 1100],
  marketer: [800, 1200],
  lead_gen: [700, 1050],
  team_lead: [1200, 1800],
  accountant: [900, 1400],
};

export const STACKS: StackId[] = ['frontend', 'backend', 'mobile', 'data_ai'];
export const DOMAINS: DomainId[] = [
  'ecommerce',
  'fintech',
  'healthtech',
  'gaming',
  'enterprise_b2b',
  'general_b2b',
];

/**
 * Lead-domain spawn weights by company (post-playtest patch §5).
 * Replaces uniform pick so a Sales hire in the company's focus domains
 * sees ~40–50% match rate instead of ~20%.
 */
export const DOMAIN_SPAWN_WEIGHTS: Record<CompanyType, Record<DomainId, number>> = {
  design_agency: {
    ecommerce: 40,
    general_b2b: 30,
    gaming: 10,
    healthtech: 10,
    fintech: 5,
    enterprise_b2b: 5,
  },
  it_outsourcing: {
    ecommerce: 10,
    general_b2b: 15,
    gaming: 10,
    healthtech: 15,
    fintech: 40,
    enterprise_b2b: 10,
  },
  product_studio: {
    ecommerce: 15,
    general_b2b: 10,
    gaming: 35,
    healthtech: 25,
    fintech: 10,
    enterprise_b2b: 5,
  },
  marketing_agency: {
    ecommerce: 35,
    general_b2b: 10,
    gaming: 30,
    healthtech: 10,
    fintech: 5,
    enterprise_b2b: 10,
  },
};

/** Weeks after a forced mismatch where a freed match still counts as "avoidable". */
export const AVOIDABLE_MISMATCH_WINDOW_WEEKS = 3;
/** First N candidate rerolls per session are free (Hiring Discipline).
 * Addendum 05: raised from 2→3 after pool grew to 5 + guaranteed Sales. */
export const FREE_REROLLS_PER_SESSION = 3;
/** Weeks after firing a role before you can hire that role again (Addendum 04). */
export const ROLE_HIRE_COOLDOWN_WEEKS = 2;
/** Severance as a fraction of quarterly salary (Addendum 04). */
export const TERMINATION_SEVERANCE_RATE = 0.5;

export function pickWeightedDomain(
  company: CompanyType,
  roll: () => number,
): DomainId {
  const weights = DOMAIN_SPAWN_WEIGHTS[company];
  const entries = DOMAINS.map((d) => ({ d, w: weights[d] ?? 0 })).filter((e) => e.w > 0);
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = roll() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.d;
  }
  return entries[entries.length - 1]?.d ?? 'general_b2b';
}

/**
 * Project/Dev stack spawn weights by company (Addendum 08).
 * Replaces uniform 25% — same class of fix as DOMAIN_SPAWN_WEIGHTS.
 * Draft weights; recalibrate after post-fix playtest batch.
 */
export const STACK_SPAWN_WEIGHTS: Record<CompanyType, Record<StackId, number>> = {
  design_agency: {
    frontend: 45,
    backend: 15,
    mobile: 20,
    data_ai: 20,
  },
  it_outsourcing: {
    frontend: 25,
    backend: 40,
    mobile: 20,
    data_ai: 15,
  },
  product_studio: {
    frontend: 30,
    backend: 25,
    mobile: 30,
    data_ai: 15,
  },
  marketing_agency: {
    frontend: 35,
    backend: 15,
    mobile: 15,
    data_ai: 35,
  },
};

export function pickWeightedStack(
  company: CompanyType,
  roll: () => number,
): StackId {
  const weights = STACK_SPAWN_WEIGHTS[company];
  const entries = STACKS.map((s) => ({ s, w: weights[s] ?? 0 })).filter((e) => e.w > 0);
  const total = entries.reduce((sum, e) => sum + e.w, 0);
  let r = roll() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.s;
  }
  return entries[entries.length - 1]?.s ?? 'frontend';
}

/**
 * Lead spawn interval in game weeks.
 * Manager/Director: high 1.8 / medium 2.5 / low 4.
 * Trainee Design Agency: 0.75w (addendum-21; some ticks spawn 2 leads).
 */
export function leadFrequencyWeeks(
  company: CompanyType,
  managerLevel: ManagerLevel = 'manager',
): number {
  // Addendum 17/21: volume Design. 0.75w ⇒ ~1.33 leads/week (some ticks spawn 2).
  if (managerLevel === 'trainee' && company === 'design_agency') return 0.75;
  const f = COMPANY_PROFILES[company].leadFrequency;
  return f === 'high' ? 1.8 : f === 'medium' ? 2.5 : 4;
}

/** Agent runway heuristic — Design's close+delivery is ~2 ticks, not the old 8w funnel. */
export function funnelWeeksToRevenue(company: CompanyType): number {
  return company === 'design_agency' ? 3 : 8;
}

export const ROOM_COSTS = [0, 2500, 6500, 11500] as const;
export const DESK_BASE_COST = 1000;
export const DESK_COST_STEP = 500;

export const OFFICE_TIER_DESKS = [6, 9, 12] as const;

export const PROMOTION = {
  juniorToMiddleProjects: 2,
  middleToSeniorProjects: 3,
  satisfactionGate: 60,
  juniorRaise: 0.35,
  middleRaise: 0.45,
  declineCooldownWeeks: 6,
} as const;

export const REPUTATION_DELTAS = {
  oneOffDone: 1,
  longDeliveryDone: 5,
  longDeliveryFail: -8,
  retainerSurviveQuarter: 2,
  retainerChurn: -10,
  complianceHit: -3,
} as const;

export const LONG_DELIVERY_DURATIONS = [1, 3, 6, 12] as const;

export const CLIENT_CHURN_BY_SATISFACTION = {
  green: 0.02,
  yellow: 0.15,
  red: 0.35,
} as const;

/**
 * Sales domain-mismatch close penalty is −20pp, or −10pp once combined
 * domainReputation (sales + delivery) in that vertical is this high
 * (addendum-26: 50→25; addendum-28: score is the sum of two components).
 */
export const DOMAIN_REPUTATION_MISMATCH_SOFTEN = 25;
/** Addendum 27/28: sales component — specialization accrues on successful close. */
export const DOMAIN_REPUTATION_ON_CLOSE = 5;
/** Delivery component when work actually finishes (draft, uncalibrated). */
export const DOMAIN_REPUTATION_ON_COMPLETE = 2;

/** Real-time seconds per game week at 1×.
 * One quarter = 10 minutes = 12 weeks → 50s/week.
 * Override with NEXT_PUBLIC_WEEK_SECONDS only for local debug. */
export const SECONDS_PER_WEEK_1X = Number(process.env.NEXT_PUBLIC_WEEK_SECONDS || 50);

/** Wall-clock length of one quarter at 1× (minutes). */
export const QUARTER_MINUTES_1X = (WEEKS_PER_QUARTER * SECONDS_PER_WEEK_1X) / 60;

export function levelRank(level: ManagerLevel): number {
  return level === 'trainee' ? 0 : level === 'manager' ? 1 : 2;
}

export function canAccessCompany(level: ManagerLevel, company: CompanyType): boolean {
  return levelRank(level) >= levelRank(COMPANY_PROFILES[company].unlockLevel);
}

export function canHireRole(
  level: ManagerLevel,
  role: RoleId,
  company?: CompanyType,
): boolean {
  if (levelRank(level) < levelRank(ROLE_UNLOCK[role])) return false;
  if (role === 'designer') return company === 'design_agency';
  if (role === 'dev') return company !== 'design_agency';
  return true;
}
