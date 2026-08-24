# Grade Business Trainer — Addendum 58

Живой playtest (не reasonable-агент): два бага доверия к отчётам. Исправлены.

---

## Баг 1 — Cashflow Discipline = 100 при банкротстве

**Причина подтверждена:** формула считала только `near_bankruptcy` (бюджет &lt; ~10% старта, один раз)
и headroom по snapshots. Фактический крах (`budget < 0`) **не** входил в формулу. Сессия с
здоровым средним бюджетом и резким провалом в Q2 могла получить Cashflow 100.

**Fix:** `computeManagerReport.ts` — если `endBudget < 0` (последний `week_snapshot`), то
`score = min(score, 20)` + flagged moment «Company went bankrupt».

**Проверка:** `scripts/playtest/diagnose-addendum-58.ts` — synthetic log (18 snapshots, final
−$584) → cashflow **20**, не 100.

---

## Баг 2 — P&L Total NP не совпадал с суммой строк при mid-quarter bankruptcy

**Причина:** Revenue/Salaries/Overheads накапливались в `quarterRevenue` / `quarterSalaries`, но
EBITDA/NP попадали в `history[]` только на `endQuarter()`. При крахе в середине Q2 Total NP
оставался на Q1 (−$6,963), while row totals уже включали partial Q2.

**Fix:** `reducer.ts` — `flushPartialQuarterIfNeeded()` при `budget < 0` до `gameOver`:
partial quarter в `history[]` с prorated recurring salaries (× weeks elapsed / 12).

**Проверка:** diagnose script — forced Q2 death → `Total EBITDA = Revenue − Salaries − Overheads − Penalties`.

---

## Почему batch не поймал

Reasonable-агент на калиброванных типах редко умирает mid-quarter с растущей выручкой. Живой
игрок нашёл edge case с первой сессии — аргумент за параллельный human playtesting.
