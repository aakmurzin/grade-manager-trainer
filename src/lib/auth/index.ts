import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { trainerUsers } from '@/db/schema';

const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === 'development'
    ? 'dev-only-auth-secret'
    : // Vercel/prod without env: keep Auth.js from 500-ing session probes (Dev Play still works).
      // Set a real AUTH_SECRET in the host env before enabling login.
      'grade-trainer-unset-auth-secret-replace-me');

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.AUTH_SECRET &&
  !process.env.NEXTAUTH_SECRET
) {
  console.warn(
    '[auth] AUTH_SECRET is not set — login sessions are insecure. Add AUTH_SECRET in Vercel env.',
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret,
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!hasDatabase()) return null;
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const db = getDb();
        const [user] = await db
          .select()
          .from(trainerUsers)
          .where(eq(trainerUsers.email, email))
          .limit(1);
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.email,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
