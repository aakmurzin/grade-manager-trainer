'use client';

import { LOCALE_OPTIONS, type AppLocale } from '@/i18n/archetypes';
import { useLocale } from '@/i18n/LocaleProvider';

type Props = {
  /** Compact inline control (landing). Default: labeled block. */
  variant?: 'inline' | 'block';
};

export function LocaleSelect({ variant = 'block' }: Props) {
  const { locale, setLocale, t } = useLocale();

  const select = (
    <select
      aria-label={t('common.language')}
      value={locale}
      onChange={(e) => setLocale(e.target.value as AppLocale)}
      style={{
        background: 'var(--panel)',
        color: 'var(--text)',
        border: '2px solid var(--border)',
        borderRadius: 4,
        padding: '8px 12px',
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        cursor: 'pointer',
        minWidth: variant === 'inline' ? 140 : 200,
      }}
    >
      {LOCALE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (variant === 'inline') {
    return (
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        <span className="pixel" style={{ fontSize: 7 }}>
          {t('common.lang')}
        </span>
        {select}
      </label>
    );
  }

  return (
    <div>
      <h2 className="pixel" style={{ fontSize: 9, marginTop: 28 }}>
        {t('common.language').toUpperCase()}
      </h2>
      <div style={{ marginTop: 12 }}>{select}</div>
    </div>
  );
}
