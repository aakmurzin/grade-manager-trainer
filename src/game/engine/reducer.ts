import type {
  CompanyType,
  DomainId,
  EngagementType,
  ManagerLevel,
  RoleId,
  SessionFormat,
  SkillTier,
  SpeedMultiplier,
  StackId,
} from '@/game/decisionLog/types';
import type { DecisionLogEntry } from '@/game/decisionLog/types';
import {
  BONUS_COST,
  COMPANY_PROFILES,
  DESK_BASE_COST,
  DESK_COST_STEP,
  DOMAIN_REPUTATION_MISMATCH_SOFTEN,
  DOMAIN_REPUTATION_ON_CLOSE,
  DOMAIN_REPUTATION_ON_COMPLETE,
  MAX_DESKS_COMPANY,
  NEAR_BANKRUPTCY_RATIO,
  OFFICE_TIER_DESKS,
  REPUTATION_DELTAS,
  ROLE_HIRE_COOLDOWN_WEEKS,
  ROLE_SALARY_BASE,
  ROOM_COSTS,
  SKILL_TIERS,
  startBudgetFor,
  TERMINATION_SEVERANCE_RATE,
  WEEKS_PER_QUARTER,
  canHireRole,
  deliveryRoleFor,
  isDeliveryRole,
  leadFrequencyWeeks,
  pickWeightedDomain,
  pickWeightedStack,
  PROMOTION,
} from '@/game/catalog/balance';
import {
  accountantCoverage,
  baseComplianceChance,
  leadGenSpawnMult,
  marketerLeadBonus,
  recruiterDiscount,
  recruiterMaxCharges,
  salesParallelCapacity,
  teamLeadInfo,
} from '@/game/engine/support';
import {
  initRngState,
  rngFloat,
  rngInt,
  rngPick,
  type RngCarrier,
} from '@/game/engine/rng';

export type EmployeeStatus = 'idle' | 'working';

export interface Employee {
  id: string;
  role: RoleId;
  name: string;
  tier: SkillTier;
  salary: number;
  stack?: StackId;
  secondaryStack?: StackId;
  domain?: DomainId;
  satisfaction: number;
  status: EmployeeStatus;
  workId: string | null;
  roomId: string;
  deskId: string;
  completedProjects: number;
  monthsOnSameProject: number;
  promotionCooldownWeeks: number;
  recruiterCharges?: number;
  /** Week index when hired (for pro-rata + tenure). */
  hiredWeek: number;
  weeksEmployed: number;
  weeksBusy: number;
}

export interface PendingPromotion {
  employeeId: string;
  fromTier: SkillTier;
  toTier: SkillTier;
  salaryDelta: number;
}

export interface Desk {
  id: string;
  employeeId: string | null;
}

export interface Room {
  id: string;
  index: number;
  desks: Desk[];
  deskCost: number;
}

export interface Lead {
  id: string;
  value: number;
  domain: DomainId;
  status: 'queued' | 'inprogress' | 'done';
  progress: number;
  durationWeeks: number;
  assignedEmployeeId: string | null;
  idleWeeks: number;
}

export interface Project {
  id: string;
  value: number;
  /** Client business domain — Sales / Designer specialization. */
  domain: DomainId;
  /** Technical work needed — Dev specialization. Absent on Design Agency (no stack). */
  stack?: StackId;
  engagement: EngagementType;
  status: 'queued' | 'inprogress' | 'done' | 'failed';
  progress: number;
  durationWeeks: number;
  assignedEmployeeId: string | null;
  idleWeeks: number;
  clientSatisfaction: number;
  remainingCheckpoints: number;
  checkpointValue: number;
  hadRework: boolean;
}

export interface Candidate {
  id: string;
  role: RoleId;
  name: string;
  tier: SkillTier;
  salary: number;
  stack?: StackId;
  domain?: DomainId;
}

export interface QuarterPL {
  revenue: number;
  salaries: number;
  overheads: number;
  ebitda: number;
  netProfit: number;
}

export interface GameState extends RngCarrier {
  sessionId: string;
  /** Session seed — drives rngState; same seed reproduces full engine trajectory. */
  sessionSeed: number;
  companyType: CompanyType;
  format: SessionFormat;
  speed: SpeedMultiplier;
  paused: boolean;
  managerLevel: ManagerLevel;
  startBudget: number;
  budget: number;
  week: number;
  quarter: number;
  maxQuarters: number;
  reputation: number;
  /** Combined score: sales + delivery (addendum-28). Soften / UI use this. */
  domainReputation: Partial<Record<DomainId, number>>;
  domainSalesReputation: Partial<Record<DomainId, number>>;
  domainDeliveryReputation: Partial<Record<DomainId, number>>;
  rooms: Room[];
  employees: Employee[];
  candidates: Candidate[];
  leads: Lead[];
  projects: Project[];
  decisionLog: DecisionLogEntry[];
  history: QuarterPL[];
  quarterRevenue: number;
  quarterSalaries: number;
  totalRevenue: number;
  nearBankruptcyFired: boolean;
  gameOver: boolean;
  bankrupt: boolean;
  leadSpawnEvery: number;
  leadSpawnTimer: number;
  /** Addendum B — cumulative rerolls this session (Hiring Discipline). */
  rerollCountThisSession: number;
  /** Addendum 04 — weeks remaining before role can be hired again after fire. */
  roleHireCooldown: Partial<Record<RoleId, number>>;
  pendingPromotions: PendingPromotion[];
  lastEventMessage: string | null;
}

const NAMES = [
  'Alex',
  'Nastya',
  'Denis',
  'Ivan',
  'Kate',
  'Tomas',
  'Maria',
  'Jakub',
  'Olga',
  'Petr',
  'Nina',
  'Sam',
];

function uid(): string {
  return crypto.randomUUID();
}

function roll(state: GameState): number {
  return rngFloat(state);
}

function rand(state: GameState, min: number, max: number): number {
  return rngInt(state, min, max);
}

function pick<T>(state: GameState, arr: readonly T[]): T {
  return rngPick(state, arr);
}

function combinedDomainReputation(state: GameState, domain: DomainId): number {
  return (
    (state.domainSalesReputation[domain] ?? 0) + (state.domainDeliveryReputation[domain] ?? 0)
  );
}

function addDomainSalesReputation(state: GameState, domain: DomainId, delta: number): void {
  state.domainSalesReputation[domain] = (state.domainSalesReputation[domain] ?? 0) + delta;
  state.domainReputation[domain] = combinedDomainReputation(state, domain);
}

function addDomainDeliveryReputation(state: GameState, domain: DomainId, delta: number): void {
  state.domainDeliveryReputation[domain] = (state.domainDeliveryReputation[domain] ?? 0) + delta;
  state.domainReputation[domain] = combinedDomainReputation(state, domain);
}

