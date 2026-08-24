# Grade Business Trainer — Addendum 61

Второй живой прогон (Design, bankrupt). P&L Total и archetype blurbs — OK. Cashflow=100 на
банкротстве — **регрессия пути вызова**, не формулы. Плюс аудит i18n.

---

## 1. Cashflow = 100 при bankrupt — root cause (не «фикс не задеплоился»)

Формула `min(score, 20)` при `endBudget < 0` работала. Synthetic A58 тестировал negative
**последний** `week_snapshot`. Реальная смерть часто другая:

**Порядок в `tickWeek` до A61:** snapshot → `endQuarter()` (зарплаты/overheads).

При банкротстве на EOQ-payroll:

1. `week_snapshot` пишет ещё **положительный** budget
2. `endQuarter` списывает recurring → `budget < 0` → `bankrupt = true`
3. `computeManagerReport` брал `endBudget = lastSnap.budget` → **> 0** → cap не срабатывал → Cashflow 100

Совпадает с сессией: Total NP = Σ Q1–Q3 (−17 965), смерть на границе квартала, n=36 (ровно 3×12
snapshots), без mid-quarter flush.

### Fix (два слоя)

1. **Engine:** `endQuarter` **до** snapshot — последний snap видит post-payroll budget
2. **Report API:** `computeManagerReport(log, { finalBudget, bankrupt })` — UI и `/api/sessions`
   передают `state.budget` / `state.bankrupt` (не только snap)

Проверка: `npx tsx scripts/playtest/diagnose-addendum-61.ts`

| Путь | Результат |
|---|---|
| Healthy snaps + last +$420, без opts | Cashflow ~100 (поверхность бага) |
| Те же snaps + `bankrupt/finalBudget` | Cashflow ≤ 20 |
| Live EOQ payroll death | last snap < 0, Cashflow ≤ 20 |

---

## 2. Подтверждено с живой игры

- P&L Total сходится
- Archetype blurbs (firefighter) — OK

---

## 3. i18n audit (RU / EN / UA)

### Текущее состояние

Смесь языков уже в проде: UI + flagged moments на EN, `archetypeBlurb` на RU. Дефолт предлагается
**EN** (как исходный UI / handoff).

### Объём (оценка)

| Класс | Где | ~объём | Сложность |
|---|---|---|---|
| Статика UI | `PlayApp`, `ManagerReportView`, history, home | ~80–120 строк (кнопки, табы, лейблы, empty states) | Низкая — словарь ключей |
| Роли / домены / тиры | `ROLE_LABELS`, domain ids в UI | ~30 ключей | Низкая |
| Архетип blurbs | `archetypeBlurb()` — 8 текстов | 8 × 3 языка | Средняя — готовый RU; ждут EN/UA |
| Flagged moments | `computeManagerReport` — ~25–30 шаблонов с числами | Шаблоны `{{n}}`, `{{week}}` | Выше — ICU/интерполяция |
| Engine toast | `lastEventMessage` (compliance, etc.) | ~10 | Средняя |
| Docs / addenda | не в runtime | — | Вне scope i18n UI |

Динамика (flagged + blurbs + toasts) — основной риск; статика — быстрый выигрыш.

### Предложение стека

- **`next-intl`** (App Router) или **`react-i18next`** — оба ок; при текущем Next App Router
  удобнее **`next-intl`** (server/client единый паттерн, без лишнего boilerplate).
- Файлы: `messages/en.json`, `messages/ru.json`, `messages/ua.json`
- Namespaces: `ui`, `report` (axes, archetypes, flagged), `roles`
- Переключатель языка в HUD/settings; default `en`; persist `localStorage`
- Phase 1: EN base + infrastructure + RU blurbs перенесены в `report.archetypes.*`
- Phase 2: UA + полный RU UI
- Flagged moments: ключи вида `report.flagged.avoidableMismatch` с params

### Архетип-тексты

RU уже в коде. **EN + UA можно присылать сейчас** — инфраструктура ещё не подключена, но
словари можно принять в `docs/` или сразу в `messages/*.json` черновиком. Жду переводы, когда
удобно — блокировать Cashflow-фикс ими не нужно.

---

## Порядок

1. ~~Cashflow A61 fix~~ — в коде
2. i18n infra (отдельный шаг) — после ОК/UA blurbs или параллельно с EN-only scaffold
3. Автор: EN/UA archetype texts
