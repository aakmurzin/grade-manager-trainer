import type { HeadlessAction, PlayerView } from '@/game/headless';

export type AgentDecision = {
  action: HeadlessAction;
  rationale: string;
};

export type PlayAgent = {
  name: string;
  decide(view: PlayerView): Promise<AgentDecision> | AgentDecision;
};
