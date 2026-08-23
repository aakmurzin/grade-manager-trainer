# Grade Business Trainer — Addendum 17

Смена бизнес-профиля Design Agency: volume-магазин (много маленьких быстрых заказов), не
средний чек. Ответ на Classical-диагностику addendum-15/16 (5/6 bankrupt, throughput ниже
demand). **Не откат** A08–A14. Near-close порог остаётся 27%. Rapid-критерий — по-прежнему
отдельный шаг.

Черновые числа — первый прогон, не финальная калибровка.

---

## Что сделано в коде

### 1. Роль Designer (только Design Agency)

- Новая delivery-роль: те же тиры и rework (35/15/5%), матч **только по domain**.
- `Project.stack` для Design **не генерируется**. UI Tasks показывает domain без stack.
- IT / Product / Marketing по-прежнему Dev + stack.
- Trainee-пул: гарантированы Sales + **Designer** (не Dev). `canHireRole` скрывает Dev в
  Design и Designer во всех остальных типах.
- Спрайт: tablet + stylus (`docs/asset-prompts-trainer-delta.md`, extract
  `MAPPING_DESIGNER`).

### 2. Per-company `closeDuration` / `baseDeliveryDuration`

Были глобальными константами (close = 2w, one-off delivery = 3w × durationModifier).
Теперь поля `COMPANY_PROFILES`. Остальные типы **не менялись** (2 / 3).

### 3. Черновик Design Agency

| Параметр | Было | Стало (черновик) |
|---|---|---|
| Чек лида | $800–2200 | **$500–600** |
| Sales close | 2w | **0.5w** |
| Delivery (хранимый one-off) | 3w | **1w** (Designer) |
| Spawn Trainee | 2.6w/лид | **1.0w/лид** (середина 0.8–1.2) |

---

## Дискретность (урок A14, повтор)

Недельный тик **не умеет** 0.5 недели как отдельный календарный момент:

- close 0.5w → `progress += 200` за тик → закрытие за **1 тик** (как 1w).
- Spawn &lt; 1.0 схлопывается в 1w (`Math.max(1, interval)` в `tickWeek`).
- Near-close 27% **никогда не стреляет** на 1-тиковом close: между тиками progress 0, после
  тика лид уже закрыт. Первый Designer нанимается по **queued project** (ветка
  `hasPostCloseWork`) — это ок, порог 27% не трогаем.

Итоговый цикл на доске: ~2 календарные недели (1 тик close + 1 тик delivery), не 1.5.

---

## Classical batch — Design Agency Trainee n=12

Батч: `playtest-results/batch-addendum-17-classical-design.json`  
Сравнение: `playtest-results/addendum-17-classical-summary.json`  
Агент: тот же `reasonable` (near-close 27%, skip-mismatch при idle &lt; 3w).

### vs addendum-15 Design (n=6)

| | A15 Design | A17 Design (n=12) |
|---|---|---|
| Bankrupt | 5/6 (**83%**) | 9/12 (**75%**) |
| Дошли до 4Q | 1/6 | 3/12 |
| **Cumulative NP > 0** | **0/6** | **0/12** |
| Q3 или Q4 в плюсе | 1/6 (s01) | **0/12** |
| Q1 median NP | −6218 | −8258 |
| Лучший полный прогон | s01 cum **−1006** | s10 cum **−10073** |

Ожидание шага («заметное снижение bankruptcy, появление cum-positive») — **не выполнено**.
Bankruptcy чуть ниже, но выжившие **глубже в минусе**, ни одного плюсового квартала Q3/Q4.

### Почему volume не окупился — не откат архитектуры

Логи s01: `skip_project` 33 vs `assign_project` 23. Агент **ждёт domain-match** на Designer
так же, как ждал stack-match на Dev (порог force: backlog ≥4 или idle ≥3w). На цикле 1w и
чеке $500 это простой в 2–3 недели = несколько чеков зарплаты.

При 2 Designer теоретический потолок ~2 сделки/нед ≈ $6–7k/квартал. Факт: ~7–8 assign за
квартал у лучших прогонов — утилизация ~30%. Узкое место **не длина delivery**, а
**patience агента на domain-match** плюс узкий чек vs quarterly salary.

Addendum предупреждал, что domain matching «теряет драматичность в абсолютных числах»
(штраф +50% на коротком duration). Для агента драматичность **не в штрафе, а в skip**: он
предпочитает ждать match, а не платить +50% на баннере.

Rework Junior 35% на 1w delivery — не главный драйвер этого батча (skip доминирует).

### Типичный прогон A17

- W1: 2× Sales, Designer отложен (near-close молчит)
- W4–5: force-mismatch лидов, первый Designer после появления queued project
- Дальше: skip mismatched projects, очередь растёт, 2–4 Sales на payroll
- Q2 убыток меньше Q1 (тренд есть), но не выходит из минуса; банкротство Q2–Q3

s10 (лучший): Q=[−4264, −2158, −2182, −1469], cum −10073, 2 Sales + 2 Designer, 30 assigns / 48w.

---

## Статус рычагов

| Рычаг | Статус |
|---|---|
| Designer роль + per-company timings | **держим** — архитектура нужна, цифры черновые |
| Чек $500–600 / close 0.5 / delivery 1 / spawn 1.0 | **черновик**, не подтверждён этим батчем |
| Near-close 27% | не трогаем |
| Product / IT / Marketing timings | не менялись |
| Rapid-критерий | следующий отдельный шаг |

---

## Что имеет смысл следующим шагом (не в этом батче)

Один рычаг за раз:

1. **Агент / Prioritization для volume:** force-assign Design-mismatch раньше (idle 0–1w,
   не 3w) — проверить, является ли skip главной причиной 30% утилизации.
2. Если после (1) cum+ всё ещё нет — чек или spawn, не откат Designer-роли.
3. Rapid-специфичный критерий (runway) — независимо.
