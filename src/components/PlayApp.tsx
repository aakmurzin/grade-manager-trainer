'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  COMPANY_PROFILES,
  QUARTER_MINUTES_1X,
  ROLE_LABELS,
  SECONDS_PER_WEEK_1X,
  WEEKS_PER_QUARTER,
  canAccessCompany,
  companyUsesStack,
  createInitialState,
  deliveryRoleFor,
  gameReducer,
  leadAssignOptions,
  projectAssignOptions,
  terminationCost,
  type CompanyType,
  type GameState,
  type ManagerLevel,
  type SessionFormat,
  type SpeedMultiplier,
} from '@/game';
import { computeManagerReport } from '@/game/report/computeManagerReport';
import { PLTable } from '@/components/PLTable';
import { ManagerReportView } from '@/components/ManagerReportView';
import { OfficeCanvas } from '@/render/OfficeCanvas';

type Phase = 'select' | 'play' | 'report';

function money(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Weeks left until close / ship (ceil of remaining duration). */
function weeksLeft(durationWeeks: number, progress: number) {
  return Math.max(0, Math.ceil(durationWeeks * (1 - Math.min(100, progress) / 100)));
}

function WorkProgressBar({
  progress,
  variant = 'lead',
}: {
  progress: number;
  variant?: 'lead' | 'project';
}) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div className={`work-progress${variant === 'project' ? ' project' : ''}`} aria-hidden>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PlayApp() {
  const { data: auth } = useSession();
  const [phase, setPhase] = useState<Phase>('select');
  const [companyType, setCompanyType] = useState<CompanyType>('design_agency');
  const [format, setFormat] = useState<SessionFormat>('rapid_10min');
  const [speed, setSpeed] = useState<SpeedMultiplier>(1);
  const [managerLevel, setManagerLevel] = useState<ManagerLevel>('trainee');
  const [sessionKey, setSessionKey] = useState(0);
  const [plSeenCount, setPlSeenCount] = useState(0);
  const [remoteSessionId, setRemoteSessionId] = useState<string | null>(null);

  const start = async () => {
    setSessionKey((k) => k + 1);
    setPlSeenCount(0);
    setRemoteSessionId(null);
    setPhase('play');

    if (auth?.user) {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyType, format, speedSelected: speed }),
        });
        if (res.ok) {
          const data = await res.json();
          setRemoteSessionId(data.session?.id ?? null);
        }
      } catch {
        /* offline / no db — local play still works */
      }
    }
  };

  if (phase === 'select') {
    return (
      <main style={{ maxWidth: 760, margin: '40px auto', padding: 24 }}>
        <Link href="/" style={{ fontSize: 12, color: 'var(--muted)' }}>
          ← Home
        </Link>
        <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
          NEW SESSION
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          {auth?.user
            ? `Signed in as ${auth.user.email}`
            : 'Playing locally (Dev). Sign in to persist sessions.'}{' '}
          At 1×: {WEEKS_PER_QUARTER} weeks/quarter · ~{Math.round(QUARTER_MINUTES_1X)} min/quarter (
          {SECONDS_PER_WEEK_1X}s/week).
        </p>

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          DEV LEVEL
        </h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {(['trainee', 'manager', 'director'] as ManagerLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              className="btn-ghost"
              style={{ borderColor: managerLevel === lvl ? 'var(--green)' : 'var(--border)' }}
              onClick={() => {
                setManagerLevel(lvl);
                if (!canAccessCompany(lvl, companyType)) {
                  setCompanyType('design_agency');
                }
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          COMPANY
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          {(Object.keys(COMPANY_PROFILES) as CompanyType[]).map((id) => {
            const c = COMPANY_PROFILES[id];
            const locked = !canAccessCompany(managerLevel, id);
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() => setCompanyType(id)}
                className="panel"
                style={{
                  width: 200,
                  textAlign: 'left',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  borderColor: companyType === id ? 'var(--green)' : 'var(--border)',
                  opacity: locked ? 0.45 : 1,
                  color: 'inherit',
                }}
              >
                <div className="pixel" style={{ fontSize: 8, color: 'var(--lblue)' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                      {c.engagement.replaceAll('_', ' ')} · {c.leadFrequency} leads
                      {id === 'design_agency' ? ' · volume' : ''}
                      {locked ? ` · needs ${c.unlockLevel}` : ''}
                </div>
              </button>
            );
          })}
        </div>

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          FORMAT
        </h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {(
            [
              ['rapid_10min', 'Rapid · 1×10 min'],
              ['classical_4q', 'Classical · 4×10 min'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="btn-ghost"
              style={{ borderColor: format === id ? 'var(--green)' : 'var(--border)' }}
              onClick={() => setFormat(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          START SPEED
        </h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {([1, 2, 3] as SpeedMultiplier[]).map((s) => (
            <button
              key={s}
              type="button"
              className="btn-ghost"
              style={{ borderColor: speed === s ? 'var(--green)' : 'var(--border)' }}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        <button type="button" className="btn" style={{ marginTop: 32 }} onClick={() => void start()}>
          START
        </button>
      </main>
    );
  }

  return (
    <GameSession
      key={sessionKey}
      companyType={companyType}
      format={format}
      speed={speed}
      managerLevel={managerLevel}
      remoteSessionId={remoteSessionId}
      plSeenCount={plSeenCount}
      setPlSeenCount={setPlSeenCount}
      onFinished={() => setPhase('report')}
      onRestart={() => setPhase('select')}
      showReport={phase === 'report'}
    />
  );
}

function GameSession({
  companyType,
  format,
  speed,
  managerLevel,
  remoteSessionId,
  plSeenCount,
  setPlSeenCount,
  onFinished,
  onRestart,
  showReport,
}: {
  companyType: CompanyType;
  format: SessionFormat;
  speed: SpeedMultiplier;
  managerLevel: ManagerLevel;
  remoteSessionId: string | null;
  plSeenCount: number;
  setPlSeenCount: (n: number) => void;
  onFinished: () => void;
  onRestart: () => void;
  showReport: boolean;
}) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState({ companyType, format, speed, managerLevel }),
  );
  const [tab, setTab] = useState<'recruit' | 'sales' | 'tasks' | 'team'>('recruit');
  const [saved, setSaved] = useState(false);
  const report = useMemo(
    () => (state.gameOver ? computeManagerReport(state.decisionLog) : null),
    [state.gameOver, state.decisionLog],
  );

  useEffect(() => {
    if (showReport || state.gameOver || state.paused) return;
    if (state.pendingPromotions.length > 0) return;
    const ms = (SECONDS_PER_WEEK_1X * 1000) / state.speed;
    const id = window.setInterval(() => dispatch({ type: 'TICK_WEEK' }), ms);
    return () => window.clearInterval(id);
  }, [showReport, state.gameOver, state.paused, state.speed, state.pendingPromotions.length]);

  useEffect(() => {
    if (state.gameOver) onFinished();
  }, [state.gameOver, onFinished]);

  useEffect(() => {
    if (!state.gameOver || !remoteSessionId || saved) return;
    setSaved(true);
    void fetch('/api/sessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: remoteSessionId,
        finalBudget: state.budget,
        bankrupt: state.bankrupt,
        events: state.decisionLog.map((e) => ({
          week: e.week,
          eventType: e.eventType,
          payload: e.payload,
          createdAt: e.createdAt,
        })),
      }),
    });
  }, [state.gameOver, remoteSessionId, saved, state.budget, state.bankrupt, state.decisionLog]);

  const showPL = state.history.length > plSeenCount && !state.gameOver;

  if (showReport && report) {
    return (
      <main style={{ maxWidth: 900, margin: '24px auto', padding: 24 }}>
        <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)' }}>
          SESSION COMPLETE
        </h1>
        {state.bankrupt && (
          <p style={{ color: 'var(--red)' }}>Bankrupt — budget went negative.</p>
        )}
        {remoteSessionId && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {saved ? 'Report saved to server.' : 'Saving report…'}
          </p>
        )}
        <div style={{ marginTop: 20 }}>
          <PLTable history={state.history} includeTotal />
        </div>
        <div style={{ marginTop: 28 }}>
          <ManagerReportView report={report} title="LAST SESSION" />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button type="button" className="btn" onClick={onRestart}>
            PLAY AGAIN
          </button>
          <Link className="btn-ghost" href="/history" style={{ textDecoration: 'none' }}>
            HISTORY
          </Link>
          <Link className="btn-ghost" href="/" style={{ textDecoration: 'none' }}>
            HOME
          </Link>
        </div>
      </main>
    );
  }

  return (
    <OfficeShell
      state={state}
      dispatch={dispatch}
      tab={tab}
      setTab={setTab}
      showPL={showPL}
      onClosePL={() => setPlSeenCount(state.history.length)}
    />
  );
}

function OfficeShell({
  state,
  dispatch,
  tab,
  setTab,
  showPL,
  onClosePL,
}: {
  state: GameState;
  dispatch: React.Dispatch<import('@/game').GameAction>;
  tab: 'recruit' | 'sales' | 'tasks' | 'team';
  setTab: (t: 'recruit' | 'sales' | 'tasks' | 'team') => void;
  showPL: boolean;
  onClosePL: () => void;
}) {
  const promo = state.pendingPromotions[0];
  const promoEmp = promo ? state.employees.find((e) => e.id === promo.employeeId) : null;
  const deliveryLabel = ROLE_LABELS[deliveryRoleFor(state.companyType)];
  const usesStack = companyUsesStack(state.companyType);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--navy2)',
          borderBottom: '3px solid var(--border)',
          fontFamily: 'var(--font-pixel)',
          fontSize: 8,
        }}
      >
        <div>
          <span style={{ color: 'var(--muted)' }}>COMPANY</span>
          <div style={{ color: '#fff', marginTop: 4 }}>
            {COMPANY_PROFILES[state.companyType].label}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>BUDGET</span>
          <div
            style={{
              color: state.budget < 0 ? 'var(--red)' : 'var(--green)',
              marginTop: 4,
            }}
          >
            {money(state.budget)}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>WEEK</span>
          <div style={{ marginTop: 4 }}>
            Q{state.quarter} · W{((state.week - 1) % 12) + 1}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>REP</span>
          <div style={{ marginTop: 4 }}>{state.reputation}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {([1, 2, 3] as SpeedMultiplier[]).map((s) => (
            <button
              key={s}
              type="button"
              className="btn-ghost"
              style={{
                padding: '8px 10px',
                fontSize: 8,
                borderColor: state.speed === s ? 'var(--green)' : 'var(--border)',
              }}
              onClick={() => dispatch({ type: 'SET_SPEED', speed: s })}
            >
              {s}x
            </button>
          ))}
          {state.format === 'classical_4q' && (
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '8px 10px', fontSize: 8 }}
              onClick={() => dispatch({ type: 'SET_PAUSED', paused: !state.paused })}
            >
              {state.paused ? 'PLAY' : 'PAUSE'}
            </button>
          )}
        </div>
      </header>

      {state.lastEventMessage && (
        <div
          style={{
            background: '#1a2030',
            borderBottom: '2px solid var(--yellow)',
            padding: '8px 16px',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>{state.lastEventMessage}</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '4px 8px', fontSize: 7 }}
            onClick={() => dispatch({ type: 'CLEAR_EVENT_MESSAGE' })}
          >
            OK
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <section
          style={{
            flex: 1.4,
            padding: 12,
            borderRight: '2px solid var(--border)',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div className="pixel" style={{ fontSize: 9, color: 'var(--lblue)' }}>
            OFFICE
          </div>
          <div style={{ flex: 1, minHeight: 300, border: '2px solid var(--border)' }}>
            <OfficeCanvas state={state} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {state.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className="btn-ghost"
                style={{ padding: '8px 10px', fontSize: 7 }}
                onClick={() => dispatch({ type: 'BUILD_DESK', roomId: room.id })}
              >
                {room.id.toUpperCase()} DESK ${room.deskCost}
              </button>
            ))}
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '8px 10px', fontSize: 7 }}
              onClick={() => dispatch({ type: 'BUILD_ROOM' })}
            >
              OPEN ROOM
            </button>
          </div>
        </section>

        <aside
          style={{
            flex: '0 0 min(380px, 36vw)',
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--navy)',
          }}
        >
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border)' }}>
            {(['recruit', 'sales', 'tasks', 'team'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="pixel"
                style={{
                  flex: 1,
                  padding: '12px 4px',
                  fontSize: 7,
                  background: tab === t ? 'var(--panel)' : 'transparent',
                  color: tab === t ? 'var(--lblue)' : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {tab === 'recruit' && (
              <>
                {Object.entries(state.roleHireCooldown).some(([, w]) => (w ?? 0) > 0) && (
                  <p style={{ color: 'var(--yellow)', fontSize: 12, marginBottom: 10 }}>
                    Hire cooldown:{' '}
                    {Object.entries(state.roleHireCooldown)
                      .filter(([, w]) => (w ?? 0) > 0)
                      .map(([role, w]) => `${role} ${w}w`)
                      .join(' · ')}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginBottom: 12, width: '100%' }}
                  onClick={() => dispatch({ type: 'REROLL_CANDIDATES' })}
                >
                  REROLL
                </button>
                {state.candidates.map((c) => {
                  const tierKey =
                    c.tier === 'junior' ? 'bronze' : c.tier === 'middle' ? 'silver' : 'gold';
                  const tierColor =
                    c.tier === 'junior'
                      ? '#e09a55'
                      : c.tier === 'middle'
                        ? '#c5d0e0'
                        : '#e8c040';
                  return (
                    <div key={c.id} className="panel" style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>{c.name}</strong>
                        <span style={{ color: 'var(--green)' }}>{money(c.salary)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>
                        {ROLE_LABELS[c.role] ?? c.role}
                        {c.stack ? ` · ${c.stack}` : ''}
                        {c.domain ? ` · ${c.domain}` : ''}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 10,
                          padding: '6px 8px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 4,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/ui/tier_${tierKey}_sm.png?v=20`}
                          alt={c.tier}
                          width={36}
                          height={36}
                          style={{
                            imageRendering: 'pixelated',
                            flexShrink: 0,
                            filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.35))',
                          }}
                        />
                        <div>
                          <div
                            className="pixel"
                            style={{ fontSize: 8, color: tierColor, letterSpacing: 1 }}
                          >
                            {c.tier.toUpperCase()}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            skill tier
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        style={{ width: '100%', fontSize: 8, padding: 10 }}
                        onClick={() => dispatch({ type: 'HIRE', candidateId: c.id })}
                      >
                        HIRE
                      </button>
                    </div>
                  );
                })}
              </>
            )}
            {tab === 'sales' && (
              <>
                {state.leads.length === 0 && (
                  <p style={{ color: 'var(--muted)' }}>No leads yet — wait for the week tick.</p>
                )}
                {state.leads.some((l) => l.status === 'queued') &&
                  state.employees.some((e) => e.role === 'sales') &&
                  !state.leads.some(
                    (l) => l.status === 'queued' && leadAssignOptions(state, l.id).hasIdle,
                  ) && (
                    <p
                      style={{
                        color: 'var(--yellow)',
                        fontSize: 12,
                        marginBottom: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      All Sales are busy and the queue is growing — check Team morale, Recruit
                      another Sales, or watch budget burn instead of waiting idle.
                    </p>
                  )}
                {state.leads.map((l) => {
                  const opts = leadAssignOptions(state, l.id);
                  const left = weeksLeft(l.durationWeeks, l.progress);
                  const assignee = state.employees.find((e) => e.id === l.assignedEmployeeId);
                  return (
                    <div key={l.id} className="panel" style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{l.domain}</span>
                        <strong style={{ color: 'var(--green)' }}>{money(l.value)}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
                        {l.status === 'queued' && (
                          <>
                            Waiting for Sales · close in {l.durationWeeks}w once assigned
                            {l.idleWeeks > 0 ? ` · queued ${l.idleWeeks}w` : ''}
                          </>
                        )}
                        {l.status === 'inprogress' && (
                          <>
                            Sales closing
                            {assignee ? ` · ${assignee.name}` : ''} · {Math.round(l.progress)}% ·{' '}
                            {left}w left of {l.durationWeeks}w
                            {l.idleWeeks > 0 ? ` · waited ${l.idleWeeks}w` : ''}
                          </>
                        )}
                        {opts.mismatchOnly ? ' · domain mismatch' : ''}
                      </div>
                      {l.status === 'inprogress' && (
                        <WorkProgressBar progress={l.progress} variant="lead" />
                      )}
                      {l.status === 'queued' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {!opts.canAssign && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                              No free Sales capacity
                            </p>
                          )}
                          {opts.canAssign && !opts.mismatchOnly && (
                            <button
                              type="button"
                              className="btn"
                              style={{ width: '100%', fontSize: 8, padding: 10 }}
                              onClick={() => {
                                dispatch({ type: 'INSPECT_LEAD', leadId: l.id });
                                dispatch({ type: 'ASSIGN_LEAD', leadId: l.id });
                              }}
                            >
                              ASSIGN SALES
                            </button>
                          )}
                          {opts.mismatchOnly && (
                            <>
                              <button
                                type="button"
                                className="btn"
                                style={{ width: '100%', fontSize: 7, padding: 10 }}
                                onClick={() => {
                                  dispatch({ type: 'INSPECT_LEAD', leadId: l.id });
                                  dispatch({ type: 'ASSIGN_LEAD', leadId: l.id });
                                }}
                              >
                                ASSIGN ANYWAY (MISMATCH)
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ width: '100%', fontSize: 7, padding: 10 }}
                                onClick={() => dispatch({ type: 'SKIP_LEAD', leadId: l.id })}
                              >
                                SKIP — WAIT FOR MATCH
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {tab === 'tasks' && (
              <>
                {state.projects.length === 0 && (
                  <p style={{ color: 'var(--muted)' }}>No projects — close leads first.</p>
                )}
                {state.projects.map((p) => {
                  const opts = projectAssignOptions(state, p.id);
                  const left = weeksLeft(p.durationWeeks, p.progress);
                  const assignee = state.employees.find((e) => e.id === p.assignedEmployeeId);
                  return (
                    <div key={p.id} className="panel" style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          {usesStack && p.stack ? `${p.domain} · ${p.stack}` : p.domain}
                        </span>
                        <strong style={{ color: 'var(--green)' }}>{money(p.value)}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
                        {p.engagement.replaceAll('_', ' ')}
                        {p.status === 'queued' && (
                          <>
                            {' '}
                            · Waiting for {deliveryLabel} · {p.durationWeeks}w to ship once assigned
                            {p.idleWeeks > 0 ? ` · queued ${p.idleWeeks}w` : ''}
                          </>
                        )}
                        {p.status === 'inprogress' && (
                          <>
                            {' '}
                            · {deliveryLabel} shipping
                            {assignee ? ` · ${assignee.name}` : ''} · {Math.round(p.progress)}% ·{' '}
                            {left}w left of {p.durationWeeks}w
                            {p.idleWeeks > 0 ? ` · waited ${p.idleWeeks}w` : ''}
                          </>
                        )}
                        {opts.mismatchOnly
                          ? usesStack
                            ? ' · stack mismatch'
                            : ' · domain mismatch'
                          : ''}
                      </div>
                      {p.status === 'inprogress' && (
                        <WorkProgressBar progress={p.progress} variant="project" />
                      )}
                      {p.status === 'queued' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {!opts.canAssign && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                              No idle {deliveryLabel}
                            </p>
                          )}
                          {opts.canAssign && !opts.mismatchOnly && (
                            <button
                              type="button"
                              className="btn"
                              style={{ width: '100%', fontSize: 8, padding: 10 }}
                              onClick={() => {
                                dispatch({ type: 'INSPECT_PROJECT', projectId: p.id });
                                dispatch({ type: 'ASSIGN_PROJECT', projectId: p.id });
                              }}
                            >
                              ASSIGN {deliveryLabel.toUpperCase()}
                            </button>
                          )}
                          {opts.mismatchOnly && (
                            <>
                              <button
                                type="button"
                                className="btn"
                                style={{ width: '100%', fontSize: 7, padding: 10 }}
                                onClick={() => {
                                  dispatch({ type: 'INSPECT_PROJECT', projectId: p.id });
                                  dispatch({ type: 'ASSIGN_PROJECT', projectId: p.id });
                                }}
                              >
                                ASSIGN ANYWAY (MISMATCH)
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ width: '100%', fontSize: 7, padding: 10 }}
                                onClick={() =>
                                  dispatch({ type: 'SKIP_PROJECT', projectId: p.id })
                                }
                              >
                                SKIP — WAIT FOR MATCH
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {tab === 'team' && (
              <>
                {state.employees.length === 0 && (
                  <p style={{ color: 'var(--muted)' }}>No employees — hire from Recruit.</p>
                )}
                {state.employees.map((e) => {
                  const heart =
                    e.satisfaction >= 60 ? 'green' : e.satisfaction >= 30 ? 'yellow' : 'red';
                  const tierKey =
                    e.tier === 'junior' ? 'bronze' : e.tier === 'middle' ? 'silver' : 'gold';
                  return (
                    <div key={e.id} className="panel" style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{e.name}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                          {money(e.salary)}/q
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>
                        {ROLE_LABELS[e.role] ?? e.role} · {e.status}
                        {e.recruiterCharges != null ? ` · charges ${e.recruiterCharges}` : ''}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginBottom: 10,
                          padding: '6px 8px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 4,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/ui/tier_${tierKey}_sm.png?v=20`}
                          alt={e.tier}
                          width={32}
                          height={32}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/ui/heart_${heart}_sm.png?v=17`}
                          alt="morale"
                          width={28}
                          height={28}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div style={{ fontSize: 12 }}>
                          <span className="pixel" style={{ fontSize: 7, color: 'var(--muted)' }}>
                            MORALE{' '}
                          </span>
                          <strong>{Math.round(e.satisfaction)}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ width: '100%', fontSize: 8 }}
                        onClick={() => dispatch({ type: 'GIVE_BONUS', employeeId: e.id })}
                      >
                        BONUS $300
                      </button>
                      {(() => {
                        const cost = terminationCost(state, e.id);
                        if (!cost) return null;
                        return (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              width: '100%',
                              fontSize: 7,
                              marginTop: 6,
                              color: cost.canAfford ? 'var(--red)' : 'var(--muted2)',
                              borderColor: cost.canAfford ? 'var(--red)' : 'var(--border)',
                            }}
                            disabled={!cost.canAfford}
                            onClick={() => {
                              const warn = cost.brokeLongDelivery
                                ? 'This breaks an active long-delivery contract (−8 rep). Fire anyway?'
                                : `Fire ${e.name}? Pro-rata ${money(cost.proratedPay)} + severance ${money(cost.severanceCost)} = ${money(cost.total)}`;
                              if (typeof window !== 'undefined' && !window.confirm(warn)) return;
                              dispatch({ type: 'TERMINATE_EMPLOYEE', employeeId: e.id });
                            }}
                          >
                            FIRE · {money(cost.total)}
                            {cost.brokeLongDelivery ? ' · breaks LD' : ''}
                          </button>
                        );
                      })()}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </aside>
      </div>

      {promo && promoEmp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 60,
          }}
        >
          <div className="panel" style={{ maxWidth: 420, width: '100%' }}>
            <h2 className="pixel" style={{ fontSize: 10, color: 'var(--lblue)' }}>
              PROMOTION
            </h2>
            <p style={{ lineHeight: 1.6 }}>
              <strong>{promoEmp.name}</strong> asks for {promo.fromTier} → {promo.toTier}. Salary +
              {money(promo.salaryDelta)}.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  dispatch({ type: 'PROMOTION_ACCEPT', employeeId: promo.employeeId })
                }
              >
                PROMOTE
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  dispatch({ type: 'PROMOTION_DECLINE', employeeId: promo.employeeId })
                }
              >
                DECLINE
              </button>
            </div>
          </div>
        </div>
      )}

      {showPL && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#fff',
              color: '#111',
              maxWidth: 720,
              width: '100%',
              padding: 24,
              borderRadius: 4,
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-ui)', marginTop: 0 }}>Quarter P&amp;L</h2>
            <PLTable history={state.history} light />
            <button type="button" className="btn" style={{ marginTop: 16 }} onClick={onClosePL}>
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
