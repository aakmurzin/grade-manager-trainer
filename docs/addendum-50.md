# Grade Business Trainer — Addendum 50

Вторая paired-итерация Design `checkBand`: `[800, 1000]` → **`[900, 1100]`** на seeds
`10001..10024` (по рекомендации `addendum-49`).

Источник: `playtest-results/batch-addendum-50-design-checkband-900-1100.json`  
Prior: `batch-addendum-48-design-checkband-800-1000.json`

---

## 1. Aggregate paired comparison

| | A48 `[800,1000]` | A50 `[900,1100]` |
|---|---:|---:|
| Bankrupt | 0% | **0%** |
| Profitable | 66.7% (16/24) | **87.5%** (21/24) |
| Mean NP | +$1,648 | **+$6,011** |
| Median NP | +$1,359 | **+$6,013** |
| p10 | −$4,047 | **−$186** |
| p90 | +$8,202 | **+$13,136** |
| Worst | −$7,162 (s13) | **−$3,762** (s13) |

---

## 2. Session-level flips (A48 → A50)

| Outcome | n |
|---|---:|
| better | **24** |
| worse | **0** |
| became profitable | **5** (s04, s08, s16, s17, s23) |
| lost profitable | **0** |
| mean Δ NP | **+$4,363** |

Монотонное улучшение на всех 24 seeds — тот же paired-паттерн, что A47→A48.

---

## 3. Residual loss tail (3/24)

| Session | A48 NP | A50 NP | Q (A50) |
|---|---:|---:|---|
| s13 | −$7,162 | **−$3,762** | `[−6489, −1001, +2604, +1124]` |
| s17 | −$6,134 | **−$3,234** | `[−7631, +1745, +2332, +320]` |
| s16 | −$4,251 | **−$536** | `[−6815, +4434, −1453, +3298]` |

s23: −$76 → **+$4,499** (crossed zero, как ожидалось).  
s04: −$3,571 → **+$774**.

**s13** остаётся единственным deep-loss outlier — Q2 всё ещё минус; улучшился, но не
перешёл в profitable. **s16** почти у нуля (−$536). **s17** — partial recovery, не хватило.

---

## 4. Решение

**Принято:** `design_agency.checkBand = [900, 1100]` в коде.

87.5% profitable / 0% bankrupt / median +$6k на paired 24 — **fair/winnable** для Trainee
Classical. Рычаг чека для Design **не исчерпан** формально (3/24 loss), но diminishing returns:
следующий шаг `[1000,1200]` не обязателен без явного запроса — residual 3/24 включает
known outlier s13.

**Рекомендация по циклу:** считать Design check-band **практически закрытым** на `[900,1100]`;
s13 — optional follow-up (compliance/Q2 pattern), не блокер для фиксации конфига.

Start budget / spawn / compliance — не трогали.

---

## Conclusion

Paired `[900,1100]` подтвердил A49: тот же margin-механизм, +5 profitable, 0 regressions.
Design Trainee: **0% bankrupt, 87.5% profitable** на seeds 10001..10024.
