/** Decision-log contract — source for Manager Report axes (balance-spec §3.1). */

export type SkillTier = 'junior' | 'middle' | 'senior';
export type RoleId =
  | 'sales'
  | 'dev'
  | 'designer'
  | 'hr'
  | 'recruiter'
  | 'marketer'
  | 'lead_gen'
  | 'team_lead'
  | 'accountant';

export type CompanyType =
  | 'design_agency'
  | 'it_outsourcing'
  | 'product_studio'
  | 'marketing_agency';

export type SessionFormat = 'rapid_10min' | 'classical_4q';
export type SpeedMultiplier = 1 | 2 | 3;
export type ManagerLevel = 'trainee' | 'manager' | 'director';
export type EngagementType = 'one_off' | 'long_delivery' | 'recurring_retainer';
export type BonusClass = 'proactive' | 'reactive' | 'firefighting' | 'wasted';

export type StackId = 'frontend' | 'backend' | 'mobile' | 'data_ai';
export type DomainId =
  | 'ecommerce'
  | 'fintech'
  | 'healthtech'
  | 'gaming'
  | 'enterprise_b2b'
  | 'general_b2b';

export type DecisionEventType =
  | 'session_start'
  | 'hire'
  | 'assign_lead'
  | 'assign_project'
  | 'bonus'
  | 'build_room'
  | 'build_desk'
  | 'promotion_accept'
  | 'promotion_decline'
  | 'random_event'
  | 'quit'
  | 'rework'
  | 'client_churn'
  | 'retainer_payout'
  | 'near_bankruptcy'
  | 'week_snapshot'
  | 'lead_inspected'
  | 'lead_skipped'
  | 'project_inspected'
  | 'project_skipped'
  | 'candidates_rerolled'
  | 'employee_terminated'
  | 'transfer_lead'; // coop reserve — not MVP

interface BasePayload {
  /** Optional human note for flagged moments */
  note?: string;
}

export interface SessionStartPayload extends BasePayload {
  companyType: CompanyType;
  format: SessionFormat;
  speed: SpeedMultiplier;
  managerLevel: ManagerLevel;
  startBudget: number;
  sessionSeed?: number;
}

export interface HirePayload extends BasePayload {
  employeeId: string;
  role: RoleId;
  tier: SkillTier;
  salary: number;
  stack?: StackId;
  domain?: DomainId;
  deskId: string;
  roomId: string;
}

export interface AssignLeadPayload extends BasePayload {
  leadId: string;
  employeeId: string;
  domain: DomainId;
  value: number;
  idleWeeks: number;
  hadIdleSales: boolean;
  /** Domain matched the assigned sales rep */
  matched: boolean;
  /** Assigned despite no matching idle sales available */
  forced: boolean;
}

export interface AssignProjectPayload extends BasePayload {
  projectId: string;
  employeeId: string;
  domain: DomainId;
  /** Absent on Design Agency projects — Designer matches domain, not stack. */
  stack?: StackId;
  tier: SkillTier;
  value: number;
  engagement: EngagementType;
  idleWeeks: number;
  /** Dev vs stack, or Designer vs domain. */
  stackMatch: boolean;
  matched: boolean;
  forced: boolean;
}

export interface LeadInspectedPayload extends BasePayload {
  leadId: string;
  mismatch: boolean;
  idleResourceAvailable: boolean;
}

export interface LeadSkippedPayload extends BasePayload {
  leadId: string;
  mismatch: true;
  reason: 'waiting_for_match';
}

export interface ProjectInspectedPayload extends BasePayload {
  projectId: string;
  mismatch: boolean;
  idleResourceAvailable: boolean;
}

export interface ProjectSkippedPayload extends BasePayload {
  projectId: string;
  mismatch: true;
  reason: 'waiting_for_match';
}

export interface CandidatesRerolledPayload extends BasePayload {
  week: number;
  previousPool: Array<{ role: RoleId; tier: SkillTier; salary: number }>;
  rerollCountThisSession: number;
}

export interface BonusPayload extends BasePayload {
  employeeId: string;
  moraleBefore: number;
  cost: number;
  class: BonusClass;
}

export interface BuildRoomPayload extends BasePayload {
  roomId: string;
  cost: number;
  occupancyAtBuild: number;
  queuedDemand: number;
}

export interface BuildDeskPayload extends BasePayload {
  roomId: string;
  deskId: string;
  cost: number;
  occupancyAtBuild: number;
  queuedDemand: number;
}

