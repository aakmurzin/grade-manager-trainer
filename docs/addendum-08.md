# Grade Business Trainer — Addendum 08

Калибровка по логике `addendum-07` («Как использовать результат»), шаг 1 только.
Источник baseline: `batch-reasonable-2026-08-16T21-10-17-183Z.json` (N=24).
Пост-фикс батч: `batch-reasonable-2026-08-16T21-28-16-190Z.json` (+ копия
`batch-addendum-08-step1.json`). Анализ: `addendum-08-step1-summary.json`.

**Зарплаты не менялись** (шаг 2 — только если после шага 1 S/R всё ещё ≫ 1.3–1.5×).

---

## Ответы на открытые вопросы (до калибровки)

### 1. Company-type × manager_level в батче — намеренно, не баг

Harness в `scripts/playtest/run-batch.ts` **явно** парит типы с unlock-уровнем:

| Company | managerLevel в батче | unlock в `COMPANY_PROFILES` |
|---|---|---|
| Design Agency | trainee | trainee |
| Product Studio | trainee | trainee |
| IT Outsourcing | manager | manager |
| Marketing Agency | director | director |

UI (`PlayApp` + `canAccessCompany`) гейтит то же самое. Батч — валидный стресс-тест
типов **на их реальных уровнях** (включая меньший старт-бюджет Manager/Director:
14k / 10k vs Trainee 18k). Цифры IT/Marketing из addendum-07 **репрезентативны** для
игрового опыта на этих уровнях, не артефакт «Trainee на чужой компании».

### 2. Design Agency — приоритет подтверждён

Trainee entry-point был худшим по weeks→$ и S/R. Гипотеза high-frequency → Dev backlog
проверяется ниже после шага 1 (не отдельным фиксом).

---

## Шаг 1 — что применено

### A. Гарантированный Dev в пуле (симметрия Sales)

`fillCandidateBoard` (pool=5):

- guaranteed Sales (если hireable / не на cooldown)
- guaranteed Dev (то же)
- remaining 3 — weighted по unlock

### B. `STACK_SPAWN_WEIGHTS` по Company Type

Вместо `pick(STACKS)` uniform — `pickWeightedStack(company)` для Dev-кандидатов и
`Project.stack` при close. Черновые веса из задания (Frontend-heavy Design, Backend-heavy
IT, и т.д.). Код: `src/game/catalog/balance.ts`.

---

## Пересчёт батча после шага 1 vs цели

| Метрика | Baseline (07) | После шага 1 | Цель шага 1 | Статус |
|---|---|---|---|---|
| Сессий без $ за Q1 | 13/24 (54%) | **11/24 (46%)** | ≤ 4/24 | не достигнуто |
| Median weeks→$ (earners) | 8 | **7** | ≤ 6 | почти, не достигнуто |
| Median weeks→$ (все, censor13) | 13 | **10** | — | улучшение |
| Median post-close лаг | 3 | **3** | ≤ 1.5 | не достигнуто |
| Median S/R (cash-in) | 2.0× | **2.93×** | переоценка | хуже / не лучше |
| Pooled ΣS/ΣR | 3.26× | **3.75×** | — | хуже |

Net Profit mean батча всё ещё ~−7.2k, `structural_economy_problem` сохраняется.
Profitable: 0/24.

### Funnel (батч)

| Шаг | Baseline median | После шага 1 |
|---|---|---|
| Hire → assign lead | 3 | **2** |
| Assign → project | 5 | 5 |
| Post-close queue | 3 | **3** (mean 2.9→2.3) |
| Project → first $ | 2 | 2 |

Post-close mean чуть лучше, median по батчу не сдвинулся — Marketing (median post-close 5)
тянет общий агрегат вниз.

---

## По Company Type — Design Agency приоритет

| | Design baseline | Design после §1 | Product после §1 |
|---|---|---|---|
| No budget uptick | 3/6 | **1/6** | 2/6 |
| Weeks→$ median (earners) | 10 | **9** | 7 |
| Censor13 median | 11.5 | **9.5** | 9 |
| S/R pooled | 11.1× | **4.0×** | 2.1× |
| Post-close median | 3 | 3 | **1** |

**Гипотеза high-freq → Dev backlog:** частично подтверждена. Гарантия Dev сильнее всего
помогла Design (нулевые payout 3→1, pooled S/R 11→4). Но post-close на Design всё ещё 3w —
одного Dev в пуле недостаточно против частоты лидов 2.6 + mismatch/stack; Product (low
frequency) уже ближе к цели post-close ≤1.5.

Marketing (director): по-прежнему **0/6** visible payout — отдельная экономика retainer /
короткого Q1, не закрывается шагом 1.

IT: weeks→$ median earners **6.5**, post-close median **0** — тип ближе к «воронка ок»,
но S/R и net всё ещё минус (зарплаты / long_delivery тайминг).

---

## Решение по шагу 2

По критерию addendum-07 / этого addendum: после шага 1 S/R **не** ушёл к 1.3–1.5×
(median 2.93×, pooled 3.75×). Ранний гарантированный Dev даже **увеличил** зарплатный
контур до прихода выручки.

→ **Шаг 2 (зарплатная вилка Trainee Sales/Dev/HR) оправдан следующим действием.**
Не смешивать с новыми рычагами воронки в одном патче — сначала зарплаты, потом снова
батч; либо точечно Design lead interval, но только отдельным шагом после зарплат /
вместо них по приоритету продукта.

Рекомендуемый порядок дальше (не в этом патче):

1. Шаг 2 — снизить Trainee-facing salary bands (или first-pay / start buffer), цель S/R
   median ≤ ~1.5× при том же агенте.
2. Если Design post-close всё ещё ≥3 при нормальном S/R — отдельно смотреть spawn 2.6
   vs Dev capacity (гипотеза high-freq).

---

## Открыто

- Итоговые `STACK_SPAWN_WEIGHTS` — черновые; Design frontend 45% можно подкрутить после
  шага 2, когда шум зарплат меньше.
- Marketing 0 payout при director budget — отдельный кейс (retainer / 12w delivery).
- Следующий батч после шага 2 — снова N=24 + тот же analyze-скрипт.
