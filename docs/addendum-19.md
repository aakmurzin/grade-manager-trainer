# Grade Business Trainer — Addendum 19

Единственный рычаг после addendum-17: компания-специфичный порог терпения перед
force-assign. Не near-close, не откат Designer, не чек/spawn.

---

## Фикс

`COMPANY_PROFILES.forceAssignIdleThreshold`:

| Тип | Порог idle до force-assign |
|---|---|
| Design Agency | **1w** (диапазон 0–1 из ТЗ) |
| Product / IT / Marketing | **3w** (как было) |

Агент: match-назначение по-прежнему первым. Среди mismatch — сначала stale
(idle ≥ порог **или** backlog ≥ 4), потом skip. Иначе свежий `skip_lead` съедал бы
ход и порог 1w на проектах не срабатывал бы.

Mismatch как механика не отменён (штраф duration / close chance остаётся). Меняется
только скорость решения «ждать match vs назначить anyway».

---

## Classical Design Trainee n=12 vs A17

Батч: `playtest-results/batch-addendum-19-classical-design.json`  
Сводка: `playtest-results/addendum-19-classical-summary.json`

| | A17 (patience 3w) | A19 (Design gate 1w) |
|---|---|---|
| Bankrupt | 9/12 (**75%**) | 6/12 (**50%**) |
| Дошли до 4Q без банкротства | 3/12 | **6/12** |
| **Cumulative NP > 0** | **0/12** | **0/12** |
| Q3 или Q4 в плюсе | 0/12 | **3/12** |
| Q1 median NP | −8258 | −7226 |
| Лучший полный cum | s10 **−10073** | s05 **−4425** |
| assign_project / сессию | 19.7 | **27.4** |
| skip_project доля | 51% | **30%** |
| skip_lead | 233 | **0** |
| forced mismatch projects | 112 | 191 |
| Delivery Quality (avg axis) | 51 | 48 |

Рычаг **сработал как диагностика предсказывала**: больше assign, меньше skip,
ниже bankruptcy, появились плюсовые Q3/Q4 (s05 Q3 +707, s06 Q2 +983 / Q4 +13,
s07 Q4 +987). Delivery Quality чуть просела — ожидаемый обмен точности на
throughput.

**Cum-positive по-прежнему 0/12.** Лучший прогон s05: Q=[−3881, +3, +707, −1254],
cum −4425 — разворот в Q2–Q3 есть, Q4 снова минус, дистанция не окупается.

### Почему skip_lead обнулился

Порог 1w **плюс** старый триггер `backlog ≥ 4`. На spawn 1.0w очередь быстро
набирает 4 элемента → mismatch-лиды форсятся почти сразу. Это внутри заявленного
диапазона 0–1w (ближе к 0), не отдельный рычаг. Product/IT/Marketing по-прежнему
на 3w.

---

## Условие следующего шага — выполнено

Согласованный порядок: если после force-assign **cum-positive всё ещё нет** →
пересмотр **чека / spawn-интервала** (черновик A17 $500–600 / 1.0w). Не раньше,
не параллельно. Designer-роль, per-company timings и порог 1w **держим**.

Near-close 27% и Rapid-критерий — не здесь.