function log(
  state: GameState,
  eventType: DecisionLogEntry['eventType'],
  payload: DecisionLogEntry['payload'],
): void {
  state.decisionLog.push({
    id: uid(),
    sessionId: state.sessionId,
    week: state.week,
    eventType,
    payload,
    createdAt: new Date().toISOString(),
  } as DecisionLogEntry);
}

function maxDesksForOffice(totalRevenue: number): number {
  if (totalRevenue >= 15000) return OFFICE_TIER_DESKS[2];
  if (totalRevenue >= 5000) return OFFICE_TIER_DESKS[1];
  return OFFICE_TIER_DESKS[0];
}

function totalDesks(state: GameState): number {
  return state.rooms.reduce((n, r) => n + r.desks.length, 0);
}

function occupiedDesks(state: GameState): number {
  return state.rooms.reduce(
    (n, r) => n + r.desks.filter((d) => d.employeeId != null).length,
    0,
  );
}

function unlockedRoles(state: GameState): RoleId[] {
  return (Object.keys(ROLE_SALARY_BASE) as RoleId[]).filter(
    (r) =>
      canHireRole(state.managerLevel, r, state.companyType) &&
      (state.roleHireCooldown[r] ?? 0) <= 0,
  );
}

function recruitRoleWeight(state: GameState, role: RoleId): number {
  const key = COMPANY_PROFILES[state.companyType].keySupport;
  if (role === key) return 5;
  // Addendum 09: Dev elevated weight (not hard-guaranteed). Addendum 17: Designer same weight.
  if (role === 'dev' || role === 'designer') return 8;
  if (role === 'sales') return 3;
  if (role === 'hr') return 2;
  if (role === 'lead_gen') return 3;
  if (role === 'recruiter' || role === 'marketer' || role === 'team_lead') return 2.5;
  if (role === 'accountant') return 2.5;
  return 1;
}

function pickRecruitRole(state: GameState, avoid: RoleId[] = []): RoleId {
  const pool = unlockedRoles(state);
  const fallback = (Object.keys(ROLE_SALARY_BASE) as RoleId[]).filter((r) =>
    canHireRole(state.managerLevel, r, state.companyType),
  );
  const base = pool.length ? pool : fallback;
  const preferred = base.filter((r) => !avoid.includes(r));
  const use = preferred.length ? preferred : base;
  const weights = use.map((r) => recruitRoleWeight(state, r));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = roll(state) * total;
  for (let i = 0; i < use.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return use[i]!;
  }
  return use[use.length - 1]!;
}

/**
 * 5-slot recruit board:
 * - Addendum 05: guaranteed ≥1 Sales when hireable (no Sales ⇒ no closes)
 * - Addendum 09: Dev is NOT hard-guaranteed — elevated weight in pickRecruitRole
 * - Addendum 17: Design Agency guarantees Sales + Designer (delivery role for this type)
 */
function fillCandidateBoard(state: GameState, count = 5): Candidate[] {
  const roles: RoleId[] = [];
  if (
    canHireRole(state.managerLevel, 'sales', state.companyType) &&
    (state.roleHireCooldown.sales ?? 0) <= 0
  ) {
    roles.push('sales');
  }
  const delivery = deliveryRoleFor(state.companyType);
  if (
    state.companyType === 'design_agency' &&
    canHireRole(state.managerLevel, delivery, state.companyType) &&
    (state.roleHireCooldown[delivery] ?? 0) <= 0
  ) {
    roles.push(delivery);
  }
  while (roles.length < count) {
    roles.push(pickRecruitRole(state, roles));
  }
  return roles.map((role) => newCandidate(state, role));
}

function newCandidate(state: GameState, role?: RoleId): Candidate {
  const pool = unlockedRoles(state);
  const chosen =
    role && canHireRole(state.managerLevel, role, state.companyType) ? role : pick(state, pool);
  // Addendum 10: Trainee market pool is Junior/Middle only — Senior via promotion (§5).
  const tier =
    state.managerLevel === 'trainee'
      ? pick(state, ['junior', 'middle'] as const)
      : pick(state, ['junior', 'middle', 'senior'] as const);
  const [lo, hi] = ROLE_SALARY_BASE[chosen];
  const base = rand(state, lo, hi);
  const salary = Math.round(base * SKILL_TIERS[tier].salaryMult);
  const cand: Candidate = {
    id: uid(),
    role: chosen,
    name: pick(state, NAMES),
    tier,
    salary,
  };
  if (chosen === 'dev') cand.stack = pickWeightedStack(state.companyType, () => roll(state));
  if (chosen === 'sales' || chosen === 'designer') {
    cand.domain = pickWeightedDomain(state.companyType, () => roll(state));
  }
  return cand;
}

function salesLeadLoad(state: GameState, employeeId: string): number {
  return state.leads.filter(
    (l) => l.assignedEmployeeId === employeeId && l.status === 'inprogress',
  ).length;
}

function salesCanTakeLead(state: GameState, emp: Employee): boolean {
  if (emp.role !== 'sales') return false;
  const cap = salesParallelCapacity(state);
  return salesLeadLoad(state, emp.id) < cap;
}

function idleSalesForLead(state: GameState, _lead: Lead): Employee[] {
  return state.employees.filter((e) => salesCanTakeLead(state, e));
}

function matchingSalesForLead(state: GameState, lead: Lead): Employee[] {
  return idleSalesForLead(state, lead).filter((e) => e.domain === lead.domain);
}

function idleDeliveryForProject(state: GameState): Employee[] {
  const role = deliveryRoleFor(state.companyType);
  return state.employees.filter((e) => e.role === role && e.status === 'idle');
}

function deliveryMatchesProject(emp: Employee, project: Project, company: CompanyType): boolean {
  if (company === 'design_agency') return emp.domain === project.domain;
  return emp.stack === project.stack;
}

function matchingDeliveryForProject(state: GameState, project: Project): Employee[] {
  return idleDeliveryForProject(state).filter((e) =>
    deliveryMatchesProject(e, project, state.companyType),
  );
}

export function leadAssignOptions(state: GameState, leadId: string) {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead || lead.status !== 'queued') {
    return { canAssign: false, mismatchOnly: false, hasIdle: false };
  }
  const idle = idleSalesForLead(state, lead);
  const matched = matchingSalesForLead(state, lead);
  return {
    canAssign: idle.length > 0,
    mismatchOnly: idle.length > 0 && matched.length === 0,
    hasIdle: idle.length > 0,
  };
}

export function projectAssignOptions(state: GameState, projectId: string) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project || project.status !== 'queued') {
    return { canAssign: false, mismatchOnly: false, hasIdle: false };
  }
  const idle = idleDeliveryForProject(state);
  const matched = matchingDeliveryForProject(state, project);
  return {
    canAssign: idle.length > 0,
    mismatchOnly: idle.length > 0 && matched.length === 0,
    hasIdle: idle.length > 0,
  };
}

