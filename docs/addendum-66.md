# Grade Business Trainer — Addendum 66

Auth / БД подключены к Neon + Auth.js. HANDOFF упоминал Supabase — остаёмся на Next/Neon.

---

## Что сделано

- Neon Postgres project + `DATABASE_URL` (local `.env.local` и Vercel Production/Preview/Development)
- `AUTH_SECRET` + `AUTH_URL` на local и Vercel
- `npm run db:push` — схема: `trainer_users`, `sessions`, `decision_log`, `manager_reports`
- Unused Auth.js adapter tables (`user` / `account` / `session`) убраны из schema (JWT Credentials)
- Smoke: signup → login → POST/PUT sessions → History + Manager Report

## Как пользоваться

```bash
cp .env.example .env.local   # DATABASE_URL + AUTH_SECRET + AUTH_URL
npm run db:push
npm run dev
```

Dev Play без БД по-прежнему работает (`hasDatabase()` → API 503). Login / History / Profile требуют Neon.

## Phase 2 (не в этом addendum)

- Grade OAuth / Link Grade на Profile — заглушка
- Magic link — не нужен для Phase 1 (email/password достаточно)
