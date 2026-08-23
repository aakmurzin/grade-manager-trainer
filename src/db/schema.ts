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

/** Auth.js tables (when wired). */
export const authUsers = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { withTimezone: true }),
  image: text('image'),
});

export const authAccounts = pgTable('account', {
  userId: uuid('userId')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const authSessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});