function anyMatchAvailableNow(state: GameState): boolean {
  for (const lead of state.leads) {
    if (lead.status === 'queued' && matchingSalesForLead(state, lead).length > 0) return true;
  }
  for (const project of state.projects) {
    if (project.status === 'queued' && matchingDeliveryForProject(state, project).length > 0) {
      return true;
    }
  }
  return false;
}

export function createInitialState(opts: {
  companyType: CompanyType;
  format: SessionFormat;
  speed: SpeedMultiplier;
  managerLevel?: ManagerLevel;
  /** Same seed drives engine RNG; pass from batch harness for reproducible playtests. */
  seed?: number;
}): GameState {
  const managerLevel = opts.managerLevel ?? 'trainee';
  const startBudget = startBudgetFor(opts.companyType, managerLevel);
  const sessionSeed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const sessionId = uid();
  const room0: Room = {
    id: 'room-1',
    index: 0,
    desks: [
      { id: 'desk-1-0', employeeId: null },
      { id: 'desk-1-1', employeeId: null },
      { id: 'desk-1-2', employeeId: null },
    ],
    deskCost: DESK_BASE_COST,
  };

  const state: GameState = {
    sessionId,
    sessionSeed,
    rngState: initRngState(sessionSeed),
    companyType: opts.companyType,
    format: opts.format,
    speed: opts.speed,
    paused: false,
    managerLevel,
    startBudget,
    budget: startBudget,
    week: 1,
    quarter: 1,
    maxQuarters: opts.format === 'rapid_10min' ? 1 : 4,
    reputation: 40,
    domainReputation: {},
    domainSalesReputation: {},
    domainDeliveryReputation: {},
    rooms: [room0],
    employees: [],
    candidates: [],
    leads: [],
    projects: [],
    decisionLog: [],
    history: [],
    quarterRevenue: 0,
    quarterSalaries: 0,
    totalRevenue: 0,
    nearBankruptcyFired: false,
    gameOver: false,
    bankrupt: false,
    leadSpawnEvery: leadFrequencyWeeks(opts.companyType, managerLevel),
    leadSpawnTimer: 1,
    rerollCountThisSession: 0,
    roleHireCooldown: {},
    pendingPromotions: [],
    lastEventMessage: null,
  };

  state.candidates = fillCandidateBoard(state);

  log(state, 'session_start', {
    companyType: opts.companyType,
    format: opts.format,
    speed: opts.speed,
    managerLevel,
    startBudget,
    sessionSeed,
  });

  return state;
}

function findFreeDesk(state: GameState): { room: Room; desk: Desk } | null {
  for (const room of state.rooms) {
    const desk = room.desks.find((d) => d.employeeId == null);
    if (desk) return { room, desk };
  }
  return null;
}

function moraleBand(satisfaction: number): 'green' | 'yellow' | 'red' {
  if (satisfaction >= 60) return 'green';
  if (satisfaction >= 30) return 'yellow';
  return 'red';
}

function hrDecayReduction(state: GameState): number {
  const hrs = state.employees.filter((e) => e.role === 'hr');
  if (hrs.length === 0) return 0;
  const best = hrs.reduce((a, b) => (tierRank(a.tier) > tierRank(b.tier) ? a : b));
  const coverage = best.tier === 'junior' ? 6 : best.tier === 'middle' ? 12 : 20;
  const reduction = best.tier === 'junior' ? 0.2 : best.tier === 'middle' ? 0.35 : 0.55;
  const team = state.employees.length;
  if (team <= coverage) return reduction;
  return reduction * (coverage / team);
}

function tierRank(t: SkillTier): number {
  return t === 'junior' ? 0 : t === 'middle' ? 1 : 2;
}

function applyMoraleDecay(state: GameState, emp: Employee): void {
  if (emp.role === 'hr' || emp.role === 'accountant') return;
  let base = emp.status === 'working' ? 4 : 2;
  base *= SKILL_TIERS[emp.tier].moraleDecayMultiplier;
  if (emp.monthsOnSameProject >= 5) base *= 2;
  else if (emp.monthsOnSameProject >= 3) base *= 1.5;
  const reduced = base * (1 - hrDecayReduction(state));
  emp.satisfaction = Math.max(0, emp.satisfaction - reduced);
}

export type GameAction =
  | { type: 'SET_SPEED'; speed: SpeedMultiplier }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'HIRE'; candidateId: string }
  | { type: 'REROLL_CANDIDATES' }
  | { type: 'ASSIGN_LEAD'; leadId: string; employeeId?: string }
  | { type: 'ASSIGN_PROJECT'; projectId: string; employeeId?: string }
  | { type: 'INSPECT_LEAD'; leadId: string }
  | { type: 'SKIP_LEAD'; leadId: string }
  | { type: 'INSPECT_PROJECT'; projectId: string }
  | { type: 'SKIP_PROJECT'; projectId: string }
  | { type: 'GIVE_BONUS'; employeeId: string }
  | { type: 'TERMINATE_EMPLOYEE'; employeeId: string }
  | { type: 'BUILD_DESK'; roomId: string }
  | { type: 'BUILD_ROOM' }
  | { type: 'TICK_WEEK' }
  | { type: 'PROMOTION_ACCEPT'; employeeId: string }
  | { type: 'PROMOTION_DECLINE'; employeeId: string }
  | { type: 'CLEAR_EVENT_MESSAGE' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.gameOver && action.type !== 'SET_SPEED' && action.type !== 'SET_PAUSED') {
    return state;
  }

  const next: GameState = {
    ...state,
    rooms: state.rooms.map((r) => ({ ...r, desks: r.desks.map((d) => ({ ...d })) })),
    employees: state.employees.map((e) => ({ ...e })),
    candidates: [...state.candidates],
    leads: state.leads.map((l) => ({ ...l })),
    projects: state.projects.map((p) => ({ ...p })),
    decisionLog: [...state.decisionLog],
    history: [...state.history],
    domainReputation: { ...state.domainReputation },
    domainSalesReputation: { ...state.domainSalesReputation },
    domainDeliveryReputation: { ...state.domainDeliveryReputation },
    pendingPromotions: state.pendingPromotions.map((p) => ({ ...p })),
  };

  switch (action.type) {
    case 'SET_SPEED':
      next.speed = action.speed;
      return next;
    case 'SET_PAUSED':
      if (next.format === 'rapid_10min') return state;
      next.paused = action.paused;
      return next;
    case 'REROLL_CANDIDATES': {
      const previousPool = next.candidates.map((c) => ({
        role: c.role,
        tier: c.tier,
        salary: c.salary,
      }));
      next.rerollCountThisSession += 1;
      next.candidates = fillCandidateBoard(next);
      log(next, 'candidates_rerolled', {
        week: next.week,
        previousPool,
        rerollCountThisSession: next.rerollCountThisSession,
      });
      return next;
    }
    case 'HIRE':
      return hire(next, action.candidateId);
    case 'ASSIGN_LEAD':
      return assignLead(next, action.leadId, action.employeeId);
    case 'ASSIGN_PROJECT':
      return assignProject(next, action.projectId, action.employeeId);
    case 'INSPECT_LEAD':
      return inspectLead(next, action.leadId);
    case 'SKIP_LEAD':
      return skipLead(next, action.leadId);
    case 'INSPECT_PROJECT':
      return inspectProject(next, action.projectId);
    case 'SKIP_PROJECT':
      return skipProject(next, action.projectId);
    case 'GIVE_BONUS':
      return giveBonus(next, action.employeeId);
    case 'TERMINATE_EMPLOYEE':
      return terminateEmployee(next, action.employeeId);
    case 'BUILD_DESK':
      return buildDesk(next, action.roomId);
    case 'BUILD_ROOM':
      return buildRoom(next);
    case 'TICK_WEEK':
      return tickWeek(next);
    case 'PROMOTION_ACCEPT':
      return resolvePromotion(next, action.employeeId, true);
    case 'PROMOTION_DECLINE':
      return resolvePromotion(next, action.employeeId, false);
    case 'CLEAR_EVENT_MESSAGE':
      next.lastEventMessage = null;
      return next;
    default:
      return state;
  }
}

