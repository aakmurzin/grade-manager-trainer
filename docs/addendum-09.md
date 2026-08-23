# Grade Business Trainer — Addendum 09

Реакция на `addendum-08` шаг 1: S/R ухудшился (2.0×→2.93×). Три независимых действия;
в коде применён **только** п.1→фикс пула (вес вместо гарантии Dev). Зарплаты не резались.
Marketing — только диагностика.

Baseline сравнения: `batch-addendum-08-step1.json`.  
Пост-фикс батч: `batch-addendum-09-devweight.json` (N=24, reasonable, Rapid).

---

## 1. Диагностика — когда нанимается Dev (батч после шага 1)

Источник: rationale/actions в `batch-addendum-08-step1.json`.  
Proxy «первый closed lead» = неделя первого успешного `assign_project` (проект существует
только после close).

| Класс | n / 24 |
|---|---|
| Dev **до** первого closed lead | **24** |
| из них Dev в week 1 **и** ≤ first `assign_lead` (запас) | **24** |
| Dev at/after first closed lead | **0** |

Примеры (Design): `dev@1`, `assign_lead@2–4`, `assign_project@4–9`.

**Вердикт п.1:** паттерн A — гарантия Dev в пуле + политика агента («есть Sales → сразу
Dev») создают найм **до** реальной потребности. Это **не** доказательство, что зарплата
Dev сама по себе завышена при правильном тайминге. Резать зарплаты вслепую = чинить не тот
рычаг.

**Выбранный фикс (один рычаг):** убрать hard-guarantee Dev; поднять вес в
`recruitRoleWeight` (`dev: 8`, Sales по-прежнему guaranteed). Stack-веса / Sales-гарантия /
зарплаты не трогались.

---

## 2. Батч после ослабления гарантии Dev

| Метрика | A08 step1 | A09 (weight) | Комментарий |
|---|---|---|---|
| Dev hire week 1 | 24/24 | **24/24** | поведение не сдвинулось |
| Speculative (до close) | 24/24 | **24/24** | то же |
| No budget uptick Q1 | 11/24 | 10/24 | ≈ |
| Weeks→$ median (earners) | 7 | 8 | ≈ |
| Post-close median | 3 | **2** | чуть лучше |
| Median S/R (cash-in) | 2.93× | **3.83×** | не улучшился |
| Pooled ΣS/ΣR | 3.75× | **4.15×** | не улучшился |
| Design no-uptick | 1/6 | **0/6** | Design-воронка держится |
| Design weeks→$ med | 9 | **6** | Design ок |

**Интерпретация:** вес `8` на 4 свободных слота после guaranteed Sales всё ещё почти всегда
кладёт Dev на первую доску; reasonable-агент сразу его берёт (`needDev = sales>0 &&
dev==0`). Рычаг «гарантия→вес» формально применён, но **не изменил тайминг найма** при
текущем агенте. S/R от этого не восстановился.

### Что дальше (снова один рычаг, не оба)

| Вариант | Когда |
|---|---|
| **A. Harness:** агент нанимает Dev только после первого queued/closed project (или после первого assign_lead) | Если цель батча — «толковый человек», а не «берёт всё с доски» |
| **B. Пул:** снизить вес Dev (напр. 4–5), чтобы первая доска часто была без Dev | Если хотим проверить тайминг через доступность, не меняя агента |
| **C. Зарплата Dev Trainee** (п.2 исходного ТЗ) | Только если после A или B Dev всё ещё нанимается *после* close, а S/R всё ещё ≫ 1.5× |

Сейчас **C не применять** — диагностика A так и не опровергнута: найм по-прежнему
спекулятивный.

---

## 3. Marketing Agency — отдельная диагностика (код + батч)

По 6 сессиям Marketing в `batch-addendum-08-step1.json`:

| Вопрос | Ответ |
|---|---|
| Доходит ли retainer до assign / inprogress? | **Да** — у всех 6 есть ≥1 `assign_project` (w4–w12) |
| Есть ли budget uptick в Q1? | **Нет** — 0/6 |
| Успевает ли 12w retainer завершиться в Rapid Q1? | **Нет**, если assign не на week 1 (типично w4–w11 → остаток ≪ 12w) |

### Структурный разрыв в движке (важнее позднего assign)

`advanceProject` платит checkpoint **только** для `long_delivery`:

```ts
if (project.engagement === 'long_delivery' && Math.random() < 0.35) {
  payCheckpoint(...)
}
```

`recurring_retainer` при progress проходит churn-проверки, но **не капает деньги**.  
`completeProject` для retainer: только `reputation += 2`, **без** `budget += …`.

Итог: даже «active» retainer в Q1 **не является источником revenue** при текущей реализации —
это не тот funnel, что чинил A08 шаг 1, и не лечится весом Dev. Отдельный патч механики
выплат retainer (по `balance-spec §6`: квартальные/периодические платежи), не смешивать с
пулом/зарплатами Design.

---

## Что не трогали

- IT Outsourcing — вне приоритета
- `STACK_SPAWN_WEIGHTS` — без изменений
- Trainee Dev/Sales/HR salary bands — без изменений
- Marketing payment code — только диагноз, без патча

---

## Код

- `fillCandidateBoard`: снова только guaranteed Sales  
- `recruitRoleWeight('dev')`: **8** (было 3, наравне с Sales)

---

## Открыто

1. Следующий одиночный рычаг против speculative Dev: агент (A) или более низкий вес (B) —
   затем снова батч; зарплата (C) только после этого.
2. Marketing retainer payout — отдельный addendum/патч по §6.
3. Design после A08/A09 по воронке выглядит лучше (0 no-uptick, weeks med 6) — не откатывать
   stack-веса.
