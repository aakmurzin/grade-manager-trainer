'use client';

import Link from 'next/link';
import { LocaleSelect } from '@/components/LocaleSelect';
import { useLocale } from '@/i18n/LocaleProvider';

export default function HomePage() {
  const { t } = useLocale();

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/ui/pixel_g_sm.png"
            alt="Grade"
            width={48}
            height={48}
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="pixel" style={{ fontSize: 18, color: '#fff' }}>
            {t('home.brand')}
          </span>
        </div>
        <h1
          className="pixel"
          style={{
            fontSize: 16,
            color: 'var(--lblue)',
            textShadow: '3px 3px 0 var(--blue)',
            lineHeight: 1.6,
          }}
        >
          {t('home.title')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, margin: '18px 0 28px' }}>
          {t('home.blurb')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn" href="/login" style={{ textDecoration: 'none' }}>
            {t('home.logIn')}
          </Link>
          <Link className="btn-ghost" href="/signup" style={{ textDecoration: 'none' }}>
            {t('home.signUp')}
          </Link>
          <Link className="btn-ghost" href="/play" style={{ textDecoration: 'none' }}>
            {t('home.devPlay')}
          </Link>
        </div>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <LocaleSelect variant="inline" />
        </div>
        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--muted2)' }}>
          <Link href="/history">{t('home.history')}</Link>
          {' · '}
          <Link href="/profile">{t('home.profile')}</Link>
        </p>
      </div>
    </main>
  );
}
