# Grade Business Trainer — Addendum 49

Реакция на `addendum-48`: фиксация `[800, 1000]` + диагностика **8/24** non-profitable survivors
(не bankrupt) по уже собранному batch.

Источник: `playtest-results/batch-addendum-48-design-checkband-800-1000.json`  
Baseline: `addendum-47` / A47 diagnosis

---

## 1. Зафиксировано: `checkBand [800, 1000]`

Коммит этого addendum. Paired seeds `10001..10024`:

| | A47 | A48 |
|---|---:|---:|
| Bankrupt | 20.8% | **0%** |
| Profitable | 0% | **66.7%** |
| Median NP | −$9,135 | **+$1,359** |

Bankrupt=0% на 24/24 paired — воспроизводимый результат (`addendum-42` methodology).

---

## 2. Диагностика 8/24 loss survivors

Sessions: **s04, s08, s13, s16, s17, s19, s20, s23** (cum NP < 0, survived 4Q).

### Cumulative NP

| Session | cum NP | | Session | cum NP |
|---|---:|---|---:|---|
| s13 | **−$7,162** | | s20 | −$3,338 |
| s17 | −$6,134 | | s19 | −$3,085 |
| s16 | −$4,251 | | s08 | −$2,301 |
| s04 | −$3,571 | | **s23** | **−$76** |

| Bucket | n |
|---|---:|
| Near zero (|NP| < $500) | **1** (s23) |
| Moderate loss (−$500…−$4k) | 5 |
| Deep loss (< −$4k) | 2 (s13, s17) |
| Median of 8 | **−$3,455** |

**Не** кластер «все чуть-чуть не дотянули» — только s23 у порога нуля. Большинство ещё
**далеко в минусе** по cum NP.

### Quarter trajectory shape

| Pattern | n | Sessions |
|---|---:|---|
| Q1 hole → **partial Q2–Q4 recovery**, не хватило до 0 | **7** | s04, s08, s16, s17, s19, s20, s23 |
| Q1 hole → **Q2 тоже минус**, слабый хвост | **1** | s13 |

Profitable group (16/24) — **та же форма**: Q1 минус → сильный Q2–Q4 recovery.  
Различие — **амplitude**, не другой механизм:

| | Profitable (16) | Loss survivors (8) |
|---|---:|---:|
| Mean Q1 NP | −$4,894 | **−$6,274** (глубже дыра) |
| Mean post-Q1 sum (Q2+Q3+Q4) | **+$9,236** | **+$2,534** (слабее recovery) |

7/8 loss survivors **разворачиваются** в Q2–Q4 (частично): s08 имеет Q2+, Q3+, Q4+ все
положительные, но Q1 (−$6,798) слишком глубок для текущего чека.

s13 — outlier: Q2 **−$1,601**, post-Q1 sum **−$273** — единственный «flat/continued bleed»
после Q1 на этом чеке (в A47 был former bankrupt / compliance-heavy seed).

### A47 cause overlap (same seeds)

5/8 loss survivors были **former A47 bankrupt** (s04, s13, s16, s17, s20) — hardest seeds.
3/8 were A47 deep-loss survivors (s08, s19, s23). Нет отдельного «domain-mismatch-only»
кластера, видимого из quarter shape alone.

---

## 3. Интерпретация (таблица из запроса)

| Критерий | Наблюдение |
|---|---|
| «8/24 близко к нулю» | **Нет** — 1/8 (s23); median **−$3.5k** |
| «Другая форма, без Q2–Q3 разворота» | **Нет для 7/8** — partial recovery как у winners; **1/8** (s13) отличается |

**Вывод:** хвост — не «другая причина вместо чека» для большинства, а **тот же Q1-margin +
недостаточный post-Q1 recovery** на более глубоких Q1-дырах (и hardest seeds). Это не
Marketing-style «реальная причина не в чеке» (`addendum-45`→`46`) — здесь чек **ещё релевантен**,
но одного `[800,1000]` недостаточно для нижней трети seed-распределения.

s13 — возможный отдельный follow-up (compliance / Q2 collapse), не блокирует check-итерацию
для остальных.

---

## 4. Рекомендация — следующий шаг

**Да — ещё одна умеренная paired-итерация чека `[900, 1100]`** (после коммита A48/A49):

- тот же seeds `10001..10024`
- один рычаг
- цель: подтянуть s23→+, смягчить moderate tail, наблюдать s13 отдельно

**Не** делать `[900,1100]` вслепую без этой диагностики — сделано.  
**Не** открывать start budget / compliance в том же шаге.

Если `[900,1100]` снова 0 regressions и profitable → 80%+, можно рассмотреть **stop check
cycle** (как Marketing после paired plateau) даже при residual loss < 20%.

---

## Conclusion

`[800,1000]` закоммичен. Loss-хвост 8/24 — преимущественно **insufficient margin on deep Q1
holes**, same shape as winners; не domain-mismatch mystery. Следующий шаг: **paired `[900,1100]`**
(addendum-50), не blind continuation.
