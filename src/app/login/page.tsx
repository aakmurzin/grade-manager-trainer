'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FormEvent, useState } from 'react';
import { LocaleSelect } from '@/components/LocaleSelect';
import { BrandLogo } from '@/components/BrandLogo';
import { useLocale } from '@/i18n/LocaleProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(t('auth.loginError'));
      return;
    }
    router.push('/play');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 420, margin: '60px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {t('common.backHome')}
        </Link>
        <LocaleSelect variant="inline" />
      </div>
      <div style={{ marginTop: 20 }}>
        <BrandLogo size="sm" alt={t('home.brand')} />
      </div>
      <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
        {t('auth.logIn')}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>{t('auth.loginHint')}</p>
      <form
        className="panel"
        style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
        onSubmit={onSubmit}
      >
        <label>
          <span className="label">{t('auth.email')}</span>
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          <span className="label">{t('auth.password')}</span>
          <input
            className="input"
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? '…' : t('auth.logIn')}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        {t('auth.noAccount')} <Link href="/signup">{t('auth.signUpLink')}</Link> ·{' '}
        <Link href="/play">{t('auth.devPlay')}</Link>
      </p>
    </main>
  );
}