function hire(state: GameState, candidateId: string): GameState {
  const idx = state.candidates.findIndex((c) => c.id === candidateId);
  if (idx < 0) return state;
  const cand = state.candidates[idx]!;
  if ((state.roleHireCooldown[cand.role] ?? 0) > 0) return state;
  const slot = findFreeDesk(state);
  if (!slot) return state;

  const { discount, recruiter } = recruiterDiscount(state);
  const salaryPaid = Math.round(cand.salary * (1 - discount));
  if (state.budget < salaryPaid) return state;

  state.budget -= salaryPaid;
  state.quarterSalaries += salaryPaid;
  if (recruiter && recruiter.recruiterCharges != null) {
    recruiter.recruiterCharges -= 1;
  }

  const hasHr = state.employees.some((e) => e.role === 'hr');
  const emp: Employee = {
    id: uid(),
    role: cand.role,
    name: cand.name,
    tier: cand.tier,
    salary: cand.salary,
    stack: cand.stack,
    domain: cand.domain,
    satisfaction: 100,
    status: 'idle',
    workId: null,
    roomId: slot.room.id,
    deskId: slot.desk.id,
    completedProjects: 0,
    monthsOnSameProject: 0,
    promotionCooldownWeeks: 0,
    hiredWeek: state.week,
    weeksEmployed: 0,
    weeksBusy: 0,
    recruiterCharges:
      cand.role === 'recruiter' ? recruiterMaxCharges(cand.tier, hasHr) : undefined,
  };
  slot.desk.employeeId = emp.id;
  state.employees.push(emp);
  state.candidates.splice(idx, 1);
  state.candidates.push(newCandidate(state));

  log(state, 'hire', {
    employeeId: emp.id,
    role: emp.role,
    tier: emp.tier,
    salary: salaryPaid,
    stack: emp.stack,
    domain: emp.domain,
    deskId: emp.deskId,
    roomId: emp.roomId,
  });
  return state;
}

function assignLead(state: GameState, leadId: string, employeeId?: string): GameState {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead || lead.status !== 'queued') return state;

  const matchedPool = matchingSalesForLead(state, lead);
  const anyPool = idleSalesForLead(state, lead);
  const emp =
    (employeeId ? state.employees.find((e) => e.id === employeeId) : null) ??
    matchedPool[0] ??
    anyPool[0] ??
    null;
  if (!emp || !salesCanTakeLead(state, emp)) return state;

  const matched = emp.domain === lead.domain;
  const forced = matchedPool.length === 0 && anyPool.length > 0;
  const idleWeeks = lead.idleWeeks;
  const hadIdleSales = idleWeeks > 0 && matchedPool.length > 0;

  lead.status = 'inprogress';
  lead.assignedEmployeeId = emp.id;
  emp.status = 'working';
  emp.workId = lead.id;

  log(state, 'assign_lead', {
    leadId: lead.id,
    employeeId: emp.id,
    domain: lead.domain,
    value: lead.value,
    idleWeeks,
    hadIdleSales,
    matched,
    forced,
  });
  return state;
}

function assignProject(state: GameState, projectId: string, employeeId?: string): GameState {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project || project.status !== 'queued') return state;

  const matchedPool = matchingDeliveryForProject(state, project);
  const anyPool = idleDeliveryForProject(state);
  const emp =
    (employeeId ? state.employees.find((e) => e.id === employeeId) : null) ??
    matchedPool[0] ??
    anyPool[0] ??
    null;
  if (!emp || emp.role !== deliveryRoleFor(state.companyType) || emp.status !== 'idle') {
    return state;
  }

  const stackMatch = deliveryMatchesProject(emp, project, state.companyType);
  const matched = stackMatch;
  const forced = matchedPool.length === 0 && anyPool.length > 0;
  const idleWeeks = project.idleWeeks;

  project.status = 'inprogress';
  project.assignedEmployeeId = emp.id;
  emp.status = 'working';
  emp.workId = project.id;
  emp.monthsOnSameProject = 0;

  log(state, 'assign_project', {
    projectId: project.id,
    employeeId: emp.id,
    domain: project.domain,
    stack: project.stack,
    tier: emp.tier,
    value: project.value,
    engagement: project.engagement,
    idleWeeks,
    stackMatch,
    matched,
    forced,
  });
  return state;
}

function inspectLead(state: GameState, leadId: string): GameState {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead || lead.status !== 'queued') return state;
  const opts = leadAssignOptions(state, leadId);
  log(state, 'lead_inspected', {
    leadId,
    mismatch: opts.mismatchOnly,
    idleResourceAvailable: opts.hasIdle,
  });
  return state;
}

function skipLead(state: GameState, leadId: string): GameState {
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead || lead.status !== 'queued') return state;
  const opts = leadAssignOptions(state, leadId);
  if (!opts.mismatchOnly) return state;
  log(state, 'lead_inspected', {
    leadId,
    mismatch: true,
    idleResourceAvailable: true,
  });
  log(state, 'lead_skipped', {
    leadId,
    mismatch: true,
    reason: 'waiting_for_match',
  });
  return state;
}