export interface PromotionPayload extends BasePayload {
  employeeId: string;
  fromTier: SkillTier;
  toTier: SkillTier;
  salaryDelta: number;
}

export interface RandomEventPayload extends BasePayload {
  kind: 'compliance' | 'tax_audit' | 'market_spike' | 'key_client_call';
  outcome: 'pass' | 'fail' | 'mitigated';
  accountantCoverage: boolean;
  penalty?: number;
}

export interface QuitPayload extends BasePayload {
  employeeId: string;
  role: RoleId;
  morale: number;
  reason: 'burnout' | 'promotion_denied' | 'other';
}

/** Addendum 04 — player-initiated termination */
export interface EmployeeTerminatedPayload extends BasePayload {
  employeeId: string;
  role: RoleId;
  tier: SkillTier;
  weeksEmployed: number;
  reason: 'voluntary';
  /** Fraction of employed weeks spent working (0–1) */
  recentUtilization: number;
  /** Jobs finished before fire (projects closed / leads closed) */
  jobsCompleted: number;
  proratedPay: number;
  severanceCost: number;
  /** True if firing broke an active long-delivery contract */
  brokeLongDelivery: boolean;
}

export interface ReworkPayload extends BasePayload {
  projectId: string;
  employeeId: string;
  stackMatch: boolean;
  tier: SkillTier;
}

export interface ClientChurnPayload extends BasePayload {
  projectId: string;
  engagement: EngagementType;
  clientSatisfaction: number;
  remainingValue: number;
}

export interface RetainerPayoutPayload extends BasePayload {
  projectId: string;
  amount: number;
  reason: 'quarter' | 'complete';
  remainingCheckpoints: number;
}

export interface NearBankruptcyPayload extends BasePayload {
  budget: number;
  startBudget: number;
  week: number;
}

export interface WeekSnapshotPayload extends BasePayload {
  week: number;
  quarter: number;
  budget: number;
  reputation: number;
  /** Addendum 28: per-domain sales component (+5 on close). */
  domainSalesReputation?: Partial<Record<DomainId, number>>;
  /** Addendum 28: per-domain delivery component (+2 on complete). */
  domainDeliveryReputation?: Partial<Record<DomainId, number>>;
  queuedLeads: number;
  queuedProjects: number;
  idleSales: number;
  /** Idle delivery staff (Dev or Designer, depending on company type). */
  idleDevs: number;
  occupiedDesks: number;
  totalDesks: number;
  roomOccupancy: Record<string, number>;
  /** True if any queued work had a matching idle resource this week */
  anyMatchAvailable: boolean;
}

/** Reserved for coop — not emitted in MVP */
export interface TransferLeadPayload extends BasePayload {
  fromSessionId: string;
  toSessionId: string;
  leadId: string;
  value: number;
}

export type DecisionPayloadByType = {
  session_start: SessionStartPayload;
  hire: HirePayload;
  assign_lead: AssignLeadPayload;
  assign_project: AssignProjectPayload;
  bonus: BonusPayload;
  build_room: BuildRoomPayload;
  build_desk: BuildDeskPayload;
  promotion_accept: PromotionPayload;
  promotion_decline: PromotionPayload;
  random_event: RandomEventPayload;
  quit: QuitPayload;
  rework: ReworkPayload;
  client_churn: ClientChurnPayload;
  retainer_payout: RetainerPayoutPayload;
  near_bankruptcy: NearBankruptcyPayload;
  week_snapshot: WeekSnapshotPayload;
  lead_inspected: LeadInspectedPayload;
  lead_skipped: LeadSkippedPayload;
  project_inspected: ProjectInspectedPayload;
  project_skipped: ProjectSkippedPayload;
  candidates_rerolled: CandidatesRerolledPayload;
  employee_terminated: EmployeeTerminatedPayload;
  transfer_lead: TransferLeadPayload;
};

export type DecisionLogEntry = {
  [K in DecisionEventType]: {
    id: string;
    sessionId: string;
    week: number;
    eventType: K;
    payload: DecisionPayloadByType[K];
    createdAt: string;
  };
}[DecisionEventType];

export function createDecisionEntry<T extends DecisionEventType>(
  sessionId: string,
  week: number,
  eventType: T,
  payload: DecisionPayloadByType[T],
): Extract<DecisionLogEntry, { eventType: T }> {
  return {
    id: crypto.randomUUID(),
    sessionId,
    week,
    eventType,
    payload,
    createdAt: new Date().toISOString(),
  } as Extract<DecisionLogEntry, { eventType: T }>;
}
