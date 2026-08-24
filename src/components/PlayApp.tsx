'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  COMPANY_PROFILES,
  QUARTER_MINUTES_1X,
  ROOM_COSTS,
  SECONDS_PER_WEEK_1X,
  SESSION_QUARTERS,
  WEEKS_PER_QUARTER,
  canAccessCompany,
  companyUsesStack,
  createInitialState,
  deliveryRoleFor,
  gameReducer,
  leadAssignOptions,
  maxDesksForOffice,
  projectAssignOptions,
  terminationCost,
  type CompanyType,
  type GameState,
  type ManagerLevel,
  type SpeedMultiplier,
} from '@/game';
import { computeManagerReport } from '@/game/report/computeManagerReport';
import { PLTable } from '@/components/PLTable';
import { ManagerReportView } from '@/components/ManagerReportView';
import { OfficeCanvas } from '@/render/OfficeCanvas';
import { LocaleSelect } from '@/components/LocaleSelect';
import { OnboardingModal, OnboardingPanel } from '@/components/OnboardingGuide';
import { onboardingCopy, type AppLocale } from '@/i18n/archetypes';
import { useLocale } from '@/i18n/LocaleProvider';
import { moneyLocale } from '@/i18n/uiCatalog';
import { translateEventMessage } from '@/i18n/events';

type Phase = 'select' | 'play' | 'report';

