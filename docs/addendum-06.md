# Grade Business Trainer — Addendum 06

Автоматизированный AI/heuristic-прогон для ответа на вопрос: **вознаграждает ли тренажёр
за правильные решения, или проигрыш статистически неизбежен**.

Не патч баланса. Применимо после фикса B из addendum-05 (domain ⊥ stack на Project).

---

## 1. Headless test API

Единый движок (`gameReducer` / `createInitialState`), без DOM:

| Метод | Назначение |
|---|---|
| `getState()` | Player-visible snapshot: бюджет, очередь, кандидаты, mismatch/canAssign, hints |
| `applyAction(action)` | `hire`, `assign_lead/project`, `skip_*`, `reroll_candidates`, `give_bonus`, `fire`, `build_*`, promotions, `tick_week` |

Код: `src/game/headless/`.

Агент **не** видит сырые таблицы вероятностей — только то, что видно в UI + hint bar.

---

## 2. Агенты

| Режим | Env | Поведение |
|---|---|---|
| `reasonable` (default) | — | Шумный «толковый менеджер»: матчит domain/stack, skip mismatch, hire Sales→Dev, reroll sparingly |
| `llm` | `OPENAI_API_KEY` или `ANTHROPIC_API_KEY` | Правила (`balance-spec` + addenda) + state → JSON action + rationale; fallback на reasonable |

Каждый шаг логирует **action + текстовое обоснование** (сигнал на UI/читаемость, не только цифры).

История отвергнутых кандидатов прошлых reroll **не** отдаётся — как у живого игрока (открытый вопрос addendum: оставить так).

---

## 3. Batch runner

```bash
npm run playtest:batch
# PLAYTEST_N=24 PLAYTEST_AGENT=reasonable|llm npm run playtest:batch
```

- N сессий, покрытие всех 4 Company Type (trainee / manager / director по unlock)
- Format: Rapid (1×12 недель), без wall-clock
- Результат: `playtest-results/batch-*.json` (gitignored)

Агрегаты: % profitable, распределение Net Profit, avg axes + `activityIndex`,
`excessive_reroll`, avoidable-mismatch flags, банкротства.

---

## 4. Definition of fair/winnable (критерий приёмки)

| Качество игры (по логу решений) | Ожидаемый исход |
|---|---|
| Разумные решения близко к оптимальным | Q1 в плюсе или ~0 в большинстве прогонов |
| 1–2 осознанных компромисса | ~0 / небольшой минус |
| Систематически плохие решения | Уверенный минус |

Если разумная игра **стабильно** в глубоком минусе / банкротстве → структурная экономика,
не «учит через трудность».

---

## 5. Первый прогон (baseline после addendum-05)

**Batch:** `reasonable`, N=24, Rapid (несколько прогонов с разными seed).

Типичные агрегаты:

| Метрика | Диапазон |
|---|---|
| % profitable | **0–8%** |
| % bankrupt | ~4–20% (выше на Marketing / tight cash) |
| Net Profit mean | **примерно −6k…−8k** |
| avg `activityIndex` | ~0.9–1.0 (агент действует, не idle) |
| excessive reroll | 0% |

По Company Type: trainee Design/Product стабильно в минусе; IT Outsourcing иногда ближе к нулю;
Marketing (director, меньший старт-бюджет) чаще уходит в банкротство.

**Вердикт runner:** `structural_economy_problem` — разумная (не идеальная) игра стабильно
даёт глубокий минус. Логи показывают нормальные domain/stack assign и skip mismatch —
сигнал скорее на **экономику тайминга** (close + delivery vs 12 недель / зарплаты / старт-бюджет),
чем на повторный баг матчинга. Решение-логи в JSON сохранены для разбора.

---

## Открыто

- Нужна ли история отвергнутых кандидатов для оценки reroll — пока **нет** (паритет с игроком)
- LLM-батч при наличии ключа — для сравнения с heuristic (меньше bias «наших» правил)
- Отдельный «bad agent»-контроль для проверки нижней строки таблицы §4
