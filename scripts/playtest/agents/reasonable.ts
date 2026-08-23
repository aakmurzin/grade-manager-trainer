/**
 * "Reasonable manager" heuristic — not optimal, with intentional noise.
 * Mirrors what a careful human reading mismatch hints would usually do.
 *
 * Addendum 11: Dev hire is benefit/cost gated (work signal + cash runway),
 * not "Sales hired → take Dev immediately".
 * Addendum 21: keep reviewing headcount all game (grow with revenue), not only weeks 1–6.
 */
import { BONUS_COST, FREE_REROLLS_PER_SESSION, deliveryRoleFor, funnelWeeksToRevenue, ROLE_LABELS } from '@/game/catalog/balance';
import type { HeadlessAction, PlayerView } from '@/game/headless';
import type { AgentDecision, PlayAgent } from './types';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick<T>(rand: () => number, arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(rand() * arr.length)]!;
}

/** Typical weeks to first $ (addendum-07) — overridden per company via funnelWeeksToRevenue. */
/** Addendum 14: hire first delivery role when an in-progress lead is this far through close. */
export const NEAR_CLOSE_HIRE_PROGRESS = 27;
/** Addendum 21: extra delivery/sales caps for mid-game growth (was a hard 2 Designers). */
const MAX_DELIVERY_STAFF = 3;
const MAX_DELIVERY_STAFF_RETAINER = 4;
const MAX_SALES_STAFF = 3;
const SATURATED_WEEKS_BEFORE_GROWTH = 4;
const GROWTH_COOLDOWN_WEEKS = 8;
const HEADCOUNT_REVIEW_EVERY = 4;
/** Extra hire from Q3 — Q1–Q2 stay at A11 (≤2 delivery). 3rd salary too early bankrupts Design. */
const HEADCOUNT_REVIEW_AFTER_WEEK = 24;
const COMPLIANCE_LOAD_THRESHOLD = 2;
const COMPLIANCE_LOAD_WEEKS_BEFORE_HIRE = 2;

type DeliveryHireVerdict =
  | { hire: true; rationale: string }
  | { hire: false; rationale: string };

/**
 * Hire delivery (Dev / Designer) only when expected work is visible and cash can survive the funnel lag.
 * Moments: near-close lead, queued/active project (post-close), or defer if tight.
 */
function evaluateDeliveryHire(
  view: PlayerView,
  candidate: { id: string; name: string; tier: string; stack: string | null; domain: string | null; salary: number },
  opts: { scaling: boolean },
): DeliveryHireVerdict {
  const deliveryRole = deliveryRoleFor(view.companyType);
  const label = ROLE_LABELS[deliveryRole];
  const funnelWeeks = funnelWeeksToRevenue(view.companyType);
  const queuedProjects = view.projects.filter(
    (p) => p.status === 'queued' || p.status === 'inprogress',
  );
  const nearCloseLeads = view.leads.filter(
    (l) => l.status === 'inprogress' && l.progress >= NEAR_CLOSE_HIRE_PROGRESS,
  );
  const hasPostCloseWork = queuedProjects.length > 0;
  const hasNearCloseSignal = nearCloseLeads.length > 0;

  const payrollQuarter = view.employees.reduce((s, e) => s + e.salary, 0);
  const burnThroughFunnel =
    candidate.salary + Math.round(((payrollQuarter + candidate.salary) / 12) * funnelWeeks);
  const runwayOk = view.budget - candidate.salary >= view.startBudget * 0.12;
  const funnelAffordable = view.budget >= burnThroughFunnel * 0.55;

  const spec =
    candidate.stack ? `, ${candidate.stack}` : candidate.domain ? `, ${candidate.domain}` : '';

  if (!runwayOk || !funnelAffordable) {
    return {
      hire: false,
      rationale: `Defer ${label} ${candidate.name} — cash tight for ~${funnelWeeks}w funnel (budget ${view.budget}, salary ${candidate.salary}).`,
    };
  }

  if (opts.scaling) {
    const idleDelivery = view.employees.filter(
      (e) => e.role === deliveryRole && e.status === 'idle',
    ).length;
    const projectBacklog = view.projects.filter((p) => p.status === 'queued').length;
    if (projectBacklog > idleDelivery) {
      return {
        hire: true,
        rationale: `Hire ${label} ${candidate.name} (${candidate.tier}${spec}) — project backlog ${projectBacklog} > idle ${label}s.`,
      };
    }
    return {
      hire: false,
      rationale: `Skip extra ${label} — no project backlog beyond current capacity.`,
    };
  }

  if (hasPostCloseWork) {
    return {
      hire: true,
      rationale: `Hire ${label} ${candidate.name} (${candidate.tier}${spec}) — closed work in queue, not speculative.`,
    };
  }
  if (hasNearCloseSignal) {
    const lead = nearCloseLeads[0]!;
    return {
      hire: true,
      rationale: `Hire ${label} ${candidate.name} (${candidate.tier}${spec}) — lead ${lead.domain} at ${lead.progress}% close, work imminent.`,
    };
  }

  return {
    hire: false,
    rationale: `Wait on ${label} — no near-close lead (≥${NEAR_CLOSE_HIRE_PROGRESS}%) and no project yet; avoid burning salary before work exists.`,
  };
}

