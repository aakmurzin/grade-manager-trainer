import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getDb, hasDatabase } from '@/db/client';
import { trainerUsers } from '@/db/schema';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      managerLevel: 'trainee',
      gradeLinked: false,
    });
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(trainerUsers)
    .where(eq(trainerUsers.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    id: user?.id ?? session.user.id,
    email: user?.email ?? session.user.email,
    managerLevel: user?.managerLevel ?? 'trainee',
    gradeLinked: Boolean(user?.gradeUserId),
  });
}
