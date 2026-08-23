# Grade Business Trainer — Addendum 52

Контрольный paired-прогон **Product Studio (Trainee)** и **IT Outsourcing (Manager)** на
детерминированных seeds (методология `addendum-42`). Оба типа никогда не проходили полный
калибровочный цикл — только старые недетерминированные батчи (`addendum-07/08`, `addendum-15`)
и unified-срез A42. Цель: решить, нужен ли полноценный цикл, **до** любых фиксов.

---

## Setup

| | Product Studio | IT Outsourcing |
|---|---|---|
| Level | Trainee | Manager |
| Seeds | `20001..20024` | `30001..30024` |
| Agent / format | `reasonable` / `classical_4q` | same |
| n | 24 | 24 |
| Config | текущий `balance.ts` (без правок) | same |

Артефакты:

- `playtest-results/batch-addendum-52-product-n24.json`
- `playtest-results/batch-addendum-52-it-n24.json`

Harness: `PLAYTEST_SCOPE=product|it` в `scripts/playtest/run-batch.ts`.

**Bit-match с A42 unified:** обе выборки совпали по seed / netProfit / bankrupt с
`batch-addendum-42-unified-n96.json`. Калибровка Design/Marketing после A42 **не сдвинула**
эти типы (company-specific рычаги).

---

## Результаты

| | Product Studio | IT Outsourcing | Design final (A51) | Marketing final (A46) |
|---|---:|---:|---:|---:|
| Bankrupt | **4.2%** | **50.0%** | 0% | 66.7% |
| Profitable | **58.3%** | **50.0%** | 87.5% | 29.2% |
| Mean NP | **+$1,235** | **+$7,432** | +$6,011 | +$404 |
| Median NP (p50) | **+$387** | **−$3,251** | +$6,013 | (high variance) |
| Harness verdict | `fair_winnable` | `fair_winnable` | closed | closed |

Product: 1/24 bankrupt, 14/24 profitable, 9/24 loss-survivors. Низкий bankrupt, mean/median в плюсе.

IT: 12/24 bankrupt (5 из них ≤12 недель), 12/24 profitable, **0** flat survivors — чистая
поляризация. Mean сильно плюс за счёт крупных winners (p90 ≈ +$45k); interpolated median минус.

---

## Решение по критерию addendum-52

Рамка: Design 0%/87.5% и Marketing 66.7%/29.2% — оба приняты как fair при разных профилях риска.
Не открывать цикл заранее.

### Product Studio — **confirmed working by default**

Bankrupt низкий, profitable в приемлемом диапазоне, mean/median плюс, verdict `fair_winnable`.
Форма совпадает с ранним Classical-сигналом (`addendum-15`: лучший среди типов) и A42.
**Полный цикл не открываем.** Конфиг не трогаем.

### IT Outsourcing — **confirmed working by default** (high-variance Manager)

Bankrupt 50% / profitable 50% **лучше** принятого Marketing-профиля (66.7% / 29.2%) при
намного более высоком mean. Не «структурно сломано» (не 0% payout / 100% bankrupt). Явного
доминирующего рычага без диагностики нет — открывать точечный цикл «наугад» нельзя.

Поляризация (ранний runway vs крупные long-delivery winners) — ожидаемый Manager-профиль на
`long_delivery`, не блокер для подтверждения default. **Полный цикл не открываем.** Optional
follow-up (диагностика early-bankrupt runway) — только если приоритет сменится; не часть A52.

---

## Calibration status

| Company | Status | Next |
|---|---|---|
| Product Studio | **Confirmed** (A52) | — |
| IT Outsourcing | **Confirmed** (A52, high variance) | — |
| Design / Marketing | Closed (A51 / A46) | — |

Все четыре company type теперь имеют детерминированный Classical baseline на изолированных
seed-диапазонах. Два прошли полный цикл; два подтверждены без дополнительной калибровки.

---

## Conclusion

A52 = контрольный прогон, не калибровка. Оба типа **confirmed working by default**; циклы не
открыты. `balance-spec.md §15` обновлён.
