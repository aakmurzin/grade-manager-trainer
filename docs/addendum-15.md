# Grade Business Trainer — Addendum 15

Пересмотр критерия fair/winnable. Цикл Rapid-калибровки 08→14 больше **не** таргетирует
«Q1 в плюсе в большинстве прогонов». Фиксы A08–A14 **не откатываем**.

Порог near-close **зафиксирован на 27%** (A14 ≈ A11; рычаг исчерпан — см. addendum-14).

---

## Новый Definition of fair/winnable (заменяет addendum-06 для Classical)

Правильные решения окупаются **на дистанции**, не обязательно в Q1.

| Квартал | Ожидание при разумной игре |
|---|---|
| Q1 | Минус или около нуля — **нормально** |
| Q2 | Тренд разворота — убыток сокращается vs Q1 |
| Q3 | В плюсе или близко к нулю |
| Q4 | Уверенно в плюсе |

**Главная метрика:** cumulative Net Profit за **4 квартала Classical**, плюс форма тренда
Q1→Q4 (не только итог).

### Rapid — отдельный критерий (не формализован здесь)

Rapid = 1 квартал → новый критерий **не измерим**. Старый «profitable Q1» для Rapid
**снят**. Отдельный Rapid-критерий (runway / Cashflow Discipline / дожить без банкротства)
— **следующий шаг после Classical-данных**, не в этом батче.

---

## Harness — готовность Classical

**Движок:** `classical_4q` уже в `createInitialState` (`maxQuarters: 4`, 48 недель).
`getState()` / `applyAction()` / promotion accept/decline — без изменений.

**Playtest:** добавлено в `run-batch.ts`:
- `PLAYTEST_FORMAT=classical_4q`
- `PLAYTEST_SCOPE=trainee` (только Design + Product)
- `maxSteps=1200`, `quarterNetProfit[]` в JSON

Переходы между кварталами — через `tick_week` на границе недели 12/24/36/48;
promotion-диалоги обрабатывает агент (как в UI). Отдельного `nextQuarter()` API нет и не
требуется.

---

## Classical batch — Trainee Design + Product (n=12)

Батч: `playtest-results/batch-addendum-15-classical-trainee.json`  
Анализ: `playtest-results/addendum-15-classical-summary.json`  
Агент: `reasonable` (near-close 27%, Junior/Middle pool, rational Dev timing).

### Сводка

| | All (n=12) | Design (n=6) | Product (n=6) |
|---|---|---|---|
| Дошли до конца 4Q | 6/12 | 1/6 | 5/6 |
| Bankrupt | 6/12 (50%) | 5/6 | 1/6 |
| **Cumulative NP > 0** (новый главный) | **4/12 (33%)** | **0/6** | **4/6 (67%)** |
| Q3 или Q4 в плюсе | 6/12 (50%) | 1/6 | 5/6 |
| Q4 в плюсе (дошедшие) | 4/6 | 0/1 | 4/5 |
| Q1 median NP | −6389 | −6923 | −6547 |
| Q2 median NP | −2812 | −3732 | +508* |
| Q4 median NP (6 full runs) | +4677 | — | +5966 |

\*Product Q2 mean +4241 — сильный разворот после Q1 минуса.

### Per-session (Q1…Q4 NP → cumulative)

| Session | Q1 | Q2 | Q3 | Q4 | Cum Q4 | Bankrupt |
|---|---|---|---|---|---|---|
| s01 Design | −4850 | +1349 | +3040 | −545 | **−1006** | no (4Q) |
| s02 Design | −10081 | −4417 | — | — | −14498 | yes w24 |
| s08 Product | −3351 | +4062 | −2390 | +5966 | **+4287** | no |
| s09 Product | −10355 | +11999 | −1779 | +7001 | **+6866** | no |
| s10 Product | −8137 | +7835 | −367 | +4677 | **+4008** | no |
| s11 Product | −7174 | +7434 | +7213 | +6489 | **+13962** | no |

(Полная таблица — в JSON summary.)

### Интерпретация по **новому** критерию

**Product Studio (low-frequency):** соответствует задумке. Q1 стабильно в минусе (−6k…−10k) —
нормально. 4/6 cumulative **+** к Q4; 5/6 с Q3 или Q4 в плюсе. Тренд Q2→разворот виден.
→ **Classical fair/winnable для Product при разумной игре.**

**Design Agency (high-frequency):** **не** проходит новый критерий. 5/6 банкротств до Q4;
единственный полный прогон −1006 cumulative (Q4 снова минус). Q2 не сокращает Q1-убыток в
типичном кейсе. → **Структурная проблема Design остаётся** (не артеfact Rapid-only).

**All:** 50% bankrupt — runway на Classical всё ещё жёсткий; новый критерий не «всё ок», но
**отделяет** «Q1 минус нормально + окупается» (Product) от «не окупается никогда» (Design).

### Старый Rapid-критерий (не применять)

Q1 profitable 0/12 Classical Trainee — **не провал** по addendum-15. Q1 median −6.7k —
ожидаемая инвестиция.

---

## Статус рычагов

| Рычаг | Статус |
|---|---|
| A10 Junior/Middle pool | держим |
| A11/A14 rational Dev + near-close **27%** | **зафиксирован**, итерации порога стоп |
| Rapid NP / S/R как цель | **снято** |
| Classical Design economy | **открыто** — отдельно от Product |
| Rapid-specific criterion | следующий документ после стабилизации Classical read |

---

## Порядок дальше

1. ~~Classical batch~~ — выполнен
2. Формулировать Rapid-критерий (runway, не NP) — отдельный шаг
3. Design на Classical — точечная экономика / runway (не откат Product-пути)
4. Hint «near close (~27%)» — обновить текст **перед** UI, когда порог стабилен (сейчас 27%)
