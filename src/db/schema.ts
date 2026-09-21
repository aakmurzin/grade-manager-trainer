import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  bigserial,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** HANDOFF §4 — trainer schema (Neon / Postgres). */

export const trainerUsers = pgTable('trainer_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  gradeUserId: text('grade_user_id'),
  managerLevel: text('manager_level').notNull().default('trainee'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => trainerUsers.id),
  companyType: text('company_type').notNull(),
  format: text('format').notNull(),
  speedSelected: integer('speed_selected'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  finalBudget: numeric('final_budget'),
  bankrupt: boolean('bankrupt').default(false).notNull(),
});

export const decisionLog = pgTable('decision_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id),
  week: integer('week').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const managerReports = pgTable(
  'manager_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id),
    scores: jsonb('scores').notNull(),
    archetype: text('archetype'),
    flaggedMoments: jsonb('flagged_moments').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('manager_reports_session_uidx').on(t.sessionId)],
);
