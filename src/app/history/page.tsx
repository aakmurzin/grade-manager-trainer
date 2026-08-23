'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ManagerReportView } from '@/components/ManagerReportView';
import {
  aggregateTrendReport,
  type ManagerReportResult,
  type ManagerReportScores,
} from '@/game/report/computeManagerReport';

type SessionRow = {
  id: string;
  companyType: string;
  format: string;
  startedAt: string;
  finishedAt: string | null;
  finalBudget: string | null;
  bankrupt: boolean;
  report: {
    scores: ManagerReportScores & { __meta?: { activityIndex?: number; paei?: ManagerReportResult['paei'] } };
    archetype: string | null;
    flaggedMoments: ManagerReportResult['flaggedMoments'];
  } | null;
};

function toResult(row: SessionRow): ManagerReportResult | null {
  if (!row.report) return null;
  const raw = { ...row.report.scores } as ManagerReportScores & {
    __meta?: { activityIndex?: number; paei?: ManagerReportResult['paei'] };
  };
  const meta = raw.__meta;
  delete raw.__meta;
  return {
    scores: raw,
    archetype: (row.report.archetype as ManagerReportResult['archetype']) ?? null,
    flaggedMoments: row.report.flaggedMoments ?? [],
    activityIndex: meta?.activityIndex ?? 0.5,
    paei: meta?.paei ?? { p: null, a: null, e: null, i: null },
  };
}

export default function HistoryPage() {
  const { data: auth, status } = useSession();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void fetch('/api/sessions')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Failed');
        setRows(data.sessions ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [status]);

  const finished = useMemo(
    () => rows.filter((s) => s.finishedAt && s.report),
    [rows],
  );
  const last = finished[0] ? toResult(finished[0]) : null;
  const trendSource = finished
    .slice(0, 10)
    .map(toResult)
    .filter((r): r is ManagerReportResult => r != null);
  const trend = trendSource.length >= 2 ? aggregateTrendReport(trendSource) : null;
  const primaryArchetype =
    finished.length >= 3 && trend?.archetype ? trend.archetype : last?.archetype;

  return (
    <main style={{ maxWidth: 860, margin: '40px auto', padding: 24 }}>
      <Link href="/" style={{ fontSize: 12, color: 'var(--muted)' }}>
        ← Home
      </Link>
      <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
        SESSION HISTORY
      </h1>

      {status === 'unauthenticated' && (
        <div className="panel" style={{ marginTop: 20, color: 'var(--muted)' }}>
          <Link href="/login">Log in</Link> to see saved sessions. Local Dev Play runs are not
          persisted.
        </div>
      )}

      {error && (
        <div className="panel" style={{ marginTop: 20, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {auth && !error && rows.length === 0 && (
        <div className="panel" style={{ marginTop: 20, color: 'var(--muted)' }}>
          No sessions yet. Finish a run while signed in.
        </div>
      )}

      {primaryArchetype && finished.length >= 3 && (
        <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
          Primary archetype from trend:{' '}
          <strong style={{ color: '#fff' }}>
            {String(primaryArchetype).replaceAll('_', ' ')}
          </strong>
        </p>
      )}

      {trend && (
        <div className="panel" style={{ marginTop: 20, padding: 20 }}>
          <ManagerReportView
            report={trend}
            title={`YOUR TREND (${trendSource.length} sessions)`}
            emphasize
          />
        </div>
      )}

      {last && (
        <div className="panel" style={{ marginTop: 20, padding: 20, opacity: trend ? 0.92 : 1 }}>
          <ManagerReportView report={last} title="LAST SESSION" />
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="pixel" style={{ fontSize: 10, color: 'var(--muted)' }}>
          ALL RUNS
        </h2>
        {rows.map((s) => (
          <div key={s.id} className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{s.companyType.replaceAll('_', ' ')}</strong>
              <span style={{ color: s.bankrupt ? 'var(--red)' : 'var(--green)' }}>
                {s.finalBudget != null ? `$${Number(s.finalBudget).toFixed(0)}` : 'in progress'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {s.format} · {new Date(s.startedAt).toLocaleString()}
              {s.finishedAt ? ` → ${new Date(s.finishedAt).toLocaleString()}` : ''}
              {s.report?.archetype ? ` · ${s.report.archetype.replaceAll('_', ' ')}` : ''}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 16 }}>
        <Link href="/play">Start a session →</Link>
      </p>
    </main>
  );
}
