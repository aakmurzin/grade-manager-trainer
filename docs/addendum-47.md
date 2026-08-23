# Grade Business Trainer — Addendum 47

Design Trainee Classical — полная диагностика на **детерминированных** seeds `10001..10024`
(формат A34/A45). Не опираемся на числа addendum-20…23 (pre–RNG-fix): та же дисциплина,
что paired re-verification Marketing `[5000,7000]`.

Артефакт: `playtest-results/addendum-47-design-death-diagnosis.json`  
Скрипт: `scripts/playtest/diagnose-addendum-47.ts`

## Config snapshot

| | |
|---|---|
| Company / level | Design Agency / Trainee |
| Format | `classical_4q` |
| Agent | `reasonable` |
| Seeds | `10001..10024` (`sessionSeedFor`) |
| `checkBand` | **`[600, 700]`** (addendum-20) |
| Start budget | **$20,000** (Trainee $18k + Design +$2k, A22) |
| Spawn | 0.75w (A21) |
| Engagement | one-off (не retainer) |

«First revenue» = первая неделя с `totalRevenue > 0` (complete one-off project).  
`retainer_payout` у Design нет.

---

## 1. Aggregate (n=24) — подтверждение формы A42

| | A42 Design | A47 (тот же seed-набор) |
|---|---:|---:|
| Bankrupt | 20.8% | **20.8%** (5/24) |
| Profitable | 0% | **0%** |
| Mean NP | −$8,873 | **−$8,873** |
| Median NP | −$9,135 | **−$9,135** |
| p10 / p90 | −$13,023 / −$3,677 | same |

Бит-в-бит совпадает с A42 — детерминизм держится. Proof-of-concept из A23 (1/12 cum+)
**на этом seed-наборе не воспроизводится**: лучший исход **−$1,967** (s02).

---

## 2. Death timing (bankrupt only, 5/24)

Death weeks: `[36, 36, 48, 48, 48]` — median **48**

| | |
|---|---|
| Die in Q1 (`≤12`) | **0/5** |
| Die before first revenue | **0/5** |
| All post-revenue | **5/5** |
| All had ≥1 compliance fail | **5/5** |

Bankrupt — **поздний хвост**, не типичная смерть. Медианная сессия **не** банкротится.

---

## 3. First revenue (все 24)

| | |
|---|---|
| Sessions with any revenue | **24/24** |
| First revenue weeks | 4…9 |
| Median first revenue | **week 6** |
| Est. completes / session | ~30–55 (totalRevenue / ~$650) |
| Total revenue range | ~$13k…$36k |

Воронка **работает рано**. Проблема не «не успели закрыть до кассового разрыва».

---

## 4. Что убивает типичную (медианную) сессию

Классификация **всех** 24 (не только bankrupt):

| Cause | n | Доля |
|---|---:|---:|
| `q1_hole_and_continued_loss` | **11** | 45.8% |
| `q1_hole_partial_recovery` | **8** | 33.3% |
| `compliance_fail_near_death` (bankrupt) | 3 | 12.5% |
| `compliance_fail_then_payroll` (bankrupt) | 2 | 8.3% |

**19/24 (79%)** — форма «глубокая Q1-дыра → выживание 4Q в минусе».

### Q1 economics

| | |
|---|---|
| Mean Q1 NP | **−$6,767** |
| Q1 range | −$9,073 … −$4,347 (**все** Q1 отрицательные) |
| Survivor Q2+ | 12/19 |
| Survivor Q3+ | 5/19 |
| Survivor Q4+ | 6/19 |

Лучший путь (s02): Q = `[−6249, +425, +2491, +1366]` → cum **−$1,967**.  
Q2–Q4 **+recovery**, но Q1-дыра (~$6k) больше, чем может отработать хвост на текущем чеке.

Compliance: 19/24 имели fail, в т.ч. 14/19 loss-survivors — **co-factor**, не доминанта медианы
(в отличие от Marketing A45, где 81% bankrupt были compliance-linked).

---

## 5. Сопоставление с рычагами

| Гипотеза | Вердикт |
|---|---|
| Pre-revenue / Q1-до-первого-чека → start budget | **Нет** — 24/24 revenue к w9; median first rev **w6**; 0 pre-revenue deaths |
| Compliance / Accountant-style | **Нет как primary** — Trainee без Acc; bankrupt-хвост compliance-linked, но медиана — Q1 margin |
| Ещё +start budget (A23 reopen) | **Нет** — дыра Q1 ~$6.8k; +$0.5–2k старта не закрывает медиану (A23 это уже говорил; A47 подтверждает на seeded данных) |
| **CheckBand / unit economics** | **Да — следующий рычаг** — объём уже высокий; чек $600–700 не покрывает payroll после Q1 staffing |

Hire timing выглядит нормально (Sales @1, Designer @2–4) — не «агент не нанимает delivery».

---

## 6. Рекомендация — следующий шаг Design

**Открыть paired checkBand-итерацию** на seeds `10001..10024` (метод A43):

1. Baseline `[600, 700]` — уже есть (этот документ / A42)  
2. Следующая точка — умеренный подъём one-off чека (кандидат: например `[800, 1000]` или
   `[900, 1100]` — выбрать одну точку, не скачок в Marketing-масштабы)  
3. Смотреть: median NP, profitable share, Q1 depth, **не только** bankrupt  
4. Один рычаг за раз; start budget / spawn / compliance **не** трогать в том же шаге  

Цель: уменьшить Q1-дыру и дать Q2–Q4 recovery вытянуть cum через ноль на тех же seeds —
не гнаться за bankrupt=0% (A23/A46 принцип).

---

## Conclusion

На детерминированных seeds Design — **не** pre-payout runway failure и **не** compliance-first
режим. Типичный провал: **structural Q1 hole (~−$6.8k) + insufficient post-Q1 margin** при
работе воронки (first revenue median w6, высокий объём closes).

Следующий calibration lever: **`checkBand`**, paired. Start budget и compliance — не primary.
