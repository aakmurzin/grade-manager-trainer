import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, hasDatabase } from '@/db/client';
import { trainerUsers } from '@/db/schema';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured. Set DATABASE_URL in .env.local.' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password (min 8 chars).' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();
  const existing = await db
    .select({ id: trainerUsers.id })
    .from(trainerUsers)
    .where(eq(trainerUsers.email, email))
    .limit(1);
  if (existing.length) {
    return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const [user] = await db
    .insert(trainerUsers)
    .values({
      email,
      passwordHash,
      managerLevel: 'trainee',
    })
    .returning({ id: trainerUsers.id, email: trainerUsers.email });

  return NextResponse.json({ id: user!.id, email: user!.email }, { status: 201 });
}
