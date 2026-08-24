'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LocaleSelect } from '@/components/LocaleSelect';
import { useLocale } from '@/i18n/LocaleProvider';

export default function ProfilePage() {
  const { data: auth, status } = useSession();
  const { t } = useLocale();
  const [me, setMe] = useState<{
    email?: string;
    managerLevel?: string;
    gradeLinked?: boolean;
  } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void fetch('/api/me')
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, [status]);

  const levelKey = me?.managerLevel ?? 'trainee';

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {t('common.backHome')}
        </Link>
        <LocaleSelect variant="inline" />
      </div>
      <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
        {t('profile.title')}
      </h1>
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="label">{t('profile.managerLevel')}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {t(`levels.${levelKey}`)}
        </div>
        <div className="label">{t('profile.email')}</div>
        <div style={{ color: 'var(--muted)', marginBottom: 20 }}>
          {me?.email ?? auth?.user?.email ?? '—'}
        </div>
        <button type="button" className="btn-ghost" disabled title="Phase 2">
          {t('profile.linkGrade')}
        </button>
        <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8 }}>
          {t('profile.linkHint')}
        </p>
        {status === 'authenticated' ? (
          <button
            type="button"
            className="btn"
            style={{ marginTop: 20 }}
            onClick={() => void signOut({ callbackUrl: '/' })}
          >
            {t('profile.logOut')}
          </button>
        ) : (
          <p style={{ marginTop: 16 }}>
            <Link href="/login">{t('profile.logIn')}</Link>
          </p>
        )}
      </div>
    </main>
  );
}
