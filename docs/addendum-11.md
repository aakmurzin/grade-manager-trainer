# Grade Business Trainer — Addendum 11

Рациональная эвристика найма **Dev** в playtest-агенте. Пул Junior/Middle-only (`addendum-10`)
**не менялся** — отдельный рычаг, отдельный батч.

Базовый батч (пул, старая эвристика): `batch-addendum-10-trainee-tiers.json`  
Новый батч (пул + рациональный Dev): `batch-addendum-11-rational-dev.json`  
Анализ: `addendum-11-summary.json`

---

## Что изменено (только агент / prompt)

### `reasonable` agent
`evaluateDevHire()` — hire Dev iff work signal + cash runway:

| Момент | Условие |
|---|---|
| До close | `inprogress` lead с `progress ≥ 50%` |
| После close | есть `queued`/`inprogress` project |
| Отложить | бюджет не тянет ~8w funnel после salary; или нет сигнала работы |
| 2-й Dev | только если project backlog > idle Devs |

Убран триггер `salesCount > 0 && devCount === 0 → hire`.  
Rationale явно пишет «wait / near-close / closed work» — пригодно как черновик UX-подсказки.

### `llm` agent
Тот же принцип в system prompt + `hiringHints` в state compact. Fallback = обновлённый
reasonable.

**Роли Sales/HR/support** — без новой эвристики (точечно Dev, как в ТЗ).

---

## Разделение эффектов: A10 пул vs A11 тайминг

| Метрика | A09 (до пула) | **A10 пул only** | **A11 пул+timing** |
|---|---|---|---|
| Dev@w1 speculative | 24/24 | 24/24 | **2/24** |
| Median week first Dev | 1 | 1 | **3** (mean 3.7) |
| Typical hire class | week1 stock | week1 stock | **after assign, near-close (≥50%)** |
| Median S/R (batch cash-in) | 3.83× | **1.53×** | 3.19× |
| Pooled ΣS/ΣR | 4.15× | **3.37×** | 5.09× |
| No-uptick Q1 | 10/24 | 15/24 | 14/24 |
| Design no-uptick | 0→4 (A10) | **4/6** | **2/6** |
| Product no-uptick | — | 3/6 | 5/6 |
| Trainee S/R median | 3.89× | **0.97×** | 3.44× |

**Вывод по рычагам (раздельно):**

1. **Пул Junior/Middle (A10)** дал почти всё улучшение median S/R (3.83→1.53), но ценой Design
   completion (addendum-12).
2. **Рациональный тайминг Dev (A11)** **сломал speculative week-1** (цель эвристики достигнута:
   24→2). Design no-uptick частично отыграл (4→2). Median/pooled S/R **не улучшились** — поздний
   Dev сжимает delivery окно в Rapid Q1, меньше R при том же payroll к EOQ.
3. Не смешивать: тайминг ≠ замена пула; пул ≠ замена тайминга.

Типичный rationale A11: *"Hire Dev … — lead ecommerce at 50% close, work imminent."*

---

## Продуктовая ценность

Лог решений теперь содержит явные формулировки ожидания work-signal — кандидат в copy для
hint bar («не нанимай Dev до близкого close / пока нет project»), отдельно от баланса цифр.

---

## Открыто

- Расширять эвристику на Sales/HR — только если понадобится; сейчас Dev достаточен как тест.
- Design tier/rework (A12 развилка: guaranteed Middle в слоте) — **отдельный** следующий шаг
  экономики; A11 его не закрывает и не отменяет.
- S/R регресс A11 vs A10 — ожидаемый tradeoff «позже нанял → меньше успел отгрузить в Q1»;
  не откатывать эвристику только из‑за S/R без решения по Design completion.