function payrollOf(view: PlayerView): number {
  return view.employees.reduce((s, e) => s + e.salary, 0);
}

function complianceLoadOf(view: PlayerView): number {
  return view.projects.filter(
    (p) =>
      p.status === 'inprogress' &&
      (p.engagement === 'long_delivery' || p.engagement === 'recurring_retainer'),
  ).length;
}

function staffUtilization(view: PlayerView) {
  const deliveryRole = deliveryRoleFor(view.companyType);
  const delivery = view.employees.filter((e) => e.role === deliveryRole);
  const sales = view.employees.filter((e) => e.role === 'sales');
  const idleD = delivery.filter((e) => e.status === 'idle').length;
  const idleS = sales.filter((e) => e.status === 'idle').length;
  const queuedP = view.projects.filter((p) => p.status === 'queued').length;
  const inProgressP = view.projects.filter((p) => p.status === 'inprogress').length;
  const queuedL = view.leads.filter((l) => l.status === 'queued').length;
  const inProgressL = view.leads.filter((l) => l.status === 'inprogress').length;
  return {
    deliveryCount: delivery.length,
    salesCount: sales.length,
    idleD,
    idleS,
    queuedP,
    inProgressP,
    queuedL,
    deliverySaturated: delivery.length > 0 && idleD === 0 && queuedP + inProgressP > 0,
    salesSaturated: sales.length > 0 && idleS === 0 && queuedL + inProgressL > 0,
  };
}

