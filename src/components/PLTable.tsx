import type { QuarterPL } from '@/game';

function fmt(n: number | null | undefined, light?: boolean) {
  if (n == null || Number.isNaN(n)) return '—';
  const s = n < 0 ? '-' : '';
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const color = n < 0 ? (light ? '#b91c1c' : 'var(--red)') : undefined;
  return <span style={{ color }}>{s + body}</span>;
}

function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  const s = n < 0 ? '-' : '';
  return (
    s +
    Math.abs(n).toLocaleString('en-US', {
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
  const cols = 4;
  const filled = history.length;
  const total = history.reduce(
    (acc, q) => ({
      revenue: acc.revenue + q.revenue,
      salaries: acc.salaries + q.salaries,
      overheads: acc.overheads + q.overheads,
      ebitda: acc.ebitda + q.ebitda,
      netProfit: acc.netProfit + q.netProfit,
    }),
    { revenue: 0, salaries: 0, overheads: 0, ebitda: 0, netProfit: 0 },
  );

  const cell = (q: number, getter: (q: QuarterPL) => number) => {
    if (q >= filled) return '—';
    return fmt(getter(history[q]!), light);
  };

  const margin = (q: number, getter: (q: QuarterPL) => number) => {
    if (q >= filled) return '—';
    const row = history[q]!;
    if (!row.revenue) return '—';
    return pct((getter(row) / row.revenue) * 100);
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
            {includeTotal && <th style={thStyle}>Total</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={labelStyle}>Revenue</td>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} style={tdStyle}>
                {cell(i, (q) => q.revenue)}
              </td>
            ))}
            {includeTotal && <td style={tdStyle}>{fmt(total.revenue, light)}</td>}
          </tr>
          <tr>
            <td style={labelStyle}>Salaries</td>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} style={tdStyle}>
                {cell(i, (q) => q.salaries)}
              </td>
            ))}
            {includeTotal && <td style={tdStyle}>{fmt(total.salaries, light)}</td>}
          </tr>
          <tr>
            <td style={labelStyle}>Overheads</td>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} style={tdStyle}>
                {cell(i, (q) => q.overheads)}
              </td>
            ))}
            {includeTotal && <td style={tdStyle}>{fmt(total.overheads, light)}</td>}
          </tr>
          <tr>
            <td style={labelStyle}>EBITDA</td>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} style={tdStyle}>
                {cell(i, (q) => q.ebitda)}
              </td>
            ))}
            {includeTotal && <td style={tdStyle}>{fmt(total.ebitda, light)}</td>}
          </tr>
          <tr>
            <td style={labelStyle}>EBITDA %</td>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} style={tdStyle}>
                {margin(i, (q) => q.ebitda)}
              </td>
            ))}
            {includeTotal && (
              <td style={tdStyle}>
                {total.revenue ? pct((total.ebitda / total.revenue) * 100) : '—'}
              </td>
            )}
          </tr>
          <tr>
            <td style={labelStyle}>Net Profit</td>
            {Array.from({ length: cols }, (_, i) => (
              <td key={i} style={tdStyle}>
                {cell(i, (q) => q.netProfit)}
              </td>
            ))}
            {includeTotal && <td style={tdStyle}>{fmt(total.netProfit, light)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