function inspectProject(state: GameState, projectId: string): GameState {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project || project.status !== 'queued') return state;
  const opts = projectAssignOptions(state, projectId);
  log(state, 'project_inspected', {
    projectId,
    mismatch: opts.mismatchOnly,
    idleResourceAvailable: opts.hasIdle,
  });
  return state;
}

function skipProject(state: GameState, projectId: string): GameState {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project || project.status !== 'queued') return state;
  const opts = projectAssignOptions(state, projectId);
  if (!opts.mismatchOnly) return state;
  log(state, 'project_inspected', {
    projectId,
    mismatch: true,
    idleResourceAvailable: true,
  });
  log(state, 'project_skipped', {
    projectId,
    mismatch: true,
    reason: 'waiting_for_match',
  });
  return state;
}

function giveBonus(state: GameState, employeeId: string): GameState {
  const emp = state.employees.find((e) => e.id === employeeId);
  if (!emp || state.budget < BONUS_COST) return state;
  const moraleBefore = emp.satisfaction;
  const bonusClass =
    moraleBefore >= 100
      ? 'wasted'
      : moraleBefore >= 60
        ? 'proactive'
        : moraleBefore >= 30
          ? 'reactive'
          : 'firefighting';

  state.budget -= BONUS_COST;
  state.quarterSalaries += BONUS_COST;
  emp.satisfaction = Math.min(100, emp.satisfaction + 35);

  log(state, 'bonus', {
    employeeId: emp.id,
    moraleBefore,
    cost: BONUS_COST,
    class: bonusClass,
  });
  return state;
}

function buildDesk(state: GameState, roomId: string): GameState {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return state;
  const cap = maxDesksForOffice(state.totalRevenue);
  if (room.desks.length >= cap) return state;
  if (totalDesks(state) >= MAX_DESKS_COMPANY) return state;
  if (state.budget < room.deskCost) return state;

  const cost = room.deskCost;
  state.budget -= cost;
  const desk: Desk = { id: uid(), employeeId: null };
  room.desks.push(desk);
  room.deskCost = cost + DESK_COST_STEP;

  log(state, 'build_desk', {
    roomId: room.id,
    deskId: desk.id,
    cost,
    occupancyAtBuild: occupiedDesks(state) / Math.max(1, totalDesks(state)),
    queuedDemand: state.leads.filter((l) => l.status === 'queued').length +
      state.projects.filter((p) => p.status === 'queued').length,
  });
  return state;
}

function buildRoom(state: GameState): GameState {
  if (state.rooms.length >= 4) return state;
  const last = state.rooms[state.rooms.length - 1]!;
  const cap = maxDesksForOffice(state.totalRevenue);
  if (last.desks.length < cap) return state;
  const cost = ROOM_COSTS[state.rooms.length] ?? 11500;
  if (state.budget < cost) return state;

  state.budget -= cost;
  const room: Room = {
    id: `room-${state.rooms.length + 1}`,
    index: state.rooms.length,
    desks: [],
    deskCost: DESK_BASE_COST,
  };
  // Seed one free desk so the room is usable immediately
  room.desks.push({ id: uid(), employeeId: null });
  state.rooms.push(room);

  log(state, 'build_room', {
    roomId: room.id,
    cost,
    occupancyAtBuild: 0,
    queuedDemand:
      state.leads.filter((l) => l.status === 'queued').length +
      state.projects.filter((p) => p.status === 'queued').length,
  });
  return state;
}

function spawnLead(state: GameState): void {
  const profile = COMPANY_PROFILES[state.companyType];
  const [lo, hi] = profile.checkBand;
  let value = rand(state, lo, hi);
  value = Math.round(value * (1 + marketerLeadBonus(state)));
  if (state.reputation >= 70) value = Math.round(value * 1.15);
  if (state.reputation < 20) value = Math.round(value * 0.85);

  state.leads.push({
    id: uid(),
    value,
    domain: pickWeightedDomain(state.companyType, () => roll(state)),
    status: 'queued',
    progress: 0,
    durationWeeks: Math.max(0.25, profile.closeDuration),
    assignedEmployeeId: null,
    idleWeeks: 0,
  });
}

function closeLead(state: GameState, lead: Lead): void {
  const emp = state.employees.find((e) => e.id === lead.assignedEmployeeId);
  if (!emp) return;

  let chance = SKILL_TIERS[emp.tier].salesCloseChance;
  if (emp.domain && emp.domain !== lead.domain) {
    const domainRep = combinedDomainReputation(state, lead.domain);
    chance -= domainRep >= DOMAIN_REPUTATION_MISMATCH_SOFTEN ? 0.1 : 0.2;
  }

  // Free sales only when no other parallel leads remain (Lead Gen capacity)
  const otherLeads = state.leads.filter(
    (l) =>
      l.id !== lead.id &&
      l.assignedEmployeeId === emp.id &&
      l.status === 'inprogress',
  );
  if (otherLeads.length === 0) {
    emp.status = 'idle';
    emp.workId = null;
  } else {
    emp.workId = otherLeads[0]!.id;
    emp.status = 'working';
  }

  if (roll(state) > chance) {
    // Variant A — failed close: lead is lost, no project
    return;
  }

  emp.completedProjects += 1;
  addDomainSalesReputation(state, lead.domain, DOMAIN_REPUTATION_ON_CLOSE);

  const engagement = COMPANY_PROFILES[state.companyType].engagement;
  const duration =
    engagement === 'long_delivery'
      ? pick(state, [3, 6, 12] as const)
      : engagement === 'recurring_retainer'
        ? 12
        : COMPANY_PROFILES[state.companyType].baseDeliveryDuration;

  const checkpoints =
    engagement === 'one_off'
      ? 1
      : engagement === 'recurring_retainer'
        ? Math.max(1, Math.ceil(duration / WEEKS_PER_QUARTER))
        : duration;
  const project: Project = {
    id: uid(),
    value: lead.value,
    domain: lead.domain,
    engagement,
    status: 'queued',
    progress: 0,
    durationWeeks: duration,
    assignedEmployeeId: null,
    idleWeeks: 0,
    clientSatisfaction: 70,
    remainingCheckpoints: checkpoints,
    checkpointValue: Math.round(lead.value / checkpoints),
    hadRework: false,
  };
  if (state.companyType !== 'design_agency') {
    project.stack = pickWeightedStack(state.companyType, () => roll(state));
  }
  state.projects.push(project);
}