export function createReasonableAgent(seed = 1): PlayAgent {
  const rand = rng(seed);
  let steps = 0;
  /** Skips only log intent — lead stays queued; don't re-skip same id until week advances. */
  const skippedThisWeek = new Set<string>();
  let lastWeek = -1;
  /** Consecutive weeks every delivery/sales seat is busy — addendum-21 growth trigger. */
  let saturatedWeeks = 0;
  let lastSeenHeadcount = 0;
  let payrollWhenHeadcountLastChanged = 0;
  let weekWhenHeadcountLastChanged = 0;
  let sawSaturationThisWeek = false;
  let elevatedComplianceWeeks = 0;
  let sawComplianceLoadThisWeek = false;

  return {
    name: 'reasonable_noisy',
    decide(view: PlayerView): AgentDecision {
      steps += 1;
      const u = staffUtilization(view);
      const payroll = payrollOf(view);
      const headcount = view.employees.length;
      if (headcount !== lastSeenHeadcount) {
        lastSeenHeadcount = headcount;
        payrollWhenHeadcountLastChanged = payroll;
        weekWhenHeadcountLastChanged = view.week;
      }
      if (view.week !== lastWeek) {
        skippedThisWeek.clear();
        if (lastWeek >= 0) {
          if (sawSaturationThisWeek) saturatedWeeks += 1;
          else saturatedWeeks = 0;
          if (sawComplianceLoadThisWeek) elevatedComplianceWeeks += 1;
          else elevatedComplianceWeeks = 0;
        }
        sawSaturationThisWeek = false;
        sawComplianceLoadThisWeek = false;
        lastWeek = view.week;
      }
      if (u.deliverySaturated || u.salesSaturated) sawSaturationThisWeek = true;
      const complianceLoad = complianceLoadOf(view);
      if (complianceLoad >= COMPLIANCE_LOAD_THRESHOLD) sawComplianceLoadThisWeek = true;
      // ~12% chance of a visibly suboptimal nudge each decision
      const noisy = rand() < 0.12;

      const decide = (action: HeadlessAction, rationale: string): AgentDecision => ({
        action,
        rationale: noisy ? `${rationale} (slightly rushed)` : rationale,
      });

      // Promotions first — accept if cash buffer looks OK
      const promo = view.pendingPromotions[0];
      if (promo) {
        const bufferOk = view.budget > promo.salaryDelta * 8 + view.startBudget * 0.15;
        if (bufferOk && !noisy) {
          return decide(
            { type: 'accept_promotion', employeeId: promo.employeeId },
            `Accept promotion for ${promo.name}: cash buffer covers raise.`,
          );
        }
        if (!bufferOk || (noisy && rand() < 0.5)) {
          return decide(
            { type: 'decline_promotion', employeeId: promo.employeeId },
            `Decline promotion for ${promo.name}: budget feels tight for the raise.`,
          );
        }
        return decide(
          { type: 'accept_promotion', employeeId: promo.employeeId },
          `Accept promotion for ${promo.name}.`,
        );
      }

      // Morale rescue
      const lowMorale = view.employees
        .filter((e) => e.satisfaction < 45)
        .sort((a, b) => a.satisfaction - b.satisfaction);
      if (lowMorale[0] && view.budget >= BONUS_COST + 2000 && (!noisy || rand() < 0.4)) {
        const e = lowMorale[0];
        return decide(
          { type: 'give_bonus', employeeId: e.id },
          `Bonus for ${e.name}: satisfaction ${e.satisfaction} looks risky.`,
        );
      }

      // Assign matching work first
      const matchLeads = view.leads.filter(
        (l) => l.status === 'queued' && l.canAssign && !l.mismatchOnly,
      );
      if (matchLeads[0]) {
        const l = matchLeads[0]!;
        return decide(
          { type: 'assign_lead', leadId: l.id },
          `Assign lead ${l.domain} — domain match available.`,
        );
      }
      const matchProjects = view.projects.filter(
        (p) => p.status === 'queued' && p.canAssign && !p.mismatchOnly,
      );
      if (matchProjects[0]) {
        const p = matchProjects[0]!;
        return decide(
          { type: 'assign_project', projectId: p.id },
          `Assign project ${p.domain}${p.stack ? `/${p.stack}` : ''} — match available.`,
        );
      }

      // Mismatch: skip while under the company idle gate; force once stale.
      // Force-ready work is handled before any skip so a fresh mismatch lead
      // cannot starve a project that already hit the gate (addendum-19).
      const mismatchLeads = view.leads.filter(
        (l) => l.status === 'queued' && l.canAssign && l.mismatchOnly,
      );
      const mismatchProjects = view.projects.filter(
        (p) => p.status === 'queued' && p.canAssign && p.mismatchOnly,
      );
      const backlogPressure =
        view.leads.filter((l) => l.status === 'queued').length +
        view.projects.filter((p) => p.status === 'queued').length;
      const idleGate = view.forceAssignIdleThreshold;
      const stale = (idleWeeks: number) =>
        backlogPressure >= 4 || idleWeeks >= idleGate;

      const staleProject = mismatchProjects.find((p) => stale(p.idleWeeks));
      if (staleProject) {
        return decide(
          { type: 'assign_project', projectId: staleProject.id },
          `Forced mismatch on project ${staleProject.stack ?? staleProject.domain}: queue pressure / idle ${staleProject.idleWeeks}w (gate ${idleGate}w).`,
        );
      }
      const staleLead = mismatchLeads.find((l) => stale(l.idleWeeks));
      if (staleLead) {
        return decide(
          { type: 'assign_lead', leadId: staleLead.id },
          `Forced mismatch on lead ${staleLead.domain}: queue pressure (${backlogPressure}) / idle ${staleLead.idleWeeks}w (gate ${idleGate}w).`,
        );
      }

      if (mismatchLeads[0]) {
        const l = mismatchLeads.find((x) => !skippedThisWeek.has(x.id)) ?? mismatchLeads[0]!;
        if (noisy && rand() < 0.35) {
          return decide(
            { type: 'assign_lead', leadId: l.id },
            `Forced mismatch on lead ${l.domain}: queue pressure (${backlogPressure}) / idle ${l.idleWeeks}w (gate ${idleGate}w).`,
          );
        }
        if (!skippedThisWeek.has(l.id)) {
          skippedThisWeek.add(l.id);
          return decide(
            { type: 'skip_lead', leadId: l.id },
            `Skip mismatched lead ${l.domain} — waiting for domain match.`,
          );
        }
      }
      if (mismatchProjects[0]) {
        const p =
          mismatchProjects.find((x) => !skippedThisWeek.has(x.id)) ?? mismatchProjects[0]!;
        if (noisy && rand() < 0.35) {
          return decide(
            { type: 'assign_project', projectId: p.id },
            `Forced mismatch on project ${p.stack ?? p.domain}: queue pressure / idle ${p.idleWeeks}w (gate ${idleGate}w).`,
          );
        }
        if (!skippedThisWeek.has(p.id)) {
          skippedThisWeek.add(p.id);
          return decide(
            { type: 'skip_project', projectId: p.id },
            `Skip mismatched project ${p.stack ?? p.domain} — waiting for match.`,
          );
        }
      }

      const salesCount = view.employees.filter((e) => e.role === 'sales').length;
      const deliveryRole = deliveryRoleFor(view.companyType);
      const deliveryLabel = ROLE_LABELS[deliveryRole];
      const deliveryCount = view.employees.filter((e) => e.role === deliveryRole).length;
      const leadGenCount = view.employees.filter((e) => e.role === 'lead_gen').length;
      const queuedLeads = view.leads.filter((l) => l.status === 'queued').length;

      // Desk space before hire
      if (view.freeDesks === 0) {
        const room = view.rooms.find((r) => r.deskCount < 6 && view.budget >= r.nextDeskCost);
        if (room && (salesCount + deliveryCount < 8 || queuedLeads > 0)) {
          return decide(
            { type: 'build_desk', roomId: room.id },
            `Build desk — need capacity before hiring.`,
          );
        }
        if (view.budget >= 2500 && view.rooms.length < 3 && salesCount + deliveryCount >= 3) {
          return decide({ type: 'build_room' }, `Build room — office is full.`);
        }
      }

      const hireable = view.candidates.filter((c) => c.canHire);
      const needSales = salesCount === 0 || (queuedLeads >= 2 && salesCount < 2);
      const salesCand = hireable.filter((c) => c.role === 'sales');
      const deliveryCand = hireable.filter((c) => c.role === deliveryRole);
      const leadGenCand = hireable.filter((c) => c.role === 'lead_gen');
      const accountantCand = hireable.filter((c) => c.role === 'accountant');
      const accountantCount = view.employees.filter((e) => e.role === 'accountant').length;

      if (needSales && salesCand[0] && !noisy) {
        const sorted = [...salesCand].sort((a, b) => a.salary - b.salary);
        const c = sorted[0]!;
        return decide(
          { type: 'hire', candidateId: c.id },
          `Hire Sales ${c.name} (${c.tier}${c.domain ? `, ${c.domain}` : ''}) — pipeline needs closers.`,
        );
      }

      // Addendum 11/17: first delivery hire — work signal + runway
      if (deliveryCount === 0 && salesCount > 0 && deliveryCand[0]) {
        const sorted = [...deliveryCand].sort((a, b) => a.salary - b.salary);
        const c = sorted[0]!;
        const verdict = evaluateDeliveryHire(view, c, { scaling: false });
        if (verdict.hire && !(noisy && rand() < 0.25)) {
          return decide({ type: 'hire', candidateId: c.id }, verdict.rationale);
        }
        if (!verdict.hire && noisy && rand() < 0.15) {
          return decide(
            { type: 'hire', candidateId: c.id },
            `Hire ${deliveryLabel} ${c.name} early against better judgment.`,
          );
        }
      }

      // Addendum 31: retainer-aware Dev hire — queued retainers waiting for delivery
      const queuedRetainers = view.projects.filter(
        (p) => p.status === 'queued' && p.engagement === 'recurring_retainer',
      ).length;
      const maxDevRetainer =
        view.companyType === 'marketing_agency' ? MAX_DELIVERY_STAFF_RETAINER : MAX_DELIVERY_STAFF;
      if (
        queuedRetainers >= 1 &&
        deliveryCount < maxDevRetainer &&
        deliveryCand[0] &&
        view.budget >= deliveryCand[0].salary * 2
      ) {
        const c = [...deliveryCand].sort((a, b) => a.salary - b.salary)[0]!;
        const runwayOk = view.budget - c.salary >= view.startBudget * 0.10;
        if (runwayOk && !(noisy && rand() < 0.2)) {
          return decide(
            { type: 'hire', candidateId: c.id },
            `Hire ${deliveryLabel} ${c.name} (${c.tier}) — ${queuedRetainers} queued retainer(s) await delivery.`,
          );
        }
      }

      // Addendum 37: Accountant hire — repeated long-cycle portfolio implies compliance exposure.
      const accountantTriggerActive =
        view.companyType === 'marketing_agency' &&
        accountantCount === 0 &&
        complianceLoad >= COMPLIANCE_LOAD_THRESHOLD &&
        elevatedComplianceWeeks >= COMPLIANCE_LOAD_WEEKS_BEFORE_HIRE;
      if (accountantTriggerActive && accountantCand[0]) {
        const c = [...accountantCand].sort((a, b) => a.salary - b.salary)[0]!;
        const runwayOk = view.budget - c.salary >= view.startBudget * 0.1;
        if (runwayOk && view.budget >= c.salary * 2 && !(noisy && rand() < 0.2)) {
          return decide(
            { type: 'hire', candidateId: c.id },
            `Hire Accountant ${c.name} (${c.tier}) — compliance load ${complianceLoad} held for ${elevatedComplianceWeeks}w.`,
          );
        }
      }

      // Opportunistic hire: matching domain sales or lead gen — not speculative delivery
      if (hireable.length && view.budget > view.startBudget * 0.35) {
        const domainsNeeded = new Set(
          view.leads.filter((l) => l.status === 'queued' || l.status === 'inprogress').map((l) => l.domain),
        );
        const domainSales = salesCand.find((c) => c.domain && domainsNeeded.has(c.domain));
        if (domainSales && salesCount < 3) {
          return decide(
            { type: 'hire', candidateId: domainSales.id },
            `Hire Sales ${domainSales.name} for domain ${domainSales.domain} matching queue.`,
          );
        }
        if (salesCount >= 1 && leadGenCount === 0 && leadGenCand[0] && salesCount < 3) {
          const c = leadGenCand[0]!;
          return decide(
            { type: 'hire', candidateId: c.id },
            `Hire Lead Gen ${c.name} to feed the pipeline.`,
          );
        }
        if (deliveryCount >= 1 && deliveryCount < 2 && deliveryCand[0] && salesCount >= 1) {
          const c = [...deliveryCand].sort((a, b) => a.salary - b.salary)[0]!;
          const verdict = evaluateDeliveryHire(view, c, { scaling: true });
          if (verdict.hire) {
            return decide({ type: 'hire', candidateId: c.id }, verdict.rationale);
          }
        }
        if (salesCount < 2 && salesCand[0]) {
          const c = [...salesCand].sort((a, b) => a.salary - b.salary)[0]!;
          return decide(
            { type: 'hire', candidateId: c.id },
            `Hire Sales ${c.name} — still thin on closers.`,
          );
        }
      }

      // Addendum 21: periodic headcount review — grow staff with revenue, not only at start.
      // Extra seats only when a real queue exists. "All busy" + empty queue is healthy
      // utilization (2 Designers already cover 0.75w spawn); a 3rd salary in Q2 bankrupted
      // the first combined batch.
      const reviewTick =
        view.quarter >= 3 &&
        view.week >= HEADCOUNT_REVIEW_AFTER_WEEK &&
        (view.week - 1) % HEADCOUNT_REVIEW_EVERY === 0;
      const cooldownOk =
        weekWhenHeadcountLastChanged === 0 ||
        view.week >= weekWhenHeadcountLastChanged + GROWTH_COOLDOWN_WEEKS;
      const payrollGrewFrozenStaff =
        headcount > 0 && payroll >= payrollWhenHeadcountLastChanged * 1.08;
      const growthBudgetOk = view.budget > view.startBudget * 0.35;
      const realDeliveryBacklog = u.queuedP >= 3;
      const realSalesBacklog = u.queuedL >= 3;
      const shouldReviewHeadcount =
        view.quarter >= 3 &&
        cooldownOk &&
        growthBudgetOk &&
        (reviewTick || saturatedWeeks >= SATURATED_WEEKS_BEFORE_GROWTH || payrollGrewFrozenStaff) &&
        (realDeliveryBacklog || realSalesBacklog);

      if (shouldReviewHeadcount && hireable.length) {
        if (realDeliveryBacklog && deliveryCount < MAX_DELIVERY_STAFF && deliveryCand[0]) {
          const c = [...deliveryCand].sort((a, b) => a.salary - b.salary)[0]!;
          const verdict = evaluateDeliveryHire(view, c, { scaling: true });
          if (verdict.hire && !(noisy && rand() < 0.2)) {
            return decide(
              { type: 'hire', candidateId: c.id },
              `Headcount review w${view.week}: ${verdict.rationale}`,
            );
          }
        }
        if (realSalesBacklog && salesCount < MAX_SALES_STAFF && salesCand[0] && !noisy) {
          const c = [...salesCand].sort((a, b) => a.salary - b.salary)[0]!;
          return decide(
            { type: 'hire', candidateId: c.id },
            `Headcount review w${view.week}: Hire Sales ${c.name} — lead queue ${u.queuedL}.`,
          );
        }
      }

      // Reroll: Sales critical always; delivery only when we would actually hire one now
      const freeLeft = FREE_REROLLS_PER_SESSION - view.rerollCountThisSession;
      const poolRoles = new Set(view.candidates.map((c) => c.role));
      const wouldHireDeliveryNow =
        (deliveryCount === 0 &&
          salesCount > 0 &&
          evaluateDeliveryHire(
            view,
            { id: 'x', name: '?', tier: 'junior', stack: null, domain: null, salary: 1100 },
            { scaling: false },
          ).hire) ||
        (deliveryCount >= 1 &&
          deliveryCount < MAX_DELIVERY_STAFF &&
          view.quarter >= 3 &&
          realDeliveryBacklog &&
          evaluateDeliveryHire(
            view,
            { id: 'x', name: '?', tier: 'junior', stack: null, domain: null, salary: 1100 },
            { scaling: true },
          ).hire);
      const needAccountantNow = accountantTriggerActive;
      const needGrowthSales = shouldReviewHeadcount && realSalesBacklog && salesCount < MAX_SALES_STAFF;
      const missingCritical =
        ((needSales || needGrowthSales) && !poolRoles.has('sales')) ||
        (wouldHireDeliveryNow && !poolRoles.has(deliveryRole)) ||
        (needAccountantNow && !poolRoles.has('accountant'));
      if (
        freeLeft > 0 &&
        missingCritical &&
        view.rerollCountThisSession < FREE_REROLLS_PER_SESSION + (noisy ? 1 : 0)
      ) {
        return decide(
          { type: 'reroll_candidates' },
          `Reroll pool — missing role we would hire now. Free rerolls left ~${freeLeft}.`,
        );
      }

      // Rare fire: idle expensive sales when cash is critical and mismatched
      if (view.budget < view.startBudget * 0.2) {
        const idleSales = view.employees.filter(
          (e) => e.role === 'sales' && e.status === 'idle' && e.canAffordFire,
        );
        const victim = pick(rand, idleSales);
        if (victim && rand() < 0.25) {
          return decide(
            { type: 'fire', employeeId: victim.id },
            `Fire idle ${victim.name} — cash critically low.`,
          );
        }
      }

      // Prefer surfacing delivery-wait rationale occasionally when that's the main deferral
      if (deliveryCount === 0 && salesCount > 0 && view.week <= 6) {
        const probe = evaluateDeliveryHire(
          view,
          { id: 'x', name: deliveryLabel, tier: 'junior', stack: null, domain: null, salary: 1100 },
          { scaling: false },
        );
        if (!probe.hire) {
          return decide({ type: 'tick_week' }, `${probe.rationale} Advance week ${view.week}.`);
        }
      }

      return decide(
        { type: 'tick_week' },
        `Advance week ${view.week} — no urgent action this beat.`,
      );
    },
  };
}
