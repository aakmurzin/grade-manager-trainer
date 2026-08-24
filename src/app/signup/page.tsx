'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FormEvent, useState } from 'react';
import { LocaleSelect } from '@/components/LocaleSelect';
import { useLocale } from '@/i18n/LocaleProvider';

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '');
    const password = String(fd.get('password') ?? '');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      setError(data.error ?? t('auth.signupFailed'));
      return;
    }

    const login = await signIn('credentials', { email, password, redirect: false });
    setPending(false);
    if (login?.error) {
      setError(t('auth.accountCreated'));
      router.push('/login');
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
      <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
        {t('auth.signUp')}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>{t('auth.signupHint')}</p>
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
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? '…' : t('auth.createAccount')}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        <Link href="/login">{t('auth.haveAccount')}</Link> ·{' '}
        <Link href="/play">{t('auth.devPlay')}</Link>
      </p>
    </main>
  );
}