function advanceProject(state: GameState, project: Project): void {
  const emp = state.employees.find((e) => e.id === project.assignedEmployeeId);
  if (!emp) return;

  let durationMod = SKILL_TIERS[emp.tier].durationModifier;
  const stackMatch = deliveryMatchesProject(emp, project, state.companyType);
  if (!stackMatch) durationMod *= 1.5;

  const progressPerWeek = 100 / (project.durationWeeks * durationMod);
  project.progress += progressPerWeek;
  emp.monthsOnSameProject += 1;

  // Rework check mid-way
  if (!project.hadRework && project.progress >= 50 && project.progress - progressPerWeek < 50) {
    let rework = SKILL_TIERS[emp.tier].devReworkRate;
    if (!stackMatch) rework += 0.15;
    if (roll(state) < rework) {
      project.hadRework = true;
      project.progress = Math.max(0, project.progress - 25);
      project.durationWeeks = Math.ceil(project.durationWeeks * 1.5);
      log(state, 'rework', {
        projectId: project.id,
        employeeId: emp.id,
        stackMatch,
        tier: emp.tier,
      });
    }
  }

  // Long-delivery: stochastic monthly checkpoints. Retainer pays at quarter-end (endQuarter).
  if (
    (project.engagement === 'long_delivery' || project.engagement === 'recurring_retainer') &&
    project.progress < 100
  ) {
    if (project.engagement === 'long_delivery' && roll(state) < 0.35) {
      payCheckpoint(state, project, emp);
    }

    const satBand = moraleBand(project.clientSatisfaction);
    let churn =
      satBand === 'green' ? 0.02 : satBand === 'yellow' ? 0.15 : 0.35;
    if (emp.satisfaction < 30) churn += 0.1;
    if (roll(state) < churn / 4) {
      failProject(state, project, emp);
      return;
    }
  }

  if (project.progress >= 100) {
    completeProject(state, project, emp);
  }
}

function payCheckpoint(state: GameState, project: Project, emp: Employee): void {
  if (project.remainingCheckpoints <= 0) return;
  const amount = project.checkpointValue;
  state.budget += amount;
  state.quarterRevenue += amount;
  state.totalRevenue += amount;
  project.remainingCheckpoints -= 1;

  // Delivery quality → client sat
  let delta = emp.tier === 'senior' ? 4 : emp.tier === 'middle' ? 2 : -1;
  if (project.stack && emp.stack !== project.stack) delta -= 5;
  project.clientSatisfaction = Math.max(0, Math.min(100, project.clientSatisfaction + delta));
}

function payRetainerInstallment(
  state: GameState,
  project: Project,
  emp: Employee,
  reason: 'quarter' | 'complete',
): number {
  if (project.remainingCheckpoints <= 0) return 0;
  const amount = project.checkpointValue;
  payCheckpoint(state, project, emp);
  state.reputation += REPUTATION_DELTAS.retainerSurviveQuarter;
  log(state, 'retainer_payout', {
    projectId: project.id,
    amount,
    reason,
    remainingCheckpoints: project.remainingCheckpoints,
  });
  return amount;
}

function payAliveRetainers(state: GameState): void {
  for (const project of state.projects) {
    if (project.status !== 'inprogress' || project.engagement !== 'recurring_retainer') continue;
    const emp = state.employees.find((e) => e.id === project.assignedEmployeeId);
    if (!emp) continue;
    payRetainerInstallment(state, project, emp, 'quarter');
  }
}

function failProject(state: GameState, project: Project, emp: Employee): void {
  project.status = 'failed';
  emp.status = 'idle';
  emp.workId = null;
  emp.monthsOnSameProject = 0;
  const remaining = project.remainingCheckpoints * project.checkpointValue;
  state.reputation +=
    project.engagement === 'recurring_retainer'
      ? REPUTATION_DELTAS.retainerChurn
      : REPUTATION_DELTAS.longDeliveryFail;
  log(state, 'client_churn', {
    projectId: project.id,
    engagement: project.engagement,
    clientSatisfaction: project.clientSatisfaction,
    remainingValue: remaining,
  });
}

function completeProject(state: GameState, project: Project, emp: Employee): void {
  project.status = 'done';
  emp.status = 'idle';
  emp.workId = null;
  emp.completedProjects += 1;
  emp.monthsOnSameProject = 0;

  if (project.engagement === 'one_off') {
    state.budget += project.value;
    state.quarterRevenue += project.value;
    state.totalRevenue += project.value;
    state.reputation += 1;
  } else if (project.engagement === 'long_delivery') {
    // Pay remaining
    const remaining = project.remainingCheckpoints * project.checkpointValue;
    state.budget += remaining;
    state.quarterRevenue += remaining;
    state.totalRevenue += remaining;
    state.reputation += REPUTATION_DELTAS.longDeliveryDone;
  } else if (project.engagement === 'recurring_retainer') {
    payRetainerInstallment(state, project, emp, 'complete');
  }

  addDomainDeliveryReputation(state, project.domain, DOMAIN_REPUTATION_ON_COMPLETE);

  // Promotion eligibility (Sales / Dev / Designer)
  if ((emp.role === 'sales' || isDeliveryRole(emp.role)) && emp.tier !== 'senior') {
    const need =
      emp.tier === 'junior' ? PROMOTION.juniorToMiddleProjects : PROMOTION.middleToSeniorProjects;
    if (
      emp.completedProjects >= need &&
      emp.satisfaction >= PROMOTION.satisfactionGate &&
      emp.promotionCooldownWeeks <= 0 &&
      !state.pendingPromotions.some((p) => p.employeeId === emp.id)
    ) {
      // Queue at next quarter-end — mark ready
      emp.completedProjects = need; // keep at threshold until dialog
    }
  }
}

function endQuarter(state: GameState): void {
  // Retainer: quarterly fee for contracts still alive this EOQ (addendum-24 / spec §6).
  payAliveRetainers(state);

  const revenue = state.quarterRevenue;
  const salaries = state.quarterSalaries;
  const recurring = state.employees.reduce((s, e) => s + e.salary, 0);
  const totalSalaries = salaries + recurring;
  state.budget -= recurring;
  const overheads = Math.round(totalSalaries * 0.15);
  state.budget -= overheads;
  const ebitda = revenue - totalSalaries - overheads;
  const netProfit = ebitda;
  state.history.push({ revenue, salaries: totalSalaries, overheads, ebitda, netProfit });
  state.quarterRevenue = 0;
  state.quarterSalaries = 0;

  // Queue promotion dialogs
  for (const emp of state.employees) {
    if (emp.role !== 'sales' && !isDeliveryRole(emp.role)) continue;
    if (emp.tier === 'senior') continue;
    if (emp.promotionCooldownWeeks > 0) continue;
    if (emp.satisfaction < PROMOTION.satisfactionGate) continue;
    const need =
      emp.tier === 'junior' ? PROMOTION.juniorToMiddleProjects : PROMOTION.middleToSeniorProjects;
    if (emp.completedProjects < need) continue;
    if (state.pendingPromotions.some((p) => p.employeeId === emp.id)) continue;
    const raise = emp.tier === 'junior' ? PROMOTION.juniorRaise : PROMOTION.middleRaise;
    const toTier: SkillTier = emp.tier === 'junior' ? 'middle' : 'senior';
    state.pendingPromotions.push({
      employeeId: emp.id,
      fromTier: emp.tier,
      toTier,
      salaryDelta: Math.round(emp.salary * raise),
    });
  }

  if (state.quarter >= state.maxQuarters || state.budget < 0) {
    state.gameOver = true;
    state.bankrupt = state.budget < 0;
  } else {
    state.quarter += 1;
  }
}

