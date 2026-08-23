# Grade Business Trainer — Addendum 55

Аудит **Manager Report** vs продуктовая цель (Company Report + Manager Report). Экономика
(`addendum-08`→`54`) калибровала Company Report; Manager Report проектировался в
`addendum-01`→`04` и почти не трогался в калибровочном цикле.

**Метод:** не галочки по коду, а живой вывод одной 4Q Design-сессии + сверка с batch-срезами.

Артефакт: `playtest-results/addendum-55-manager-report-audit.json`  
Скрипт: `scripts/playtest/audit-addendum-55.ts`  
Сессия: Design Trainee, seed **10005** (A50 profitable, NP **+$15,898**).

---

## Вердикт

**Частично реализовано и работает на реальном прогоне** — не «всё идеально», не «только P&L».
Manager Report — живая функция: 7 осей из `decision_log`, confidence, архетип, PAEI, flagged
moments. Есть расхождения с буквальными формулами §3.1 и пробелы покрытия архетипов на
`reasonable`-агенте.

| Компонент | Статус |
|---|---|
| Company Report (P&L) | **Working** (мелочь: нет отдельной строки Gross Profit) |
| 7 осей из decision_log | **Working** (формулы ≈ §3.1 + addenda, не 1:1 match_rate) |
| Confidence / N/A / archetype gate | **Working** |
| Decision-log event types | **Implemented**; не все срабатывают в каждой сессии |
| activityIndex + drag + `inactive` | **Working** (inactive редко на reasonable) |
| Архетипы + PAEI | **Working**; Design-батч часто схлопывается в `generalist` |

---

## Живой пример — Design seed 10005

### Company Report (P&L)

| | Q1 | Q2 | Q3 | Q4 | Total |
|---|---:|---:|---:|---:|---:|
| Revenue | 7,789 | 11,909 | 17,332 | 17,281 | 54,311 |
| Salaries | 8,210 | 6,066 | 9,810 | 9,316 | — |
| Overheads | 1,232 | 910 | 1,472 | 1,397 | — |
| EBITDA | −1,653 | 4,933 | 6,050 | 6,568 | — |
| Net Profit | −1,653 | 4,933 | 6,050 | 6,568 | **+15,898** |

- `sum(quarter NP) = cumulative NP` ✓  
- `ebitda ≈ revenue − salaries − overheads` по кварталам ✓  
- UI (`PLTable`): Revenue / Salaries / Overheads / EBITDA / Net Profit — **нет** отдельной
  строки Gross Profit (pitch упоминает Gross Profit; фактически Revenue = верхняя строка)

### Manager Report

| Axis | score | confidence | n |
|---|---:|---|---:|
| hiring_discipline | 74 | medium | 5 |
| delivery_quality | 56 | high | 52 |
| client_retention | — | **n/a** | 0 |
| people_leadership | 18 | high | 15 |
| cashflow_discipline | 100 | high | 48 |
| prioritization | 70 | high | 101 |
| capacity_planning | 100 | low | 4 |

- **activityIndex** = **1.0** (drag ×1)  
- **medium/high axes** = **5** ≥ 4 → архетип **разрешён**  
- **archetype** = `generalist`  
- **PAEI** = P65 / A100 / E67 / I18  
- **flagged**: «Avoidable mismatches: 57/57 forced assigns (match freed within 3w)»

Client Retention **n/a** на Design (one-off, 0 retainer/LD assigns, 0 churn) — по правилу
addendum-01 ✓.

### Decision log (эта сессия)

356 событий. Присутствовали: `hire`, `assign_lead`/`assign_project` (с `matched`/`forced`),
`lead_inspected`, `project_inspected`/`project_skipped`, `bonus` (class=`reactive` и др.),
`promotion_accept`/`decline`, `build_desk`, `week_snapshot`, `rework`, `random_event`.

Не сработали здесь (но **есть в engine**): `lead_skipped`, `candidates_rerolled`,
`employee_terminated`, `build_room`, `quit`, `near_bankruptcy`, `client_churn`,
`retainer_payout`.

---

## Чек-лист по спецификации

### Company Report
| Проверка | Результат |
|---|---|
| P&L-структура Grade-like | ✓ Revenue→EBITDA→NP по кварталам |
| Cumulative = сумма Q | ✓ 15898 |
| UI ↔ harness | ✓ один `history[]` / `computeManagerReport(decisionLog)` |

### 7 осей
| Ось | Реализована из log? | Соответствие §3.1 |
|---|---|---|
| Hiring Discipline | ✓ | **≈** — не `match_rate` тир↔задача; senior/junior penalties + avoidable mismatch + rerolls (A01/A04) |
| Delivery Quality | ✓ | ✓ rework_rate + compliance×3 + mismatch |
| Client Retention | ✓ | ✓ N/A без LD/retainer; Marketing batches score ≠ null |
| People Leadership | ✓ | ✓ bonus class + promotions + quits |
| Cashflow Discipline | ✓ | ✓ near_bankruptcy×15 + headroom |
| Prioritization | ✓ | ✓ idle wait only when match available |
| Capacity Planning | ✓ | ✓ early/late expansion + cramped weeks |

### Confidence
| Проверка | Результат |
|---|---|
| `{score, confidence, n}` | ✓ |
| N/A без событий | ✓ client_retention на Design |
| Архетип при &lt;4 medium/high → `insufficient_data` | ✓ код; Marketing A42: 12/24 `insufficient_data` |

### activityIndex
| Проверка | Результат |
|---|---|
| Считается | ✓ |
| Drag до ×0.45 | ✓ `inactivityDrag` |
| `inactive` при &lt;0.28 | ✓ код; на Design reasonable AI≈1 → не наблюдается |

### Архетипы / PAEI
| Проверка | Результат |
|---|---|
| Не хардкод одного | ✓ Design: все `generalist` (профиль агента); Marketing: firefighter / generalist / insufficient_data; IT: firefighter / insufficient_data / generalist |
| Hoarder / Cautious / People-first / Specialist / Gambler | правила в коде; редко на reasonable |
| PAEI | ✓ считается; UI History читает `__meta.paei` |

---

## Приоритет доработок (если трогать дальше)

1. **Hiring Discipline** — сблизить с буквальным `match_rate` тир↔сложность задачи (§3.1), или
   явно зафиксировать текущую формулу как канон в balance-spec
2. **Gross Profit** в P&L UI — косметика / pitch-alignment
3. **Архетип-калибровка** на reasonable — люди_leadership часто низкий → Design почти всегда
   generalist; проверить, что люди_first / specialist достижимы на живой игре
4. Не блокер: inactive/hoarder smoke-тесты на синтетических логах

---

## Conclusion

Тренажёр **уже выдаёт оба отчёта** на реальной 4Q-сессии. Калибровочный цикл не был «пустым» для
Manager Report — оси считаются из того же engine log. Аудит закрывает «неизвестно» → статус
зафиксирован в `balance-spec.md §16`.
