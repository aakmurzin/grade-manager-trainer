'use client';

import type { QuarterPL } from '@/game';
import { useLocale } from '@/i18n/LocaleProvider';
import { moneyLocale } from '@/i18n/uiCatalog';

function fmt(n: number | null | undefined, light: boolean | undefined, locale: string) {
  if (n == null || Number.isNaN(n)) return '—';
  const s = n < 0 ? '-' : '';
  const body = Math.abs(n).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const color = n < 0 ? (light ? '#b91c1c' : 'var(--red)') : undefined;
  return <span style={{ color }}>{s + body}</span>;
}

function pct(n: number | null | undefined, locale: string) {
  if (n == null || Number.isNaN(n)) return '—';
  const s = n < 0 ? '-' : '';
  return (
    s +
    Math.abs(n).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    '%'
  );
}

export function PLTable({
  history,
  includeTotal,
  light,
}: {
  history: QuarterPL[];
  includeTotal?: boolean;
  light?: boolean;
}) {
  const { t, locale } = useLocale();
  const numLocale = moneyLocale(locale);
  const cols = 4;
  const filled = history.length;
  const total = history.reduce(
    (acc, q) => ({
      revenue: acc.revenue + q.revenue,
      salaries: acc.salaries + q.salaries,
      overheads: acc.overheads + q.overheads,
      penalties: acc.penalties + (q.penalties ?? 0),
      ebitda: acc.ebitda + q.ebitda,
      netProfit: acc.netProfit + q.netProfit,
    }),
    { revenue: 0, salaries: 0, overheads: 0, penalties: 0, ebitda: 0, netProfit: 0 },
  );

  const cell = (q: number, getter: (q: QuarterPL) => number) => {
    if (q >= filled) return '—';
    return fmt(getter(history[q]!), light, numLocale);
  };

  const margin = (q: number, getter: (q: QuarterPL) => number) => {
    if (q >= filled) return '—';
    const row = history[q]!;
    if (!row.revenue) return '—';
    return pct((getter(row) / row.revenue) * 100, numLocale);
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'right',
    padding: '8px 10px',
    borderBottom: light ? '1px solid #e5e7eb' : '1px solid var(--border)',
    fontSize: 12,
    color: light ? '#6b7280' : 'var(--muted)',
  };
  const tdStyle: React.CSSProperties = {
    textAlign: 'right',
    padding: '8px 10px',
    borderBottom: light ? '1px solid #f3f4f6' : '1px solid rgba(42,61,82,.6)',
    fontSize: 13,
    fontFamily: 'var(--font-ui)',
  };
  const labelStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: 'left',
    fontWeight: 600,
    color: light ? '#111827' : '#cfe0f0',
  };

  const rows: { label: string; getter: (q: QuarterPL) => number; total: number; isPct?: boolean }[] =
    [
      { label: t('pl.revenue'), getter: (q) => q.revenue, total: total.revenue },
      { label: t('pl.salaries'), getter: (q) => q.salaries, total: total.salaries },
      { label: t('pl.overheads'), getter: (q) => q.overheads, total: total.overheads },
      { label: t('pl.penalties'), getter: (q) => q.penalties ?? 0, total: total.penalties },
      { label: t('pl.ebitda'), getter: (q) => q.ebitda, total: total.ebitda },
      { label: t('pl.ebitdaPct'), getter: (q) => q.ebitda, total: total.ebitda, isPct: true },
      { label: t('pl.netProfit'), getter: (q) => q.netProfit, total: total.netProfit },
    ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}> </th>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} style={thStyle}>
                Q{i + 1}
              </th>
            ))}
            {includeTotal && <th style={thStyle}>{t('pl.total')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={labelStyle}>{row.label}</td>
              {Array.from({ length: cols }, (_, i) => (
                <td key={i} style={tdStyle}>
                  {row.isPct ? margin(i, row.getter) : cell(i, row.getter)}
                </td>
              ))}
              {includeTotal && (
                <td style={tdStyle}>
                  {row.isPct
                    ? total.revenue
                      ? pct((total.ebitda / total.revenue) * 100, numLocale)
                      : '—'
                    : fmt(row.total, light, numLocale)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