function resolvePromotion(state: GameState, employeeId: string, accept: boolean): GameState {
  const idx = state.pendingPromotions.findIndex((p) => p.employeeId === employeeId);
  if (idx < 0) return state;
  const promo = state.pendingPromotions[idx]!;
  const emp = state.employees.find((e) => e.id === employeeId);
  state.pendingPromotions.splice(idx, 1);
  if (!emp) return state;

  if (accept) {
    emp.tier = promo.toTier;
    emp.salary += promo.salaryDelta;
    emp.completedProjects = 0;
    log(state, 'promotion_accept', {
      employeeId: emp.id,
      fromTier: promo.fromTier,
      toTier: promo.toTier,
      salaryDelta: promo.salaryDelta,
    });
  } else {
    emp.promotionCooldownWeeks = PROMOTION.declineCooldownWeeks;
    emp.satisfaction = Math.max(0, emp.satisfaction - 15);
    log(state, 'promotion_decline', {
      employeeId: emp.id,
      fromTier: promo.fromTier,
      toTier: promo.toTier,
      salaryDelta: promo.salaryDelta,
    });
  }
  return state;
}

function tickWeek(state: GameState): GameState {
  if (state.paused || state.gameOver) return state;

  // Tenure / utilization clocks + hire-role cooldowns (Addendum 04)
  for (const emp of state.employees) {
    emp.weeksEmployed += 1;
    if (emp.status === 'working') emp.weeksBusy += 1;
    if (emp.promotionCooldownWeeks > 0) emp.promotionCooldownWeeks -= 1;
  }
  for (const role of Object.keys(state.roleHireCooldown) as RoleId[]) {
    const left = state.roleHireCooldown[role] ?? 0;
    if (left <= 1) delete state.roleHireCooldown[role];
    else state.roleHireCooldown[role] = left - 1;
  }

  // Spawn leads (Lead Gen shortens interval; capacity via salesParallelCapacity).
  // Interval may be <1 week (Design volume, addendum-21): drain the timer in a loop
  // so some ticks spawn two leads. Math.max(1, …) used to collapse that to 1/week.
  state.leadSpawnTimer -= 1;
  const spawnBase = leadFrequencyWeeks(state.companyType, state.managerLevel);
  const spawnInterval = Math.max(0.25, spawnBase * leadGenSpawnMult(state));
  state.leadSpawnEvery = spawnInterval;
  let spawnGuard = 0;
  while (state.leadSpawnTimer <= 0 && spawnGuard++ < 4) {
    if (state.reputation < 20 && roll(state) < 0.25) {
      // doom spiral — skip this spawn slot
    } else {
      spawnLead(state);
    }
    state.leadSpawnTimer += spawnInterval;
  }

  // Idle queue aging
  for (const lead of state.leads) {
    if (lead.status === 'queued') lead.idleWeeks += 1;
  }
  for (const project of state.projects) {
    if (project.status === 'queued') project.idleWeeks += 1;
  }

  // Team Lead auto-assign
  autoAssign(state);

  // Advance in-progress leads — respect sales parallel capacity
  for (const lead of state.leads) {
    if (lead.status !== 'inprogress') continue;
    lead.progress += 100 / lead.durationWeeks;
    if (lead.progress >= 100) {
      lead.status = 'done';
      closeLead(state, lead);
    }
  }
  state.leads = state.leads.filter((l) => l.status !== 'done');

  // Advance projects
  for (const project of state.projects) {
    if (project.status === 'inprogress') advanceProject(state, project);
  }
  state.projects = state.projects.filter((p) => p.status !== 'done' && p.status !== 'failed');

  // Compliance random event
  maybeCompliance(state);

  // Morale + quits
  for (const emp of [...state.employees]) {
    applyMoraleDecay(state, emp);
    if (emp.role === 'team_lead') {
      const info = teamLeadInfo(state);
      if (info && info.lead?.id === emp.id) {
        const deliveryCount = state.employees.filter((e) =>
          isDeliveryRole(e.role),
        ).length;
        const extra = 1 + Math.max(0, (deliveryCount - info.coverage) / Math.max(1, info.coverage));
        emp.satisfaction = Math.max(0, emp.satisfaction - (extra - 1) * 2);
      }
    }
    if (emp.satisfaction <= 0) {
      quitEmployee(state, emp.id, 'burnout');
    }
  }

  // Near bankruptcy
  if (
    !state.nearBankruptcyFired &&
    state.budget < state.startBudget * NEAR_BANKRUPTCY_RATIO
  ) {
    state.nearBankruptcyFired = true;
    log(state, 'near_bankruptcy', {
      budget: state.budget,
      startBudget: state.startBudget,
      week: state.week,
    });
  }

  if (state.budget < 0) {
    state.gameOver = true;
    state.bankrupt = true;
  }

  // Snapshot
  const roomOccupancy: Record<string, number> = {};
  for (const room of state.rooms) {
    const occ = room.desks.filter((d) => d.employeeId).length;
    roomOccupancy[room.id] = room.desks.length ? occ / room.desks.length : 0;
  }
  log(state, 'week_snapshot', {
    week: state.week,
    quarter: state.quarter,
    budget: state.budget,
    reputation: state.reputation,
    domainSalesReputation: { ...state.domainSalesReputation },
    domainDeliveryReputation: { ...state.domainDeliveryReputation },
    queuedLeads: state.leads.filter((l) => l.status === 'queued').length,
    queuedProjects: state.projects.filter((p) => p.status === 'queued').length,
    idleSales: state.employees.filter((e) => e.role === 'sales' && salesCanTakeLead(state, e))
      .length,
    idleDevs: idleDeliveryForProject(state).length,
    occupiedDesks: occupiedDesks(state),
    totalDesks: totalDesks(state),
    roomOccupancy,
    anyMatchAvailable: anyMatchAvailableNow(state),
  });

  // Quarter boundary
  if (state.week % WEEKS_PER_QUARTER === 0) {
    endQuarter(state);
  }

  if (!state.gameOver) state.week += 1;
  return state;
}

