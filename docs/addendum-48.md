# Grade Business Trainer — Addendum 48

Первая paired-итерация Design `checkBand`: `[600, 700]` → **`[800, 1000]`** на seeds
`10001..10024` (тот же набор, что `addendum-47`).

Источник: `playtest-results/batch-addendum-48-design-checkband-800-1000.json`  
Baseline: `playtest-results/addendum-47-design-death-diagnosis.json`

## Config snapshot

| | A47 | A48 |
|---|---|---|
| `checkBand` | `[600, 700]` | **`[800, 1000]`** |
| Start budget | $20,000 | unchanged |
| Spawn / agent / seeds | same | same |

Один рычаг: только чек.

---

## 1. Aggregate paired comparison

| | A47 `[600,700]` | A48 `[800,1000]` |
|---|---:|---:|
| Bankrupt | 20.8% | **0%** |
| Profitable | 0% | **66.7%** (16/24) |
| Mean NP | −$8,873 | **+$1,648** |
| Median NP | −$9,135 | **+$1,359** |
| p10 | −$13,023 | **−$4,047** |
| p90 | −$3,677 | **+$8,202** |
| Best | −$1,967 (s02) | **+$10,503** (s05) |
| Fairness verdict | structural | **fair_winnable** |

Целевой сигнал первой итерации (сокращение median-разрыва **и** ≥1 cum-positive) —
**перевыполнен**: median пересёк ноль, 16 profitable, bankrupt исчез на этом seed-наборе.

---

## 2. Session-level flips (все 24 seeds)

| Outcome | n |
|---|---:|
| better | **24** |
| worse | **0** |
| became profitable | **16** |
| escaped bankrupt | **5** (все former bankrupt) |
| became bankrupt / lost profit | **0** |
| mean Δ NP | **+$10,521** |
| mean Δ Q1 | **+$1,413** (Q1 mean −$6,767 → −$5,354) |

Монотонное улучшение на каждом seed — чистый paired-сигнал рычага.

s02 (бывший «лучший» A47): −$1,967 → **+$8,329**, Q = `[−5270, +2709, +6171, +4719]`.

---

## 3. Что осталось

8/24 всё ещё cum-negative (не bankrupt): s04, s08, s13, s16, s17, s19, s20, s23.  
Худший: s13 **−$7,162**. Ближайший к нулю минус: s23 **−$76**.

Q1 по-прежнему отрицателен у всех (дыра сжалась, но не исчезла) — recovery в Q2–Q4 теперь
часто достаточен для cum+.

---

## 4. Решение по конфигурации

**Принято на эту итерацию:** оставить `design_agency.checkBand = [800, 1000]` в коде.

Не откатывать. Не прыгать сразу на `[900, 1100]` в том же шаге — первая точка уже дала
fair/winnable на paired seeds; следующий шаг (если нужен) — отдельная paired-итерация после
явного выбора (ещё чек vs стоп vs другой рычаг на остаточный loss-хвост).

Принцип маленького шага (`addendum-32` / этот addendum) оправдан: скромный подъём оказался
достаточен — большой скачок к `[900,1100]` не был нужен для первого PoC.

---

## 5. Что не трогали

Start budget, compliance, spawn, forceAssign, domainReputation — без изменений.

---

## Conclusion

Первый Design paired check-band шаг **успешен**: `[800,1000]` на seeds `10001..10024` даёт
**0% bankrupt / 66.7% profitable / median +$1,359** vs A47 deep-loss baseline. Рычаг чека для
Design подтверждён на детерминированной методологии. Коммит — после явного OK на фиксацию
конфига (или после решения «ещё одна итерация чека»).
