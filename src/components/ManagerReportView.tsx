'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import {
  archetypeBlurb,
  type AxisConfidence,
  type ManagerReportResult,
} from '@/game/report/computeManagerReport';
import { useLocale } from '@/i18n/LocaleProvider';

function confidenceColor(c: AxisConfidence): string {
  if (c === 'high') return 'var(--green)';
  if (c === 'medium') return 'var(--lblue)';
  if (c === 'low') return 'var(--yellow)';
  return 'var(--muted)';
}

function paeiLine(report: ManagerReportResult): string | null {
  const { p, a, e, i } = report.paei ?? { p: null, a: null, e: null, i: null };
  if (p == null && a == null && e == null && i == null) return null;
  const fmt = (n: number | null) => (n == null ? '—' : String(n));
  return `PAEI · P ${fmt(p)} · A ${fmt(a)} · E ${fmt(e)} · I ${fmt(i)}`;
}

export function ManagerReportView({
  report,
  title,
  emphasize = false,
}: {
  report: ManagerReportResult;
  title?: string;
  emphasize?: boolean;
}) {
  const { t, locale } = useLocale();
  const axisLabel = (key: string) => t(`report.axes.${key}`);

  const data = Object.entries(report.scores).map(([key, value]) => ({
    axis: axisLabel(key),
    score: value.score,
    confidence: value.confidence,
  }));

  const archetypeLabel =
    report.archetype == null
      ? '—'
      : t(`report.archetypes.${report.archetype}`);

  const blurb = archetypeBlurb(report.archetype, locale);
  const paei = paeiLine(report);

  return (
    <div>
      <h2
        className="pixel"
        style={{
          fontSize: emphasize ? 14 : 12,
          color: emphasize ? '#fff' : 'var(--lblue)',
        }}
      >
        {title ?? t('report.title')}
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        {t('report.archetype')}{' '}
        <strong style={{ color: '#fff' }}>{archetypeLabel}</strong>
        {report.archetype === 'insufficient_data' && (
          <span style={{ color: 'var(--yellow)', marginLeft: 8 }}>
            {t('report.insufficientHint')}
          </span>
        )}
        {report.archetype === 'inactive' && (
          <span style={{ color: 'var(--yellow)', marginLeft: 8 }}>
            {t('report.inactiveHint')}
          </span>
        )}
      </p>
      {blurb && (
        <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          {blurb}
        </p>
      )}
      {paei && (
        <p style={{ color: 'var(--muted2)', fontSize: 12, marginTop: 4 }}>{paei}</p>
      )}

      <div style={{ width: '100%', height: emphasize ? 360 : 320, marginTop: 12 }}>
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="#2a3d52" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: '#9fb3c8', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#5a6b7d', fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#0351ff"
              fill="#0351ff"
              fillOpacity={emphasize ? 0.45 : 0.35}
              connectNulls={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginTop: 8,
        }}
      >
        {Object.entries(report.scores).map(([key, value]) => (
          <div key={key} className="panel" style={{ padding: 12 }}>
            <div className="pixel" style={{ fontSize: 7, color: 'var(--muted)' }}>
              {axisLabel(key).toUpperCase()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
              {value.score == null ? t('report.na') : value.score}
            </div>
            <div
              className="pixel"
              style={{ fontSize: 7, marginTop: 6, color: confidenceColor(value.confidence) }}
            >
              {t(`report.confidence.${value.confidence}`)}
              {value.n > 0 ? ` · n=${value.n}` : ''}
            </div>
          </div>
        ))}
      </div>

      {report.flaggedMoments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="pixel" style={{ fontSize: 9, color: 'var(--yellow)' }}>
            {t('report.flagged')}
          </h3>
          <ul style={{ paddingLeft: 18, color: 'var(--text)', lineHeight: 1.6 }}>
            {report.flaggedMoments.map((m, i) => (
              <li key={i}>
                <span style={{ color: 'var(--muted)' }}>
                  {t('report.week', { week: m.week })}
                </span>{' '}
                {m.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
