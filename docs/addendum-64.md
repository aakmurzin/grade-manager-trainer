# Grade Business Trainer — Addendum 64

Q1 compliance grace (календарный) + paired re-verification Marketing.

---

## Manager-фикс A63 — закрыт

Без изменений. Accountant с Manager; таблица уровней согласована.

---

## Реализация — вариант (a)

`maybeCompliance`: если `state.quarter === 1` → return (недели 1–12 сессии).

Не per-contract. Trainee не затронут (compliance уже off).

---

## Paired Marketing — seeds 40001..40024

Артефакт: `playtest-results/batch-addendum-64-marketing-q1grace.json`  
Агент: `reasonable`, Director, `checkBand [5000,7000]`.

| Метрика | A46 baseline | A64 (+ Q1 grace) | Δ |
|---|---|---|---|
| Bankrupt | 66.7% | **58.3%** | −8.4 pp |
| Profitable | 29.2% | **41.7%** | +12.5 pp |
| Mean NP | +$404 | **−$629** | −$1.0k |
| Median NP | −$5.7k (A46) | **−$6.1k** | ≈ |

### Вердикт

Сдвиг **умеренный**: меньше bankrupt, больше profitable, mean чуть хуже (микс хвостов, не
поляризация вроде A36). **Принять как новый Marketing baseline.** checkBand не переоткрывать.

Harness fairness: `fair_winnable`.

Design Trainee — grace не касается (compliance off).

---

## Docs

- `balance-spec.md §1` — Q1 grace в таблице progression
- `balance-spec.md §9` — механика grace + paired цифры
- `balance-spec.md §15` — Marketing row обновлён
