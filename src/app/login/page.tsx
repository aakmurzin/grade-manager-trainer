'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
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
      setError('Invalid email or password (or database not configured).');
      return;
    }
    router.push('/play');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 420, margin: '60px auto', padding: 24 }}>
      <Link href="/" style={{ fontSize: 12, color: 'var(--muted)' }}>
        ← Home
      </Link>
      <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
        LOG IN
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        Requires Neon <code>DATABASE_URL</code> + <code>AUTH_SECRET</code>. Or use Dev Play without
        auth.
      </p>
      <form
        className="panel"
        style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
        onSubmit={onSubmit}
      >
        <label>
          <span className="label">EMAIL</span>
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          <span className="label">PASSWORD</span>
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
          {pending ? '…' : 'LOG IN'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        No account? <Link href="/signup">Sign up</Link> · <Link href="/play">Dev Play →</Link>
      </p>
    </main>
  );
}
