'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: auth, status } = useSession();
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

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 24 }}>
      <Link href="/" style={{ fontSize: 12, color: 'var(--muted)' }}>
        ← Home
      </Link>
      <h1 className="pixel" style={{ fontSize: 14, color: 'var(--lblue)', marginTop: 16 }}>
        PROFILE
      </h1>
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="label">MANAGER LEVEL</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {me?.managerLevel ?? 'trainee'}
        </div>
        <div className="label">EMAIL</div>
        <div style={{ color: 'var(--muted)', marginBottom: 20 }}>
          {me?.email ?? auth?.user?.email ?? '—'}
        </div>
        <button type="button" className="btn-ghost" disabled title="Phase 2">
          LINK GRADE ACCOUNT
        </button>
        <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 8 }}>
          Phase 2 — OAuth against Grade REST. Button stays disabled in MVP.
        </p>
        {status === 'authenticated' ? (
          <button
            type="button"
            className="btn"
            style={{ marginTop: 20 }}
            onClick={() => void signOut({ callbackUrl: '/' })}
          >
            LOG OUT
          </button>
        ) : (
          <p style={{ marginTop: 16 }}>
            <Link href="/login">Log in</Link>
          </p>
        )}
      </div>
    </main>
  );
}
