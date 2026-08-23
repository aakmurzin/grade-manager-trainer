# Grade Business Trainer — Addendum 46

Закрытие цикла Marketing Director (`addendum-24` → `addendum-46`). Выбор рычага по
`addendum-45`: **Agent не тюнить дальше**; Engine §9 не ослаблять. Цикл закрыт на текущей
конфигурации; следующий приоритет — **Design**.

Данные: `playtest-results/addendum-45-death-diagnosis.json` (`checkBand [5000,7000]`, seeds
40001..40024, paired A43).

---

## Выбор рычага (addendum-45 → 46)

**0/16** bankrupt-смертей произошло после найма Accountant — защита работает там, где он есть.
Проблема — **coverage gap** (не нанят вовремя или вообще), не сила защиты после hire.

Engine-фикс (снижение base compliance rate) отклонён — противоречит `addendum-37`: риск
управляется наймом, не форс-мажором.

Agent-тюнинг триггера/приоритета **не продолжаем** — см. синтез ниже.

---

## Масштаб находки

`addendum-39`: occasional lag (3 сессии, hire отложен 7–10w по кэшу) — рамка «иногда».

Здесь: Accountant нанят у **2/16** bankrupt и **5/24** всей выборки — **системная редкость**,
не единичные случаи.

---

## Находка 1 — 3/16 не про compliance

| Session | Cause |
|---|---|
| s07 | post_payout payroll; Acc @13, 0 compliance events |
| s14 | post_payout payroll; 0 compliance |
| s21 | post_payout payroll; 0 compliance |

~**19%** bankrupt — чистый структурный revenue/payroll разрыв. Accountant-фикс их не тронет.
Остаточный хвост `checkBand`-калибровки (`addendum-43/44`), принят при закрытии чекового рычага.

---

## Находка 2 — insurance paradox

Крупные winners (s12, s15, s17 — +$15k…+$26k) переживают **3–4 compliance fail** без Accountant —
достаточно прибыли, чтобы поглощать удары.

Marginal-сессии — те, кому Accountant нужнее, часто **не могут позволить** hire в момент нужды;
те, кто могут, уже не нуждаются.

Реалистичное экономическое противоречие, не обязательно баг. «Починка» искусственным облегчением
найма для marginal-сессий рискует исказить урок.

---

## Ограничение диагностики

Разделить «триггер не сработал (load < 2)» vs «сработал, hire проиграл бюджет» по текущему
decision log **нельзя** — нет weekly Compliance Load telemetry (как `addendum-38`).

Косвенный сигнал (s05:3, s06:4, s23:3 compliance events) — не строгое доказательство.

**Telemetry-gap** — техдолг на будущее, не блокирует закрытие цикла.

---

## Почему останавливаемся здесь

1. **3/16** — не Accountant; оптимизация триггера не чинит payroll-хвост  
2. **Insurance paradox** — не обязательно баг; дальнейший agent-тюнинг рискует сделать защиту
   слишком доступной marginal-сессиям  
3. Без telemetry дальше — гадание, не калибровка  

---

## Итоговые метрики (paired, `[5000,7000]`, n=24)

| | |
|---|---|
| Bankrupt | **66.7%** |
| Profitable | **29.2%** |
| Mean NP | **+$404** (впервые +) |
| Median NP | **−$5,668** |

Соответствует духу fair/winnable (`addendum-15`): Director — самый жёсткий уровень
(`addendum-24`: start $10k); не каждая сессия обязана быть спасаемой (как Design `addendum-23`:
не гнаться за bankrupt=0%).

---

## Финальная конфигурация Marketing Director

| Параметр | Значение |
|---|---|
| `checkBand` | **`[5000, 7000]`** |
| Accountant trigger | `load ≥ 2` held **2w** (`reasonable` agent) |
| Start budget | Director $10k (без изменений) |
| Compliance base rate | §9 без изменений |

**Известные остаточные причины bankrupt** (тестовая выборка A45):

- ~**19%** — чистый payroll-разрыв post-payout  
- ~**81%** — compliance-related с insurance-paradox динамикой  

**Принятое ограничение:** триггер не гарантирует hire при marginal budget — реалистичное
свойство, не баг.

---

## Что не трогаем

- `checkBand [5000,7000]` — зафиксирован `addendum-44`  
- Start budget — отклонён (`addendum-45`)  
- Compliance base rate / §9 — Engine-фикс отклонён  

---

## Следующий приоритет

**Design Agency Trainee Classical** — deep loss / 0% profitable (`addendum-42`), другой рычаг
(не checkBand). Marketing цикл закрыт; переход к Design calibration.

---

## Conclusion

Marketing Director calibration **закрыт**. Paired methodology (`addendum-42`–`45`) дала
воспроизводимую финальную точку; death-diagnosis объяснила остаточный bankrupt без дальнейшего
параметрического тюнинга Accountant. Следующий cycle — Design.