function money(n: number, locale: AppLocale) {
  return n.toLocaleString(moneyLocale(locale), {
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

function roleLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  role: string,
) {
  const key = `roles.${role}`;
  const label = t(key);
  return label === key ? role : label;
}

function statusLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  status: string,
) {
  const key = `status.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function PlayApp() {
  const { data: auth } = useSession();
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>('select');
  const [companyType, setCompanyType] = useState<CompanyType>('design_agency');
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
          body: JSON.stringify({ companyType, speedSelected: speed }),
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
          {t('common.backHome')}
        </Link>
        <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
          {t('select.title')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          {auth?.user
            ? t('select.signedIn', { email: auth.user.email ?? '' })
            : t('select.localPlay')}{' '}
          {t('select.timing', {
            quarters: SESSION_QUARTERS,
            weeks: WEEKS_PER_QUARTER,
            minutes: Math.round(QUARTER_MINUTES_1X),
            seconds: SECONDS_PER_WEEK_1X,
          })}
        </p>

        <LocaleSelect />

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          {t('select.devLevel')}
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
              {t(`levels.${lvl}`)}
            </button>
          ))}
        </div>

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          {t('select.company')}
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
                  {t(`companies.${id}`)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  {t(`engagement.${c.engagement}`)} ·{' '}
                  {t('select.leads', { n: t(`frequency.${c.leadFrequency}`) })}
                  {id === 'design_agency' ? ` · ${t('select.volume')}` : ''}
                  {locked ? ` · ${t('select.needs', { level: t(`levels.${c.unlockLevel}`) })}` : ''}
                </div>
              </button>
            );
          })}
        </div>

        <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
          {t('select.startSpeed')}
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

        <OnboardingPanel />

        <button type="button" className="btn" style={{ marginTop: 32 }} onClick={() => void start()}>
          {t('select.start')}
        </button>
      </main>
    );
  }

  return (
    <GameSession
      key={sessionKey}
      companyType={companyType}
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
  speed: SpeedMultiplier;
  managerLevel: ManagerLevel;
  remoteSessionId: string | null;
  plSeenCount: number;
  setPlSeenCount: (n: number) => void;
  onFinished: () => void;
  onRestart: () => void;
  showReport: boolean;
}) {
  const { t } = useLocale();
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState({ companyType, speed, managerLevel }),
  );
  const [tab, setTab] = useState<'recruit' | 'sales' | 'tasks' | 'team'>('recruit');
  const [saved, setSaved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const report = useMemo(
    () =>
      state.gameOver
        ? computeManagerReport(state.decisionLog, {
            finalBudget: state.budget,
            bankrupt: state.bankrupt,
          })
        : null,
    [state.gameOver, state.decisionLog, state.budget, state.bankrupt],
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
          {t('complete.title')}
        </h1>
        {state.bankrupt && (
          <p style={{ color: 'var(--red)' }}>{t('complete.bankrupt')}</p>
        )}
        {remoteSessionId && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {saved ? t('complete.saved') : t('complete.saving')}
          </p>
        )}
        <div style={{ marginTop: 20 }}>
          <PLTable history={state.history} includeTotal />
        </div>
        <div style={{ marginTop: 28 }}>
          <ManagerReportView report={report} title={t('report.lastSession')} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button type="button" className="btn" onClick={onRestart}>
            {t('complete.playAgain')}
          </button>
          <Link className="btn-ghost" href="/history" style={{ textDecoration: 'none' }}>
            {t('complete.history')}
          </Link>
          <Link className="btn-ghost" href="/" style={{ textDecoration: 'none' }}>
            {t('complete.home')}
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
      showHelp={showHelp}
      onOpenHelp={() => setShowHelp(true)}
      onCloseHelp={() => setShowHelp(false)}
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
  showHelp,
  onOpenHelp,
  onCloseHelp,
}: {
  state: GameState;
  dispatch: React.Dispatch<import('@/game').GameAction>;
  tab: 'recruit' | 'sales' | 'tasks' | 'team';
  setTab: (t: 'recruit' | 'sales' | 'tasks' | 'team') => void;
  showPL: boolean;
  onClosePL: () => void;
  showHelp: boolean;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
}) {
  const { locale, t } = useLocale();
  const promo = state.pendingPromotions[0];
  const promoEmp = promo ? state.employees.find((e) => e.id === promo.employeeId) : null;
  const deliveryRole = deliveryRoleFor(state.companyType);
  const deliveryLabel = roleLabel(t, deliveryRole);
  const usesStack = companyUsesStack(state.companyType);
  const helpLabel = onboardingCopy(locale).help;
  const fmt = (n: number) => money(n, locale);

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
          <span style={{ color: 'var(--muted)' }}>{t('hud.company')}</span>
          <div style={{ color: '#fff', marginTop: 4 }}>
            {t(`companies.${state.companyType}`)}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>{t('hud.budget')}</span>
          <div
            style={{
              color: state.budget < 0 ? 'var(--red)' : 'var(--green)',
              marginTop: 4,
            }}
          >
            {fmt(state.budget)}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>{t('hud.week')}</span>
          <div style={{ marginTop: 4 }}>
            Q{state.quarter} · W{((state.week - 1) % 12) + 1}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>{t('hud.rep')}</span>
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
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '8px 10px', fontSize: 8 }}
            onClick={() => dispatch({ type: 'SET_PAUSED', paused: !state.paused })}
          >
            {state.paused ? t('hud.play') : t('hud.pause')}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '8px 12px', fontSize: 8 }}
            aria-label={t('common.howToPlay')}
            title={t('common.howToPlay')}
            onClick={onOpenHelp}
          >
            {helpLabel}
          </button>
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
          <span>{translateEventMessage(locale, state.lastEventMessage)}</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '4px 8px', fontSize: 7 }}
            onClick={() => dispatch({ type: 'CLEAR_EVENT_MESSAGE' })}
          >
            {t('common.ok')}
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
            {t('office.title')}
          </div>
          <div style={{ flex: 1, minHeight: 300, border: '2px solid var(--border)' }}>
            <OfficeCanvas state={state} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {state.rooms.map((room) => {
              const deskCap = maxDesksForOffice(state.totalRevenue);
              const deskDisabled =
                room.desks.length >= deskCap || state.budget < room.deskCost;
              return (
                <button
                  key={room.id}
                  type="button"
                  className="btn-ghost"
                  disabled={deskDisabled}
                  title={
                    room.desks.length >= deskCap
                      ? t('office.roomFull', { cap: deskCap })
                      : state.budget < room.deskCost
                        ? t('office.needCash', { amount: fmt(room.deskCost) })
                        : t('office.addDesk', { amount: fmt(room.deskCost) })
                  }
                  style={{
                    padding: '8px 10px',
                    fontSize: 7,
                    opacity: deskDisabled ? 0.45 : 1,
                    cursor: deskDisabled ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => dispatch({ type: 'BUILD_DESK', roomId: room.id })}
                >
                  {t('office.desk', { room: room.id.toUpperCase(), cost: room.deskCost })}
                </button>
              );
            })}
            {(() => {
              const last = state.rooms[state.rooms.length - 1]!;
              const deskCap = maxDesksForOffice(state.totalRevenue);
              const roomCost = ROOM_COSTS[state.rooms.length] ?? 11_500;
              const maxRooms = state.rooms.length >= 4;
              const needDesks = last.desks.length < deskCap;
              const needCash = state.budget < roomCost;
              const roomDisabled = maxRooms || needDesks || needCash;
              const roomTitle = maxRooms
                ? t('office.maxRooms')
                : needDesks
                  ? t('office.fillRoomFirst', {
                      have: last.desks.length,
                      cap: deskCap,
                    })
                  : needCash
                    ? t('office.needCash', { amount: fmt(roomCost) })
                    : t('office.openRoomFor', { amount: fmt(roomCost) });
              return (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={roomDisabled}
                  title={roomTitle}
                  style={{
                    padding: '8px 10px',
                    fontSize: 7,
                    opacity: roomDisabled ? 0.45 : 1,
                    cursor: roomDisabled ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => dispatch({ type: 'BUILD_ROOM' })}
                >
                  {t('office.openRoom', { cost: roomCost })}
                  {needDesks && !maxRooms ? ` · ${last.desks.length}/${deskCap}` : ''}
                </button>
              );
            })()}
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
            {(['recruit', 'sales', 'tasks', 'team'] as const).map((tabId) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setTab(tabId)}
                className="pixel"
                style={{
                  flex: 1,
                  padding: '12px 4px',
                  fontSize: 7,
                  background: tab === tabId ? 'var(--panel)' : 'transparent',
                  color: tab === tabId ? 'var(--lblue)' : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t(`tabs.${tabId}`)}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {tab === 'recruit' && (
              <>
                {Object.entries(state.roleHireCooldown).some(([, w]) => (w ?? 0) > 0) && (
                  <p style={{ color: 'var(--yellow)', fontSize: 12, marginBottom: 10 }}>
                    {t('recruit.hireCooldown', {
                      list: Object.entries(state.roleHireCooldown)
                        .filter(([, w]) => (w ?? 0) > 0)
                        .map(([role, w]) => `${roleLabel(t, role)} ${w}w`)
                        .join(' · '),
                    })}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginBottom: 12, width: '100%' }}
                  onClick={() => dispatch({ type: 'REROLL_CANDIDATES' })}
                >
                  {t('recruit.reroll')}
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
                        <span style={{ color: 'var(--green)' }}>{fmt(c.salary)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>
                        {roleLabel(t, c.role)}
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
                          alt={t(`tiers.${c.tier}`)}
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
                            {t(`tiers.${c.tier}`)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {t('tiers.skillTier')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        style={{ width: '100%', fontSize: 8, padding: 10 }}
                        onClick={() => dispatch({ type: 'HIRE', candidateId: c.id })}
                      >
                        {t('recruit.hire')}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
            {tab === 'sales' && (
              <>
                {state.leads.length === 0 && (
                  <p style={{ color: 'var(--muted)' }}>{t('sales.empty')}</p>
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
                      {t('sales.salesBusyHint')}
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
                        <strong style={{ color: 'var(--green)' }}>{fmt(l.value)}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
                        {l.status === 'queued' && (
                          <>
                            {t('sales.waiting', { weeks: l.durationWeeks })}
                            {l.idleWeeks > 0 ? t('sales.queued', { weeks: l.idleWeeks }) : ''}
                          </>
                        )}
                        {l.status === 'inprogress' && (
                          <>
                            {t('sales.closing')}
                            {assignee ? ` · ${assignee.name}` : ''} · {Math.round(l.progress)}% ·{' '}
                            {t('sales.leftOf', { left, total: l.durationWeeks })}
                            {l.idleWeeks > 0 ? t('sales.waited', { weeks: l.idleWeeks }) : ''}
                          </>
                        )}
                        {opts.mismatchOnly ? t('sales.domainMismatch') : ''}
                      </div>
                      {l.status === 'inprogress' && (
                        <WorkProgressBar progress={l.progress} variant="lead" />
                      )}
                      {l.status === 'queued' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {!opts.canAssign && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                              {t('sales.noCapacity')}
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
                              {t('sales.assign')}
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
                                {t('sales.assignAnyway')}
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ width: '100%', fontSize: 7, padding: 10 }}
                                onClick={() => dispatch({ type: 'SKIP_LEAD', leadId: l.id })}
                              >
                                {t('sales.skipWait')}
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
                  <p style={{ color: 'var(--muted)' }}>{t('tasks.empty')}</p>
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
                        <strong style={{ color: 'var(--green)' }}>{fmt(p.value)}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
                        {t(`engagement.${p.engagement}`)}
                        {p.status === 'queued' && (
                          <>
                            {' '}
                            · {t('tasks.waiting', { role: deliveryLabel, weeks: p.durationWeeks })}
                            {p.idleWeeks > 0 ? t('sales.queued', { weeks: p.idleWeeks }) : ''}
                          </>
                        )}
                        {p.status === 'inprogress' && (
                          <>
                            {' '}
                            · {t('tasks.shipping', { role: deliveryLabel })}
                            {assignee ? ` · ${assignee.name}` : ''} · {Math.round(p.progress)}% ·{' '}
                            {t('sales.leftOf', { left, total: p.durationWeeks })}
                            {p.idleWeeks > 0 ? t('sales.waited', { weeks: p.idleWeeks }) : ''}
                          </>
                        )}
                        {opts.mismatchOnly
                          ? usesStack
                            ? t('tasks.stackMismatch')
                            : t('tasks.domainMismatch')
                          : ''}
                      </div>
                      {p.status === 'inprogress' && (
                        <WorkProgressBar progress={p.progress} variant="project" />
                      )}
                      {p.status === 'queued' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {!opts.canAssign && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                              {t('tasks.noIdle', { role: deliveryLabel })}
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
                              {t('tasks.assign', { role: deliveryLabel.toUpperCase() })}
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
                                {t('tasks.assignAnyway')}
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ width: '100%', fontSize: 7, padding: 10 }}
                                onClick={() =>
                                  dispatch({ type: 'SKIP_PROJECT', projectId: p.id })
                                }
                              >
                                {t('tasks.skipWait')}
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
                  <p style={{ color: 'var(--muted)' }}>{t('team.empty')}</p>
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
                          {t('team.perQuarter', { amount: fmt(e.salary) })}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>
                        {roleLabel(t, e.role)} · {statusLabel(t, e.status)}
                        {e.recruiterCharges != null
                          ? t('team.charges', { n: e.recruiterCharges })
                          : ''}
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
                          alt={t(`tiers.${e.tier}`)}
                          width={32}
                          height={32}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/ui/heart_${heart}_sm.png?v=17`}
                          alt={t('team.morale')}
                          width={28}
                          height={28}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div style={{ fontSize: 12 }}>
                          <span className="pixel" style={{ fontSize: 7, color: 'var(--muted)' }}>
                            {t('team.morale')}{' '}
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
                        {t('team.bonus')}
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
                                ? t('team.fireBreakConfirm')
                                : t('team.fireConfirm', {
                                    name: e.name,
                                    prorata: fmt(cost.proratedPay),
                                    severance: fmt(cost.severanceCost),
                                    total: fmt(cost.total),
                                  });
                              if (typeof window !== 'undefined' && !window.confirm(warn)) return;
                              dispatch({ type: 'TERMINATE_EMPLOYEE', employeeId: e.id });
                            }}
                          >
                            {t('team.fire', { amount: fmt(cost.total) })}
                            {cost.brokeLongDelivery ? t('team.breaksLd') : ''}
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
              {t('promo.title')}
            </h2>
            <p style={{ lineHeight: 1.6 }}>
              {t('promo.body', {
                name: promoEmp.name,
                from: t(`tiers.${promo.fromTier}`),
                to: t(`tiers.${promo.toTier}`),
                delta: fmt(promo.salaryDelta),
              })}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  dispatch({ type: 'PROMOTION_ACCEPT', employeeId: promo.employeeId })
                }
              >
                {t('promo.promote')}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  dispatch({ type: 'PROMOTION_DECLINE', employeeId: promo.employeeId })
                }
              >
                {t('promo.decline')}
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
            <h2 style={{ fontFamily: 'var(--font-ui)', marginTop: 0 }}>{t('pl.title')}</h2>
            <PLTable history={state.history} light />
            <button type="button" className="btn" style={{ marginTop: 16 }} onClick={onClosePL}>
              {t('common.continue')}
            </button>
          </div>
        </div>
      )}

      <OnboardingModal open={showHelp} onClose={onCloseHelp} />
    </div>
  );
}
