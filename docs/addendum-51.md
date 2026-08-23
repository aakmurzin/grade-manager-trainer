# Grade Business Trainer — Addendum 51

Закрытие Design Trainee check-cycle. **`[900, 1100]` — финальная точка.**

---

## Убывающая отдача — почему стоп

| Шаг | Mean lift (paired) |
|---|---:|
| `[600,700]` → `[800,1000]` | **+$10,521** |
| `[800,1000]` → `[900,1100]` | **+$4,363** |

Прирост >2× сжался между шагами — классический diminishing returns. При **bankrupt 0%** и
**profitable 87.5%** дальнейшее давление на оставшиеся 12.5% не оправдано (тот же принцип,
что Marketing A46 / Design A23: не гнаться за 100% profitable как самоцель).

`s13` — optional outlier (Q2 всё ещё минус на `[900,1100]`), не блокер закрытия.

---

## Финальная конфигурация Design Trainee

| Параметр | Значение |
|---|---|
| `checkBand` | **`[900, 1100]`** |
| Delivery role | Designer (domain-only, no stack, A17) |
| `forceAssignIdleThreshold` | **1w** (A19) |
| Start budget | **$20,000** (Trainee +$2k, A22) |
| Spawn | **0.75w** (A21) |
| Stack/domain weights | A08 / updates-post-first-test §5 |
| domainReputation | shared model A27/28 |

Paired baseline (seeds `10001..10024`, classical, reasonable):

| | |
|---|---:|
| Bankrupt | **0%** |
| Profitable | **87.5%** |
| Median NP | **+$6,013** |
| Mean NP | **+$6,011** |

Остаточный хвост: **3/24** non-profitable survivors (s16 ≈ −$536, s17, s13 outlier).

---

## Оба calibrated company types

Marketing (A24→46) и Design (A17→51) теперь на **единой детерминированной методologии**
(A42 seeds + paired comparison).

---

## Conclusion

Design check-cycle **closed**. Коммит `[900,1100]` + `balance-spec.md` §2/§6/§15.
