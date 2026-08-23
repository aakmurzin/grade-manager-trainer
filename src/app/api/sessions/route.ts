import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb, hasDatabase } from '@/db/client';
import { decisionLog, managerReports, sessions } from '@/db/schema';
import { computeManagerReport } from '@/game/report/computeManagerReport';
import type { DecisionLogEntry } from '@/game/decisionLog/types';

const startSchema = z.object({
  companyType: z.string(),
  speedSelected: z.number().int().min(1).max(3).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const db = getDb();
  const rows = await db
    .select({
      session: sessions,
      report: managerReports,
    })
    .from(sessions)
    .leftJoin(managerReports, eq(managerReports.sessionId, sessions.id))
    .where(eq(sessions.userId, session.user.id))
    .orderBy(desc(sessions.startedAt));

  return NextResponse.json({
    sessions: rows.map((r) => ({
      ...r.session,
      report: r.report
        ? {
            scores: r.report.scores,
            archetype: r.report.archetype,
            flaggedMoments: r.report.flaggedMoments,
          }
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const parsed = startSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .insert(sessions)
    .values({
      userId: session.user.id,
      companyType: parsed.data.companyType,
      format: 'classical_4q',
      speedSelected: parsed.data.speedSelected ?? 1,
    })
    .returning();

  return NextResponse.json({ session: row }, { status: 201 });
}

const finishSchema = z.object({
  sessionId: z.string().uuid(),
  finalBudget: z.number(),
  bankrupt: z.boolean(),
  events: z.array(
    z.object({
      week: z.number().int(),
      eventType: z.string(),
      payload: z.unknown(),
      createdAt: z.string().optional(),
    }),
  ),
});

/** Finish session: persist decision_log + compute Manager Report server-side. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const parsed = finishSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = getDb();
  const [owned] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, parsed.data.sessionId), eq(sessions.userId, session.user.id)))
    .limit(1);
  if (!owned) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (parsed.data.events.length) {
    await db.insert(decisionLog).values(
      parsed.data.events.map((e) => ({
        sessionId: parsed.data.sessionId,
        week: e.week,
        eventType: e.eventType,
        payload: e.payload as object,
      })),
    );
  }

  const entries = parsed.data.events.map(
    (e) =>
      ({
        id: crypto.randomUUID(),
        sessionId: parsed.data.sessionId,
        week: e.week,
        eventType: e.eventType,
        payload: e.payload,
        createdAt: e.createdAt ?? new Date().toISOString(),
      }) as DecisionLogEntry,
  );
  const report = computeManagerReport(entries);

  await db
    .update(sessions)
    .set({
      finishedAt: new Date(),
      finalBudget: String(parsed.data.finalBudget),
      bankrupt: parsed.data.bankrupt,
    })
    .where(eq(sessions.id, parsed.data.sessionId));

  const [saved] = await db
    .insert(managerReports)
    .values({
      sessionId: parsed.data.sessionId,
      scores: {
        ...report.scores,
        __meta: {
          activityIndex: report.activityIndex,
          paei: report.paei,
        },
      },
      archetype: report.archetype,
      flaggedMoments: report.flaggedMoments,
    })
    .returning();

  return NextResponse.json({ report: saved });
}
