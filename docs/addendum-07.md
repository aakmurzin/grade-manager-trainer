# Grade Business Trainer — Addendum 07

Анализ, не патч баланса. Цифры из `playtest-results/batch-reasonable-2026-08-16T21-10-17-183Z.json`
(N=24, reasonable, Rapid — прогон addendum-06).

Пересчёт: `npx tsx scripts/playtest/analyze-addendum-07.ts` → `playtest-results/addendum-07-summary.json`.

> Engine `decisionLog` в JSON addendum-06 не сохранялся. Метрики реконструированы из
> agent decision budgets + `netProfit`. Lead-close week — proxy через первый `assign_project`.

---

## Метрика 1 — недели до первого $ в budget

Первый `tick_week`, после которого budget **вырос** (видимый payout).

| | |
|---|---|
| Сессий **без** budget uptick за Q1 | **13 / 24 (54%)** |
| Среди 11 с payout: медиана / mean | **8 / 8.4** недель |
| p10 / p90 | 6 / 11 |
| Распределение | 4, 6, 7, 8, 8, 8, 9, 10, 10, 11, 11 |
| Медиана по всем 24 (no-rev → week 13) | **13** |

**Калибровочный вывод:** медиана по полному батчу ≥ длины квартала — в большинстве
прогонов экономика **не успевает показать игроку первый возврат денег** за Rapid Q1.

---

## Метрика 2 — salary / revenue

`S` = cash hire+bonus за квартал + recurring_est (≈ повтор hire-pays на EOQ).  
`R` = `netProfit + 1.15·S` (overheads 15%).  
Primary median — только сессии с `R_pos > 0` (был видимый cash-in).

| | |
|---|---|
| Медиана S/R (11 cash-in) | **≈ 2.0×** |
| Batch pooled `ΣS / ΣR` | **3.26×** |
| `ΣS` / `ΣR` | 190 230 / 58 267 |

**Калибровочный вывод:** медиана ≥ 2× и pooled ~3.3× — зарплатный контур Trainee/штат
структурно тяжелее того, что Q1 успевает вернуть. Не только спавн лидов.

---

## Метрика 3 — лаги воронки (mean / median, недели)

| Шаг | n | mean | median |
|---|---|---|---|
| Hire → first assign lead | 24 | 2.1 | **3** |
| Assign lead → first assign project (proxy close+queue) | 22 | 4.9 | **5** |
| из них фиксированный sales close | — | 2 | 2 |
| из них post-close queue / mismatch | 22 | 2.9 | **3** |
| Assign project → first revenue | 11 | 1.9 | **2** |

**Где теряется время:** не на найме (быстро), а на **lead→project** (~5w = 2w close + ~3w
очередь/mismatch) и на том, что **половина сессий так и не доходит до payout**. Delivery
после assign короткая (~2w).

---

## Метрика 4 — капитал до первого revenue

`startBudget − budget` непосредственно перед первым revenue tick (n=11).

| | |
|---|---|
| Медиана / mean | **6448 / 6226** |
| p10 / p90 | 4470 / 8029 |
| min / max | 3813 / 8330 |

При safety margin 1.25× медианный buffer ≈ **8.1k** сверх текущего старта — ориентир для
следующей калибровки бюджета, не цифра к внедрению сейчас.

---

## Метрика 5 — по Company Type

| Company | no uptick | weeks→$ median (earners / censor13) | S/R median cash-in | S/R pooled | capital median | largest funnel lag |
|---|---|---|---|---|---|---|
| Design Agency | 3/6 | 10 / 11.5 | **5.0×** | 11.1× | 5482 | assign→project 5.8w |
| Product Studio | 3/6 | 8 / 10.5 | **2.0×** | 3.6× | 8029 | hire→assign 2.3w; capital heavy |
| IT Outsourcing | 1/6* | 8 / 9.5 | **1.0×** | 1.2× | 6002 | assign→project 4.7w |
| Marketing Agency | **6/6** | — / **13** | — | **∞ / 111×** | — | воронка есть, payout нет |

\*IT: 5/6 с видимым uptick; checkpoints иногда на EOQ.

High-frequency Design: payout редкий и S/R катастрофический. Low-frequency Product: реже
uptick, но когда есть — чеки больше (S/R ~2×), капитал до первого $ выше. Marketing
(director, меньший старт): **0 видимых payout за 6 сессий**.

---

## Следующий шаг (ещё не делать)

По логике addendum-07 §«Как использовать результат»:

1. Медиана «до первого $» на полном батче ≈ квартал → нужен **buffer и/или укорочение воронки**.
2. S/R median ~2× / pooled ~3.3× → пересмотр **зарплатной сетки §4**, не только spawn.
3. Главный лаг — **assign lead → project (~5w, из них ~3w post-close)** → точечно mismatch/
   idle после close, не Recruit-пул (hire→assign уже ~2–3w).
