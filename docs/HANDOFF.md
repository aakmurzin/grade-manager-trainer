# Grade Business Trainer — Cursor Handoff

Это стартовая точка для разработки. Проект — **новый репозиторий**, не форк аркады
(`grade-tycoon.html`). Общее с аркадой — только некоторые константы/формулы и общий визуальный
язык бренда, ничего больше.

---

## 1. Что строим (коротко)

Браузерный симулятор управления digital-агентством/IT outsourcing компанией. Игрок нанимает
людей, распределяет проекты, управляет риском — в конце сессии получает два отчёта: реальный P&L
и **Manager Report** — профиль управленческих паттернов, собранный из лога решений за сессию.
Полное продуктовое обоснование — в `docs/pitch.md`. Здесь — только то, что нужно для сборки.

---

## 2. Манифест документов в репозитории

Положить всё в `/docs` в новом репо — Cursor должен читать их как контекст перед началом работы:

| Файл | Назначение |
|---|---|
| `docs/pitch.md` | Продуктовая рамка: проблема, аудитория, каст ролей, позиционирование. Для понимания "зачем", не "как" |
| `docs/balance-spec.md` | **Основной источник правды по цифрам.** Все механики: manager levels, типы компаний, 7 осей Manager Report и их формулы, skill-тиры, promotion, engagement types, long-delivery, reputation, все support-роли, тайминг, комнаты |
| `docs/asset-prompts.md` | Готовые промпты для генерации спрайтов/текстур/мебели (для Stitch или аналогичного инструмента) |
| `docs/prototype-reference.html` | Копия текущего аркадного прототипа (`grade-tycoon.html`) — **не как основа кода**, а как рабочий референс: как выглядит P&L-таблица в стиле Grade, как структурирован HUD, какая цветовая палитра |

Файлы уже существуют, просто скопировать в новый репозиторий.

---

## 3. Стек

| Слой | Выбор | Почему |
|---|---|---|
| Frontend | **React + Vite** | Несколько стейтфул-экранов (логин, история, radar-chart отчёта) — DOM-манипуляции как в прототипе здесь не масштабируются. Vite — самый лёгкий старт без лишнего |
| Backend | **Свой, отдельный от Grade-монолита** (Laravel Grade не трогаем вообще на этом этапе) | Явное решение — не грузить Grade-девелопера. Supabase (Postgres + Auth из коробки) — минимум инфраструктурной работы, поднимается одним человеком |
| Auth (Phase 1) | Supabase Auth, email/password (+ опционально magic link) | Свой независимый логин, ничего не ждём от Grade |
| Auth (Phase 2, не сейчас) | "Sign in with Grade" как **второй** способ входа, не замена | См. §6 |
| Графика/радар-чарт | `recharts` | Готовая библиотека под 6-осевой scorecard, не рисовать вручную SVG как в P&L-таблице прототипа |
| Персонажи/объекты | Спрайт-листы (см. `asset-prompts.md`), рендер через `<canvas>` или спрайт-атлас | Уход от CSS-фигур прототипа — там это было приемлемо для однофайлового HTML, здесь не обязательно тащить то же ограничение |

---

## 4. Схема БД (Supabase / Postgres)

```sql
trainer_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text,                 -- null, если вход только через Grade (Phase 2)
  grade_user_id text,                 -- null до Phase 2, nullable с самого начала
  manager_level text not null default 'trainee', -- trainee | manager | director
  created_at    timestamptz default now()
);

sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references trainer_users(id),
  company_type    text not null,      -- design_agency | it_outsourcing | product_studio | marketing_agency
  format          text not null,      -- rapid_10min | classical_4q
  speed_selected  int,                -- 1|2|3, только для rapid_10min
  started_at      timestamptz default now(),
  finished_at     timestamptz,
  final_budget    numeric,
  bankrupt        boolean default false
);

decision_log (
  id          bigserial primary key,
  session_id  uuid references sessions(id),
  week        int not null,
  event_type  text not null,   -- hire | assign_lead | assign_project | bonus | build_room |
                                -- build_desk | promotion_accept | promotion_decline | random_event
  payload     jsonb not null,  -- гибко, схема формул ещё может уточняться (см. balance-spec §12)
  created_at  timestamptz default now()
);

manager_reports (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references sessions(id) unique,
  scores           jsonb not null,  -- {hiring_discipline: 0-100, delivery_quality: ..., client_retention: ...,
                                     --  people_leadership: ..., cashflow_discipline: ...,
                                     --  prioritization: ..., capacity_planning: ...}
  archetype        text,            -- firefighter | cautious_builder | gambler | people_first | specialist | generalist
  flagged_moments  jsonb not null,  -- [{week, description, axis}]
  created_at       timestamptz default now()
);
```