function autoAssign(state: GameState): void {
  const info = teamLeadInfo(state);
  if (!info) return;

  // Assign queued projects to idle delivery staff
  for (const project of state.projects) {
    if (project.status !== 'queued') continue;
    let idleDevs = idleDeliveryForProject(state);
    if (!idleDevs.length) break;

    if (info.effectiveTier !== 'junior') {
      const matched = matchingDeliveryForProject(state, project);
      if (matched.length) idleDevs = matched;
    }
    if (info.effectiveTier === 'senior') {
      idleDevs = [...idleDevs].sort((a, b) => b.salary - a.salary); // prefer higher value staff proxy
      // prefer high-value projects already iterating in queue order — sort projects by value first pass
    }

    const emp = idleDevs[0];
    if (!emp) continue;
    assignProject(state, project.id, emp.id);
  }

  // Sort remaining high-value if senior TL
}

function maybeCompliance(state: GameState): void {
  let chance = baseComplianceChance(state);
  const acc = accountantCoverage(state);
  chance *= 1 - acc.chanceReduction;
  if (roll(state) > chance) return;

  const basePenalty = 800 + state.quarter * 200;
  const penalty = Math.round(basePenalty * (1 - acc.penaltyReduction));
  const outcome = acc.covered && roll(state) < 0.55 ? 'mitigated' : 'fail';

  if (outcome === 'fail') {
    state.budget -= penalty;
    state.reputation += -3;
    state.lastEventMessage = `Compliance check failed (−$${penalty})`;
  } else {
    state.lastEventMessage = 'Compliance check mitigated by Accountant';
  }

  log(state, 'random_event', {
    kind: 'compliance',
    outcome,
    accountantCoverage: acc.covered,
    penalty: outcome === 'fail' ? penalty : 0,
  });
}

function quitEmployee(state: GameState, employeeId: string, reason: 'burnout' | 'promotion_denied' | 'other'): void {
  const emp = state.employees.find((e) => e.id === employeeId);
  if (!emp) return;

  if (emp.workId) {
    const lead = state.leads.find((l) => l.id === emp.workId);
    if (lead) {
      lead.status = 'queued';
      lead.assignedEmployeeId = null;
      lead.progress = 0;
    }
    const project = state.projects.find((p) => p.id === emp.workId);
    if (project) {
      project.status = 'queued';
      project.assignedEmployeeId = null;
      project.progress = 0;
    }
  }

  for (const room of state.rooms) {
    for (const desk of room.desks) {
      if (desk.employeeId === emp.id) desk.employeeId = null;
    }
  }

  log(state, 'quit', {
    employeeId: emp.id,
    role: emp.role,
    morale: emp.satisfaction,
    reason,
  });

  state.employees = state.employees.filter((e) => e.id !== employeeId);
}

/** Addendum 04 — player fires an employee (pro-rata + severance + role cooldown). */
function terminateEmployee(state: GameState, employeeId: string): GameState {
  const emp = state.employees.find((e) => e.id === employeeId);
  if (!emp) return state;

  const quarterStartWeek = (state.quarter - 1) * WEEKS_PER_QUARTER + 1;
  const workStart = Math.max(emp.hiredWeek, quarterStartWeek);
  const weeksWorkedThisQuarter = Math.max(0, state.week - workStart);
  const proratedPay = Math.round((emp.salary / WEEKS_PER_QUARTER) * weeksWorkedThisQuarter);
  const severanceCost = Math.round(emp.salary * TERMINATION_SEVERANCE_RATE);
  const totalCost = proratedPay + severanceCost;
  if (state.budget < totalCost) {
    state.lastEventMessage = `Need ${totalCost} to fire ${emp.name} (pro-rata + severance)`;
    return state;
  }

  let brokeLongDelivery = false;
  if (emp.workId) {
    const lead = state.leads.find((l) => l.id === emp.workId);
    if (lead) {
      lead.status = 'queued';
      lead.assignedEmployeeId = null;
      lead.progress = 0;
    }
    const project = state.projects.find((p) => p.id === emp.workId);
    if (project && project.status === 'inprogress') {
      if (project.engagement === 'long_delivery') {
        // Same effect as losing the contractor mid-contract
        failProject(state, project, emp);
        brokeLongDelivery = true;
      } else {
        project.status = 'queued';
        project.assignedEmployeeId = null;
        project.progress = 0;
      }
    }
  }

  state.budget -= totalCost;
  state.quarterSalaries += totalCost;
  state.roleHireCooldown[emp.role] = ROLE_HIRE_COOLDOWN_WEEKS;

  const recentUtilization =
    emp.weeksEmployed > 0 ? emp.weeksBusy / emp.weeksEmployed : emp.status === 'working' ? 1 : 0;

  log(state, 'employee_terminated', {
    employeeId: emp.id,
    role: emp.role,
    tier: emp.tier,
    weeksEmployed: emp.weeksEmployed,
    reason: 'voluntary',
    recentUtilization: Math.round(recentUtilization * 100) / 100,
    jobsCompleted: emp.completedProjects,
    proratedPay,
    severanceCost,
    brokeLongDelivery,
  });

  for (const room of state.rooms) {
    for (const desk of room.desks) {
      if (desk.employeeId === emp.id) desk.employeeId = null;
    }
  }
  state.pendingPromotions = state.pendingPromotions.filter((p) => p.employeeId !== emp.id);
  state.employees = state.employees.filter((e) => e.id !== employeeId);

  // Drop cooldown-blocked roles from the recruit board and refill
  state.candidates = state.candidates.filter(
    (c) => (state.roleHireCooldown[c.role] ?? 0) <= 0,
  );
  while (state.candidates.length < 5) {
    const pool = unlockedRoles(state);
    if (!pool.length) break;
    state.candidates.push(newCandidate(state));
  }

  state.lastEventMessage = `Fired ${emp.name} (−$${totalCost}: pro-rata $${proratedPay} + severance $${severanceCost})`;
  return state;
}

/** Cost preview for UI (does not mutate). */
export function terminationCost(state: GameState, employeeId: string): {
  proratedPay: number;
  severanceCost: number;
  total: number;
  canAfford: boolean;
  brokeLongDelivery: boolean;
} | null {
  const emp = state.employees.find((e) => e.id === employeeId);
  if (!emp) return null;
  const quarterStartWeek = (state.quarter - 1) * WEEKS_PER_QUARTER + 1;
  const workStart = Math.max(emp.hiredWeek, quarterStartWeek);
  const weeksWorkedThisQuarter = Math.max(0, state.week - workStart);
  const proratedPay = Math.round((emp.salary / WEEKS_PER_QUARTER) * weeksWorkedThisQuarter);
  const severanceCost = Math.round(emp.salary * TERMINATION_SEVERANCE_RATE);
  const total = proratedPay + severanceCost;
  const project = emp.workId
    ? state.projects.find((p) => p.id === emp.workId && p.status === 'inprogress')
    : null;
  return {
    proratedPay,
    severanceCost,
    total,
    canAfford: state.budget >= total,
    brokeLongDelivery: project?.engagement === 'long_delivery',
  };
}
