/**
 * LLM agent — plays from rules + player-visible state.
 * Falls back to reasonable agent if no API key / parse failure.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HeadlessAction, PlayerView } from '@/game/headless';
import { createReasonableAgent, NEAR_CLOSE_HIRE_PROGRESS } from './reasonable';
import type { AgentDecision, PlayAgent } from './types';

const ACTION_SCHEMA = `Respond with ONLY valid JSON:
{
  "action": one of:
    {"type":"hire","candidateId":"..."}
    {"type":"reroll_candidates"}
    {"type":"assign_lead","leadId":"..."}
    {"type":"assign_project","projectId":"..."}
    {"type":"skip_lead","leadId":"..."}
    {"type":"skip_project","projectId":"..."}
    {"type":"give_bonus","employeeId":"..."}
    {"type":"fire","employeeId":"..."}
    {"type":"build_desk","roomId":"..."}
    {"type":"build_room"}
    {"type":"accept_promotion","employeeId":"..."}
    {"type":"decline_promotion","employeeId":"..."}
    {"type":"tick_week"}
  "rationale": "1-2 short sentences why"
}`;

function loadRulesContext(repoRoot: string): string {
  const files = [
    'docs/balance-spec.md',
    'docs/addendum-01.md',
    'docs/addendum-04.md',
    'docs/addendum-05.md',
  ];
  const chunks: string[] = [];
  for (const f of files) {
    try {
      chunks.push(`\n\n===== ${f} =====\n` + readFileSync(join(repoRoot, f), 'utf8'));
    } catch {
      /* optional */
    }
  }
  return chunks.join('').slice(0, 48000);
}

function parseDecision(text: string): AgentDecision | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { action?: HeadlessAction; rationale?: string };
    if (!parsed.action || typeof parsed.action !== 'object' || !('type' in parsed.action)) {
      return null;
    }
    return {
      action: parsed.action,
      rationale: String(parsed.rationale ?? 'LLM decision'),
    };
  } catch {
    return null;
  }
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('no_openai');
  const model = process.env.PLAYTEST_LLM_MODEL ?? 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('no_anthropic');
  const model = process.env.PLAYTEST_LLM_MODEL ?? 'claude-haiku-4-5-20251001';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}`);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  return data.content?.find((c) => c.type === 'text')?.text ?? '';
}

export function createLlmAgent(opts: {
  repoRoot: string;
  seed?: number;
}): PlayAgent {
  const fallback = createReasonableAgent(opts.seed ?? 42);
  const rules = loadRulesContext(opts.repoRoot);
  const hasKey = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

  const system = `You are playing Grade Business Trainer as a competent but imperfect agency manager.
Play like a thoughtful human reading UI hints — not a perfect optimizer, not random spam.
Prefer domain/stack matches; skip mismatches when the UI flags them unless backlog is severe.
Do not spam rerolls or actions just to look busy. Use tick_week when nothing urgent.

Hiring principle (Addendum 11) — especially for Dev:
Hire only when expected benefit exceeds cost until payback. Do NOT hire Dev "just because Sales exists".
- Before first closed lead: hire Dev only if an in-progress lead is near close (progress ≥ ~27%).
- Right after a closed lead / when a project is queued: standard good time to hire Dev.
- Defer Dev if budget is already tight after Sales/other hires — keep runway for ~8 weeks to first revenue.
Never hire Dev purely "in reserve" with no visible upcoming work. Explain timing in rationale.
Start with this logic for Dev/Designer at the opening of the game; Sales may still be hired early to open the pipeline.

Headcount review (Addendum 21) — do not freeze staff after week ~6, and do not overstaff:
Re-check Sales/Designer count from Q3 onward if a real queue has piled up (several queued projects or leads), cash has runway, and you still have only the early-game pair of delivery people. Do NOT hire a 3rd Designer just because everyone is busy — at volume spawn that is healthy utilization. Growing payroll via promotions without more output is the failure mode; an extra salary without a stuck queue is the opposite failure.
${ACTION_SCHEMA}

Game rules context:
${rules}`;

  return {
    name: hasKey ? 'llm' : 'llm_fallback_reasonable',
    async decide(view: PlayerView): Promise<AgentDecision> {
      if (!hasKey) return fallback.decide(view);

      const compact = {
        budget: view.budget,
        week: view.week,
        quarter: view.quarter,
        reputation: view.reputation,
        freeDesks: view.freeDesks,
        rerolls: view.rerollCountThisSession,
        hints: view.hints,
        candidates: view.candidates,
        employees: view.employees.map((e) => ({
          id: e.id,
          role: e.role,
          name: e.name,
          tier: e.tier,
          salary: e.salary,
          domain: e.domain,
          stack: e.stack,
          status: e.status,
          satisfaction: e.satisfaction,
          fireCost: e.fireCost,
          canAffordFire: e.canAffordFire,
        })),
        leads: view.leads.filter((l) => l.status === 'queued' || l.status === 'inprogress'),
        projects: view.projects.filter((p) => p.status === 'queued' || p.status === 'inprogress'),
        pendingPromotions: view.pendingPromotions,
        rooms: view.rooms,
        hiringHints: {
          nearCloseLeads: view.leads.filter(
            (l) => l.status === 'inprogress' && l.progress >= NEAR_CLOSE_HIRE_PROGRESS,
          ).length,
          queuedProjects: view.projects.filter((p) => p.status === 'queued').length,
          payrollQuarter: view.employees.reduce((s, e) => s + e.salary, 0),
        },
      };

      const user = `Current player-visible state:\n${JSON.stringify(compact)}\n\nChoose one action.`;

      try {
        const text = process.env.OPENAI_API_KEY
          ? await callOpenAI(system, user)
          : await callAnthropic(system, user);
        const parsed = parseDecision(text);
        if (parsed) return parsed;
      } catch {
        /* fall through */
      }
      const fb = await fallback.decide(view);
      return { ...fb, rationale: `[fallback] ${fb.rationale}` };
    },
  };
}