`decision_log.payload` намеренно jsonb, а не жёсткие колонки — формулы осей (`balance-spec.md §3.1`)
ещё не проверены на живых прогонах, и типы событий могут донабираться. Считать `manager_reports`
стоит на бэкенде (edge function / cron после `finished_at`), не на клиенте — чтобы нельзя было
подделать scorecard, отредактировав фронтенд-стейт.

---

## 5. Игровая логика — что переносить из прототипа, что нет

**Переносить как есть (логика, не код):**
- Разделение `tick()` (экономика) от анимационного цикла (визуал) — сохранить в React как
  разделение "game state reducer" от "render layer", даже если реализация будет через
  `useReducer`/стейт-менеджер вместо `setInterval`
- Формат P&L-таблицы (`buildPLTable` в прототипе) — визуально копировать 1:1, это должно выглядеть
  как настоящий Grade P&L
- Бренд-токены (цвета/шрифты) — взять из `:root` в `prototype-reference.html`

**Не переносить, строить заново:**
- Хранение `state` в глобальных JS-переменных → React state/context
- CSS-фигуры персонажей → спрайт-листы (см. `asset-prompts.md`)
- Плоский `desks[]` массив → `rooms[]` с вложенными `desks[]` (см. `balance-spec.md §11`)
- Жёсткий 90-секундный таймер → двухрежимная система (`balance-spec.md §10`)

---

## 6. Auth-флоу

**Phase 1 (сейчас):**
```
Signup/Login (email+password, Supabase Auth)
  → trainer_users создаётся с grade_user_id = null
  → дальше вся работа в своей БД, Grade не участвует вообще
```

**Phase 2 (после того как Phase 1 работает):**
```
"Link Grade account" в Profile Settings (UI-заглушка уже должна быть в Phase 1, кнопка неактивна)
  → редирект на Grade OAuth
  → Grade возвращает token
  → Trainer backend валидирует его через Grade REST API (единственная точка касания с Grade-инфраструктурой,
    один запрос, не шаренная БД)
  → записывает grade_user_id в существующую запись trainer_users
```
Обратной миграции нет — оба способа входа ведут в одну и ту же таблицу.

---

## 7. Экраны — приоритет для разработки

1. Login / Signup
2. Company & Format Select (тип компании + Rapid 10-мин / Classical 4 квартала)
3. Main Office Screen (HUD, комнаты, тулбар, кнопка ускорения)
4. Manager Report (radar chart на 6 осей, архетип, flagged moments) — экспортируемый/шарибельный
5. Quarter-end P&L modal
6. Session History (список прошлых прохождений, видимый прогресс между попытками)
7. Profile / Account Settings (с неактивной кнопкой "Link Grade account")
8. Recruit / Sales / Tasks панели (карточки кандидатов/лидов/проектов со skill-тирами)
9. Cohort/Team View — **не MVP**, но макет полезен для показа партнёрам
10. Empty/Error states (нет истории, bankrupt, session interrupted)

---

## 8. Явно не в MVP (см. `balance-spec.md §13` для полного списка с обоснованием)

- Co-op/партнёрства между игроками — нужен realtime backend
- Cohort/Team View — агрегация по компании для L&D
- Grade Login (Phase 2 выше)
- Context-switching penalty (сознательно упрощено до `locksEmployee`)

---

## 9. Первый вопрос к самому себе перед началом кода

Схема `decision_log` рассчитана на постфактум-вычисление 7 осей на бэкенде. Прежде чем писать
первую строчку игровой логики — стоит явно решить формат события для **каждого** `event_type` из
списка выше (какие поля обязательны в `payload` для каждого), иначе формулы из
`balance-spec.md §3.1` будет не из чего считать в конце сессии. Это на 1 день работы, но должно
случиться до, а не после того, как основной game loop написан.
