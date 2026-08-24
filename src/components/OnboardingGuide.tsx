'use client';

import { onboardingCopy } from '@/i18n/archetypes';
import { useLocale } from '@/i18n/LocaleProvider';

const SECTIONS = [
  ['hiringTitle', 'hiring'],
  ['assigningTitle', 'assigning'],
  ['teamTitle', 'team'],
  ['riskTitle', 'risk'],
  ['growthTitle', 'growth'],
  ['endTitle', 'end'],
] as const;

/** Inline guide on the company-select screen (addendum-65). */
export function OnboardingPanel() {
  const { locale } = useLocale();
  const t = onboardingCopy(locale);
  return (
    <section
      className="panel"
      style={{ marginTop: 28, padding: 16, maxWidth: 640 }}
      aria-labelledby="onboarding-title"
    >
      <h2
        id="onboarding-title"
        className="pixel"
        style={{ fontSize: 9, color: 'var(--lblue)', margin: 0 }}
      >
        {t.title.toUpperCase()}
      </h2>
      <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>
        {t.intro}
      </p>
      {SECTIONS.map(([titleKey, bodyKey]) => (
        <div key={titleKey} style={{ marginTop: 14 }}>
          <div className="pixel" style={{ fontSize: 7, color: 'var(--muted)' }}>
            {t[titleKey].toUpperCase()}
          </div>
          <p style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.55, margin: '6px 0 0' }}>
            {t[bodyKey]}
          </p>
        </div>
      ))}
    </section>
  );
}

/** Modal re-openable via HUD "?" (arcade showTutorial pattern). */
export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useLocale();
  if (!open) return null;
  const t = onboardingCopy(locale);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 70,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ maxWidth: 520, width: '100%', maxHeight: '85dvh', overflow: 'auto', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="onboarding-modal-title"
          className="pixel"
          style={{ fontSize: 12, color: 'var(--lblue)', marginTop: 0 }}
        >
          {t.title.toUpperCase()}
        </h2>
        <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.55 }}>{t.intro}</p>
        {SECTIONS.map(([titleKey, bodyKey]) => (
          <div key={titleKey} style={{ marginTop: 14 }}>
            <div className="pixel" style={{ fontSize: 7, color: 'var(--muted)' }}>
              {t[titleKey].toUpperCase()}
            </div>
            <p style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.55, margin: '6px 0 0' }}>
              {t[bodyKey]}
            </p>
          </div>
        ))}
        <button type="button" className="btn" style={{ marginTop: 20, width: '100%' }} onClick={onClose}>
          {t.gotIt}
        </button>
      </div>
    </div>
  );
}
