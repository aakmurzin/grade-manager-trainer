# Grade Business Trainer — Addendum 45

Диагностика типичной bankrupt-смерти на paired `[5000, 7000]` (`addendum-43`) **до** выбора
рычага A/B из `addendum-44`.

Источник траекторий: deterministic replay seeds `40001..40024` с `checkBand [5000, 7000]`
(бит-в-бит те же исходы, что A43; decision log отсутствовал в paired JSON).

Артефакт: `playtest-results/addendum-45-death-diagnosis.json`  
Скрипт: `scripts/playtest/diagnose-addendum-45.ts`

Конфиг snapshot: Accountant heuristic `load≥2` held 2w — on; Director start budget $10k;
seeds 40001..40024; classical_4q; reasonable.

---

## 1. Death timing (16 bankrupt)

Death weeks (sorted):

`[12, 15, 17, 23, 24, 24, 24, 24, 24, 27, 28, 30, 35, 36, 36, 48]`

| | |
|---|---|
| Median death week | **24** |
| Die in pure Q1 (`≤12`) | **1/16** (s19 @12) |
| Die at Q1/Q2 boundary (13–14) | **0/16** |
| Die in Q2 (15–24) | **8/16** |
| Die in Q3+ | **7/16** |

Тот же медианный профиль, что в `addendum-34` (median **24**). Доминанта — **не** «не
дожили до первого квартала».

---

## 2. Payout before death?

| | |
|---|---|
| ≥1 retainer payout before death | **16/16** |
| First payout by week 12 | **15/16** (s14: first @24) |
| Died before first payout | **0/16** |

Снова как A34: чек **уже успел сработать** в каждой bankrupt-сессии. Правый перекос
(mean +$404 / median −$5.7k) — не от «не дожили до payout», а от разброса post-payout судеб.

---

## 3. Compliance vs чистый revenue/payroll

Классификация bankrupt (взаимоисключающая):

| Cause | n | Доля |
|---|---:|---:|
| `compliance_fail_near_death` (fail ≤4w до смерти) | **7** | 43.8% |
| `compliance_fail_earlier_then_payroll` (был fail, смерть позже) | **6** | 37.5% |
| `post_payout_revenue_payroll` (0 compliance fails) | **3** | 18.8% |

Итого **13/16 (81%)** имели ≥1 compliance **fail** до смерти. У всех fails
`accountantCoverage: false` на момент удара (кроме путей, где Acc так и не наняли).

### Accountant среди bankrupt

| | |
|---|---|
| Acc hired | **2/16** (s01 @16, s07 @13) |
| Fail **without** Acc | **12/16** |
| Fail **with** Acc already on payroll | **0/16** |
| Mitigated events among bankrupt | **0** |

s01: fail @12 **до** hire @16 → потом Q3 collapse (−$7.3k) при 4 payouts — Acc опоздал на
первый удар, дальше уже payroll/margin.  
s07: Acc @13, **0** compliance events, смерть @24 от чистого revenue/payroll.

### Survivors (для контраста)

Acc hire: **3/8** alive. s20 — эталон: Acc @13, **2 mitigated / 0 fails**, PROFIT. Остальные
winners часто живут и без Acc (s08/s12/s15/s17) — coverage не обязательна для правого хвоста,
но её отсутствие сильно коррелирует с bankrupt-кластером.

---

## 4. Сопоставление с таблицей A44/A45

| Сценарий таблицы | Подтверждён? |
|---|---|
| **B** — типичная смерть в Q1 до первого payout | **Нет** (0 pre-payout; 1 Q1; median 24) |
| **A** — типичная смерть post-payout, **не** compliance | **Частично / слабо** — post-payout да, но «не compliance» только у **3/16** |
| **Третий** — compliance despite Accountant (триггер сработал, защита слаба количественно) | **Нет в буквальной формулировке** — среди bankrupt Acc почти нет; ни одного fail при уже нанятом Acc |

### Уточнённый диагноз

Типичная медианная смерть на `[5000, 7000]`:

1. **Post-payout** (чек уже был) — как A34  
2. **С сильным compliance co-factor** — 81% bankrupt имели fail  
3. **Без Accountant coverage** на момент ударов — проблема **отсутствия защиты**, не
   недостаточной силы тира после hire

Правый перекос A43: winners тянут mean; медиана остаётся deep-loss, потому что типичный путь
ломается post-payout под uncovered compliance + payroll, а не потому что чек «ещё не дошёл».

---

## 5. Выбор рычага (без старта калибровки)

**Отклонить B** (start budget) — не доминирующий паттерн.

**Не выбирать A как следующий первый шаг** только потому что «post-payout ⇒ ещё чек»:
дальнейший рост чека на paired-данных уже дал mean+, но median всё ещё −$5k и 66.7% bankrupt;
variance-сигнал A36 на чистых данных подтверждён формой распределения. Ещё один jump чека,
скорее всего, ещё раз раздует правый хвост, не починив uncovered-compliance ядро медианы.

**Выбрать уточнённый третий рычаг — Accountant / compliance coverage**, не check и не budget:

Ближайшие кандидаты (выбрать один до A46, paired на `40001..40024`):

1. **Agent:** сделать hire надёжнее на doomed paths (раньше / мягче cash gate) — если
   диагностика покажет, что trigger часто «видел» load, но hire блокировался бюджетом  
2. **Engine (§9):** усилить эффект coverage *или* снизить base compliance / penalty при
   elevated load даже до hire — если проблема в том, что окно до hire слишком узкое относительно
   частоты ударов  
3. Не трогать `checkBand` и start budget в том же шаге (snapshot-правило §14)

Это **не** «усилить тир, потому что Acc был и не справился» — данных под это нет. Это
«убрать дыру coverage на типичном bankrupt-пути».

Чистый payroll-хвост (s07, s14, s21 — 3/16) можно атаковать чеком **после**, если coverage-фикс
снизит bankrupt, но оставит deep median loss.

---

## Conclusion

- Median death **week 24**, **16/16** post-payout — бюджет (B) не оправдан  
- **81%** bankrupt с compliance fail без Acc — не чистый A  
- Буквальный «Acc нанят, защита слаба» — не подтверждён  

**Следующий рычаг: coverage/compliance (уточнённый третий), не чек и не бюджет.**  
Калибровку не начинать, пока не выбран конкретный вариант 1 vs 2 выше.
