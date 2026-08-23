import {
  createInitialState,
  gameReducer,
  type CompanyType,
  type GameAction,
  type GameState,
  type ManagerLevel,
  type SpeedMultiplier,
} from '@/game';
import { buildPlayerView, type PlayerView } from '@/game/headless/playerView';

export type HeadlessAction =
  | { type: 'hire'; candidateId: string }
  | { type: 'reroll_candidates' }
  | { type: 'assign_lead'; leadId: string; employeeId?: string }
  | { type: 'assign_project'; projectId: string; employeeId?: string }
  | { type: 'skip_lead'; leadId: string }
  | { type: 'skip_project'; projectId: string }
  | { type: 'give_bonus'; employeeId: string }
  | { type: 'fire'; employeeId: string }
  | { type: 'build_desk'; roomId: string }
  | { type: 'build_room' }
  | { type: 'accept_promotion'; employeeId: string }
  | { type: 'decline_promotion'; employeeId: string }
  | { type: 'tick_week' };

export type ApplyResult = {
  success: boolean;
  error?: string;
  state: PlayerView;
};

function toGameAction(action: HeadlessAction): GameAction[] {
  switch (action.type) {
    case 'hire':
      return [{ type: 'HIRE', candidateId: action.candidateId }];
    case 'reroll_candidates':
      return [{ type: 'REROLL_CANDIDATES' }];
    case 'assign_lead':
      return [
        { type: 'INSPECT_LEAD', leadId: action.leadId },
        { type: 'ASSIGN_LEAD', leadId: action.leadId, employeeId: action.employeeId },
      ];
    case 'assign_project':
      return [
        { type: 'INSPECT_PROJECT', projectId: action.projectId },
        {
          type: 'ASSIGN_PROJECT',
          projectId: action.projectId,
          employeeId: action.employeeId,
        },
      ];
    case 'skip_lead':
      return [
        { type: 'INSPECT_LEAD', leadId: action.leadId },
        { type: 'SKIP_LEAD', leadId: action.leadId },
      ];
    case 'skip_project':
      return [
        { type: 'INSPECT_PROJECT', projectId: action.projectId },
        { type: 'SKIP_PROJECT', projectId: action.projectId },
      ];
    case 'give_bonus':
      return [{ type: 'GIVE_BONUS', employeeId: action.employeeId }];
    case 'fire':
      return [{ type: 'TERMINATE_EMPLOYEE', employeeId: action.employeeId }];
    case 'build_desk':
      return [{ type: 'BUILD_DESK', roomId: action.roomId }];
    case 'build_room':
      return [{ type: 'BUILD_ROOM' }];
    case 'accept_promotion':
      return [{ type: 'PROMOTION_ACCEPT', employeeId: action.employeeId }];
    case 'decline_promotion':
      return [{ type: 'PROMOTION_DECLINE', employeeId: action.employeeId }];
    case 'tick_week':
      return [{ type: 'TICK_WEEK' }];
    default:
      return [];
  }
}

export class HeadlessSession {
  private state: GameState;

  constructor(opts: {
    companyType: CompanyType;
    speed?: SpeedMultiplier;
    managerLevel?: ManagerLevel;
    seed?: number;
  }) {
    this.state = createInitialState({
      companyType: opts.companyType,
      speed: opts.speed ?? 1,
      managerLevel: opts.managerLevel ?? 'trainee',
      seed: opts.seed,
    });
  }

  getState(): PlayerView {
    return buildPlayerView(this.state);
  }

  /** Raw engine state — for scoring only after game over, not for the agent. */
  getEngineState(): GameState {
    return this.state;
  }

  applyAction(action: HeadlessAction): ApplyResult {
    if (this.state.gameOver && action.type !== 'tick_week') {
      return { success: false, error: 'game_over', state: this.getState() };
    }

    const before = JSON.stringify(fingerprint(this.state));
    const steps = toGameAction(action);
    if (!steps.length) {
      return { success: false, error: 'unknown_action', state: this.getState() };
    }

    for (const step of steps) {
      this.state = gameReducer(this.state, step);
    }

    const after = JSON.stringify(fingerprint(this.state));
    const changed = before !== after;
    // tick_week always "succeeds" even if paused/gameOver short-circuits
    const success =
      action.type === 'tick_week' || action.type === 'reroll_candidates' || changed;

    return {
      success,
      error: success ? undefined : 'action_had_no_effect',
      state: this.getState(),
    };
  }
}

function fingerprint(state: GameState) {
  return {
    budget: state.budget,
    week: state.week,
    quarter: state.quarter,
    gameOver: state.gameOver,
    employees: state.employees.map((e) => e.id),
    candidates: state.candidates.map((c) => c.id),
    leads: state.leads.map((l) => `${l.id}:${l.status}:${l.assignedEmployeeId}`),
    projects: state.projects.map((p) => `${p.id}:${p.status}:${p.assignedEmployeeId}`),
    desks: state.rooms.flatMap((r) => r.desks.map((d) => d.employeeId)),
    pending: state.pendingPromotions.map((p) => p.employeeId),
    rerolls: state.rerollCountThisSession,
    // Skip/inspect only append decision log — must count as a successful action.
    logLen: state.decisionLog.length,
  };
}

export type { PlayerView };
