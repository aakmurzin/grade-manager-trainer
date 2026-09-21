# Grade Business Trainer — Addendum 67

Greenlight плана из `addendum-66`. Выполнено без изменений объёма.

---

## Согласовано

- Stack **Supabase → Neon + Auth.js** принят; HANDOFF §3/§6 синхронизированы с фактом кода
- Phase 2 Grade OAuth — не трогаем (заглушка)
- Unused Auth.js adapter tables убраны из schema
- Magic link — не реализуем (email/password Phase 1)

## Подключение (выполнено)

1. Neon project + connection string
2. Local `.env.local` → `db:push`
3. Vercel Production/Preview/Development: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` → redeploy
4. Smoke: Signup → Login → finish session → History + report → `/api/me` — **OK**
5. README live + `docs/addendum-66.md`

## Doc-sync

`docs/HANDOFF.md` §3: Next.js / Neon / Auth.js вместо Vite / Supabase. §4 заголовок и §6 Phase 1 — под тот же стек.

## Бета

Технических блокеров для закрытой беты нет. Дальше — канал баг-репортов и состав первой когорты (не код).
