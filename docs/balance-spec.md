# Grade Business Trainer — Balance & Mechanics Spec

Рабочий документ, не для внешней подачи (для этого — `grade-business-trainer-pitch.md`). Здесь —
все механики и цифры, зафиксированные в обсуждении, в одном месте, чтобы не искать их по чату.
Всё здесь — гипотезы для первой сборки, не протестированный баланс — ожидаемо будет
пересматриваться после первых прогонов.

---

## 1. Manager Levels (уровень игрока, не путать со скилл-тирами сотрудников)

Термины: **Trainee → Manager → Director** (сознательно не Junior/Middle/Senior — это занято под
сотрудников).

| | Trainee | Manager | Director |
|---|---|---|---|
| Роли найма | Sales / Dev *или Designer* / HR | + Recruiter / Marketer / Lead Gen / Team Lead | + Accountant |
| Типы компаний | Design Agency, Product Studio | + IT Outsourcing | + Marketing Agency |
| Engagement Types | One-off | + Long-delivery | + Recurring retainer |
| Параллельных проектов | 1 | 2–3 | без лимита (кроме capacity) |
| Стартовый бюджет | щедрый | средний | жёсткий |
| Проверяемые оси | Staffing, Delivery Quality, Cashflow, Prioritization | + Capacity Planning, Team Retention | + Client Retention |
| Разблокировка | доступен всегда | средний Manager Report score ≥ порог за последние N сессий Trainee | score ≥ порог за Manager **и** Reputation ≥ порог |

---

## 2. Типы компаний

Профиль риска/навыка, не косметика — реиграбельность в том, что это разные управленческие
сценарии.

| | Design Agency | IT Outsourcing | Product Studio | Marketing Agency |
|---|---|---|---|---|
| Частота лидов | высокая | средняя | низкая | высокая |
| Engagement type | one-off | **long-delivery** | one-off | **recurring retainer** |
| Средний чек | **$800–1000** (addendum-48 paired; было $600–700 A20) | средний/высокий | высокий, большой разброс | retainer **`[5000, 7000]`/q** — цикл закрыт addendum-46 |
| Разброс (variance) | низкий (намеренно) | низкий | высокий | средний (риск не в размере, а в удержании) |
| Домен-affinity | E-commerce, общий B2B | Enterprise B2B, FinTech | Gaming, HealthTech | E-commerce, Gaming |
| Delivery-роль | **Designer** (domain, без stack) | Dev (stack) | Dev (stack) | Dev (stack) |
| Close / delivery (нед.) | 0.5 / 1 (черновик, addendum-17) | 2 / long-delivery 3–12 | 2 / 3 | 2 / retainer 12 |
| Force-assign mismatch (idle) | **1w** (addendum-19) | 3w | 3w | 3w |
| Spawn Trainee (нед/лид) | **0.75** (addendum-21; тик может дать 2 лида) | — | 4 (low) | — |
| Стартовый бюджет Trainee | **$20 000** (addendum-22: +$2k к уровню) | $18 000 (уровень) | — | — |
| Особый риск | задержка назначения на коротком цикле | комплаенс-проверки чаще | лид может не закрыться совсем | churn при просадке Reputation |
| Ключевая support-роль | — | Accountant | — | Marketer |
| Главный тренируемый навык | Prioritization (volume / скорость оборота) | Client Retention через качество | Cashflow Discipline (редкие крупные ставки) | Client Retention через репутацию |

---

## 3. Семь осей Manager Report

| Ось | Что измеряет | Модификаторы внутри |
|---|---|---|
| **Hiring Discipline** | Соответствие скилл-тира найма сложности/ценности задачи | — |
| **Delivery Quality & Risk** | Управление вероятностью брака (rework, комплаенс) через выбор исполнителя и защитные роли | — |
| **Client Retention** | Удержание уже начатых отношений (long-delivery, retainer) | — |
| **Team Retention / People Leadership** | Мораль, выгорание, **plus** promotion-поведение (повышает / затягивает / теряет людей от отсутствия роста) | proactive/reactive/firefighting бонусы (см. §7) |
| **Cashflow Discipline** | Управление денежным буфером, близость к банкротству | — |
| **Prioritization** | Скорость реакции на очередь при наличии свободных рук | — |
| **Capacity Planning** | Тайминг роста инфраструктуры (столы/комнаты) относительно спроса | — |

---

---

## 3.1 Формулы осей Manager Report

Паттерн общий для всех: "сколько раз сделал правильно / сколько раз была возможность", с
конкретным штрафом за характерную ошибку этой оси. Формула People Leadership — в §7 (там же
классификация proactive/reactive/firefighting).

**Hiring Discipline**
```
match_rate = наймов, где тир ≈ сложности задачи / все наймы
score = 100 × match_rate − overpay_penalty
```
`overpay_penalty` — нанял Senior под задачу, где Junior справился бы с приемлемым риском.

**Delivery Quality & Risk**
```
score = 100 × (1 − rework_rate) − compliance_incidents × 3
```
`rework_rate` — доля завершённых проектов, ушедших в rework хотя бы раз.

**Cashflow Discipline**
```
score = 100 − near_bankruptcy_events × 15 − avg_budget_headroom_penalty
```
`near_bankruptcy_events` — бюджет падал ниже ~10% от стартового. Плюс штраф за низкий средний
запас прочности по кварталам, не только за крайние случаи.

**Prioritization**
```
score = 100 − avg_idle_wait_weeks × weight
```
Среднее число недель простоя лида/задачи в очереди при наличии свободных рук.

**Capacity Planning**
```
score = 100 − early_expansion_penalty − late_expansion_penalty
```
Ранняя экспансия — заполняемость новой комнаты <50% дольше N недель. Поздняя — очередь
лидов/проектов копится при полной занятости столов дольше N недель до расширения.

---

## 4. Skill-тиры Sales/Dev

| Тир | Sales: close chance | Dev: rework % | Dev: скорость (duration modifier) | Decay морали (множитель) |
|---|---|---|---|---|
| Junior | 60% | 35% | базовая | ×1.3 |
| Middle | 80% | 15% | быстрее | ×1.0 |
| Senior | 95% | 5% | самая быстрая | ×0.8 |

**Rework** — не провал, а возврат в работу: +50% к длительности, деньги не капают, ресурс занят
дольше.

**Stack/Domain matching:**
- Dev вне своего stack: +50% к длительности, +15 п.п. к rework
- **Designer** (только Design Agency): матчится по **domain**, не по stack. `Project.stack` не
  генерируется. Domain mismatch — те же штрафы, что stack mismatch у Dev (+50% duration, +15 п.п.
  rework). Тиры и rework-база как у Dev (35%/15%/5%).
- Middle/Senior Dev могут иметь `secondaryStack`: +15% к длительности (Junior — только один stack)
- Sales вне своего domain: −20 п.п. к close chance (Senior 95%→75%, Middle 80%→60%, Junior
  60%→40%); смягчается до −10 п.п., если **комбинированный** `domainReputation` в этом домене ≥**25**
  (addendum-26/28). Счётчик = `domainSalesReputation` (+5 на успешный close) +
  `domainDeliveryReputation` (+2 на complete). Soften и UI смотрят сумму; компоненты логируются
  раздельно (addendum-28).

`closeDuration` и `baseDeliveryDuration` задаются **per Company Type** (addendum-17), не глобально.

---

## 5. Promotion-механика (Sales/Dev)

- Триггер: Junior → Middle после **2 завершённых проектов**; Middle → Senior после **3**
- Условие срабатывания шанса: satisfaction ≥60 на момент триггера (выгоревший не просит роста)
- Диалог в конце квартала: повысить (+35% ЗП Junior→Middle, +45% Middle→Senior) или отказать
- Отказ → cooldown 1-2 месяца, шанс ухода + доп. decay морали, не мгновенный уход
- Senior — потолок, дальше не растёт
- Счётчик `completedProjects` обнуляется после каждого повышения

---

## 6. Engagement Types

| Type | Кто использует | Механика выплаты |
|---|---|---|
| **One-off** | Design Agency, Product Studio | закрыл → выполнил → получил всё сразу |
| **Long-delivery** | IT Outsourcing | `duration` 1/3/6/12 месяцев, помесячные чекпоинты, `locksEmployee: true` |
| **Recurring retainer** | Marketing Agency | платит каждый квартал, пока `inprogress` и назначен delivery (Dev); churn по Client Satisfaction |

### Recurring retainer — детали (addendum-24, уточнение addendum-28)

- Сумма сделки — квартальный платёж (`checkpointValue` = чек; один чекпоинт на 12w контракт)
- Рабочий диапазон чека для Marketing Director: **`[5000, 7000]`** (paired addendum-43;
  цикл addendum-24→**46 закрыт** — дальнейший checkBand-тюнинг не планируется)
- Paired baseline (seeds 40001..40024, reasonable + Accountant trigger): bankrupt **66.7%**,
  profitable **29.2%**, mean NP **+$404**, median **−$5.7k** — Director жёсткий по дизайну
- Контракт **требует назначенного исполнителя** (delivery = **Dev**, не Marketer). `queued`
  (закрыт, но не назначен) не платит на EOQ, не качает progress и не проходит weekly churn
- Пока retainer `inprogress` **и** `assignedEmployeeId` резолвится в сотрудника — выплата на
  границе квартала +2 Reputation (`retainerSurviveQuarter`)
- Назначение ставит Dev в `working` на весь remaining duration (тот же lock, что у long-delivery
  через статус, без отдельного флага `locksEmployee` на retainer)
- Если контракт закрывается до EOQ (быстрый тир) — тот же платёж на `complete`, без двойной выплаты
- Срыв — остаток теряется, −10 Reputation (`retainerChurn`); недельный churn по Client Satisfaction как у long-delivery (не трогали)
- Marketer — support (`keySupport`): +% к чеку лида в `lead.value`, **не** исполнитель retainer

### Long-delivery — детали

- Проект резервирует дева на весь `duration` (нельзя переключить на другое, пока не закончен —
  простая замена сложной механики учёта переключений)
- Deal сумма делится на месячные чекпоинты, капает в `quarterRevenue` того квартала, в котором
  фактически наступил чекпоинт (проект может пересекать границу квартала)
- Каждый месяц считается **Delivery Quality** из: скилл-тира дева + stack-match
- Delivery Quality двигает **Client Satisfaction (0-100)** проекта, тот же паттерн, что мораль
  сотрудника
- Шанс ухода клиента в конкретном месяце зависит от цвета Client Satisfaction:

  | Client Satisfaction | Базовый шанс ухода в этом месяце |
  |---|---|
  | ≥70 (зелёный) | ~2% |
  | 30–69 (жёлтый) | ~15% |
  | <30 (красный) | ~35% |

- +10 п.п. к шансу ухода в конкретном месяце, если у дева satisfaction <30 в этот месяц (клиент
  чувствует выгорание исполнителя)
- Срыв → остаток невыплаченных месяцев теряется, −8 Reputation, дев освобождается
- Полное завершение без срыва → +5 Reputation

### Burnout от долготы (Long-delivery)

| Месяцев подряд на одном проекте | Доп. decay морали дева |
|---|---|---|
| 1–2 | обычный |
| 3–4 | +50% |
| 5+ | +100% |

---

## 7. Морально-бонусная классификация (для People Leadership)

По порогам морали, уже существующим в коде (<30 красный, <60 жёлтый, иначе зелёный):

| Мораль в момент клика "бонус" | Классификация | Эффект на ось |
|---|---|---|
| 60–99 | Proactive | + |
| 30–59 | Reactive-OK | нейтрально |
| <30 | Firefighting | − (и попадает в "конкретные моменты" отчёта) |
| =100 | Wasted spend | минус в Hiring Discipline / бюджетную дисциплину, не в People Leadership |
| Дошло до 0 без клика (quit) | Quit event | самый тяжёлый штраф |

```
proactive_rate = proactive_bonuses / total_bonuses_given
score = 100 × proactive_rate − firefighting_penalty×2 − quit_penalty×5
```

---

## 8. Reputation (общая, отдельно от domainReputation)

| Событие | Δ Reputation |
|---|---|
| One-off сделка выполнена | +1 |
| Long-delivery дотянут полностью | +5 |
| Long-delivery сорвался | −8 |
| Retainer пережил квартал | +2 |
| Retainer ушёл | −10 |
| Сработала налоговая/комплаенс-проверка | −3 |

| Reputation | Пул кандидатов | Чек лида | Частота лидов |
|---|---|---|---|
| <20 | почти только Junior | −15% | −25% (doom spiral) |
| 20–69 | нормальный микс | база | база |
| ≥70 | чаще Senior | +15% | база |

Также — второе условие разблокировки Director: **Reputation ≥ 50**, вместе с Manager Report
score (§1). 50 — выход из зоны "непонятно, доверяют ли вам", но не требует бонусной зоны ≥70:
для допуска к более рискованным типам компаний (Marketing Agency retainers) достаточно быть
"надёжным", не обязательно "звёздным".

---

## 9. Support-роли — единый фреймворк

Тир = сила эффекта. Там, где логичен нарратив перегрузки — есть потолок покрытия
(span of control), за которым эффект линейно проседает к нулю. Promotion-диалогов у
support-ролей нет — нанимаются сразу на нужный тир за цену, без внутриигрового роста.

### HR
| Тир | Снижение decay команды | Покрытие (человек) |
|---|---|---|
| Junior | −20% | 6 |
| Middle | −35% | 12 |
| Senior | −55% | 20 |

Сверх покрытия — сам HR тоже начинает выгорать (перегружен).

### Team Lead
| Тир | Функция | Покрытие (девелоперов) |
|---|---|---|
| Junior | автоассайн задач первому свободному деву | 5 |
| Middle | + лёгкий учёт stack-match | 10 |
| Senior | + приоритизация high-value проектов при автоассайне | 16 |

**Деградация — два независимых слоя, складываются друг с другом:**

*Слой 1 — перегрузка по покрытию.* За пределами покрытия эффективный тир падает на шаг:
Senior → ведёт себя как Middle (теряет приоритизацию high-value), Middle → как Junior (теряет
stack-match). Junior не деградирует ниже — вместо этого автоассайн начинает происходить с
задержкой в несколько дней вместо мгновенного.

*Слой 2 — собственный burnout.* Team Lead — обычный сотрудник со своей `satisfaction`, тем же
$300-кликом. Базовый decay как у статуса "working" (он всегда активен), с надбавкой от перегрузки:

```
extra_decay_multiplier = 1 + max(0, (активных девов − покрытие) / покрытие)
```

Если satisfaction <30 — ещё −1 шаг тира, независимо от загрузки (складывается со Слоем 1). При
quit — увольняется как обычный сотрудник, автоассайн полностью отключается до найма нового.

Разделение специально держит две разные причины деградации отличимыми: "нанял мало Team Lead'ов
под такую команду" (Capacity Planning) vs "забыл про него, пока тушил другие пожары" (People
Leadership) — обе уже тренируются существующими осями по отдельности.

### Recruiter
| Тир | Скидка на найм | Зарядов до выгорания (без HR / с HR) |
|---|---|---|
| Junior | 5% | 3 / 5 |
| Middle | 8% | 4 / 6 |
| Senior | 10% | 5 / 8 |

### Marketer
| Тир | Прибавка к чеку лида |
|---|---|
| Junior | +5% |
| Middle | +10% |
| Senior | +15% (накопительно на каждый платёж retainer) |

Без потолка покрытия — эффект компанейского уровня, не привязан к конкретным людям.

### Lead Gen
| Тир | Частота лидов | Sales capacity (заявок параллельно) |
|---|---|---|
| Junior | +20% | 1 |
| Middle | +35% | 2 |
| Senior | +50% | 2 + лёгкий сдвиг потока к домену специализации компании |

Capacity-бонус покрывает эффективно ~3 Sales-репов на одного Lead Gen, дальше размывается.

### Accountant
Покрывает **Compliance Load** = число активных regulated-domain контрактов + все активные
long-delivery контракты.

| Тир | Снижает | Покрытие (Compliance Load) |
|---|---|---|
| Junior | −30% шанс проверки | 3 |
| Middle | −50% шанс, −25% штраф | 6 |
| Senior | −70% шанс, −50% штраф | 10 |

Свой burnout не заводим — перегрузка проявляется через непокрытый риск, а не через мораль.

Для headless-агента `reasonable` (Marketing Director, **финальная addendum-46**):

- нанимать Accountant не "по умолчанию", а только при зрелом risk-profile
- триггер: активный compliance-load-портфель **≥2** (`inprogress recurring_retainer/long_delivery`)
  удерживается **2 недели подряд**
- **Принятое ограничение (addendum-46):** триггер не гарантирует hire при marginal budget —
  insurance-paradox (защита доступна устойчивым сессиям, marginal часто не могут позволить hire
  в момент нужды). Не баг; agent/engine-тюнинг триггера или §9 base rate **не продолжаем**
- Остаточные bankrupt (~paired A45 на `[5000,7000]`): ~**19%** чистый post-payout payroll-разрыв,
  ~**81%** compliance-related (coverage gap, не слабость защиты после hire)
- **Telemetry debt:** weekly Compliance Load history в decision log — будущее улучшение
  (addendum-38/46); не блокирует закрытие Marketing-цикла

---

## 10. Тайминг сессии

- **Основной формат**: 1 квартал = 10 минут реального времени без паузы; кнопка ускорения
  (1x/2x/3x) доступна в любой момент по ходу игры, без предвыбора
- **Classical**: 4 квартала, полный Play/Pause/1x/2x/3x — без давления часов
- Игровое время: 1 неделя = игровой тик; квартал = 12 недель

---

## 11. Комнаты / масштабирование офиса

| Комната | Условие открытия | Цена | Потолок столов (наследует тир офиса: 6/9/12) |
|---|---|---|---|
| Room 1 | всегда | бесплатно | тир текущий |
| Room 2 | тир ≥ OFFICE, Room 1 забита под потолок | $2,500 | тир текущий |
| Room 3 | Room 2 забита под потолок | $6,500 | тир текущий |
| Room 4 | Room 3 забита под потолок | $11,500 | тир текущий |

- BUILD-цена стола ($1000, +$500/следующий) сбрасывается заново в каждой новой комнате
- Жёсткий общий кап на компанию: **30 столов**, вне зависимости от числа комнат
- Domain Focus Slots: 1 бесплатный + 1 за каждые ~8–10 нанятых; сверх лимита — domainReputation
  растёт вдвое медленнее, падает на 50% быстрее

---

## 12. Открытые вопросы / не зафиксировано числами

- Реальный список случайных событий кроме налоговой проверки — было упомянуто, но не
  расширено
- Все числа в этой спецификации — гипотезы для первой сборки, не тестировались на живых
  игроках; ожидаемо потребуют калибровки после первых прогонов

---

## 13. Отложено в бэклог (не блокирует MVP)

- **Co-op / партнёрства между игроками** — обмен избыточной нагрузкой (лидами) между
  реальными игроками, требует backend real-time, отдельная инициатива после MVP
- **Cohort/Team View** — агрегация Manager Report по команде для L&D
- **Grade Login integration** — Этап 2, после того как свой auth на Supabase заработает
  (см. `HANDOFF.md` / архитектурное обсуждение)
- **Context-switching penalty** (штраф за снятие дева с long-delivery проекта и обратно) —
  сознательно упрощено до полной блокировки (`locksEmployee`) вместо лога переключений;
  можно вернуться, если понадобится больше нюанса

---

## 14. Headless playtest methodology (addendum-42 / 44)

- Engine RNG: mulberry32, seeded via `createInitialState({ seed })` — all close/rework/churn/
  compliance/value rolls are reproducible (`src/game/engine/rng.ts`).
- Batch harness: one seed drives **both** reasonable agent and engine (`sessionSeedFor` in
  `src/game/engine/seeds.ts`). Isolated and unified batches share the same per-company seed range
  (e.g. Marketing sessions 1..24 → seeds 40001..40024).
- Paired config comparison: run two configs on the same seed list; n=24 may suffice without
  independent-sample noise. See `docs/addendum-42.md`, `docs/addendum-43.md`.

### Checklist when comparing batch results across addenda

- Record a **full config snapshot** for each compared batch (not only the parameter you changed):
  checkBand, start budget / level, agent heuristics (Accountant trigger, hire caps, …),
  compliance rates, seed range, n, format.
- Do not assume “previous addendum did not change X” across a multi-step sequence — verify the
  snapshot. Lesson: `addendum-36` `[5000,7000]` (no Accountant) was wrongly compared to
  `addendum-37` `[4500,6500]` (with Accountant); see `docs/addendum-44.md`.
- Prefer paired runs (same seeds) when claiming plateau / polarization / local optimum.

---

## 15. Calibration status (addendum-46)

| Company | Level | Status | Next |
|---|---|---|---|
| **Marketing Agency** | Director | **Closed** (addendum-24→46) | — |
| Design Agency | Trainee | **A48 `[800,1000]`** — 0% bankrupt, 66.7% profitable; loss tail diagnosed A49 | **Active** |
| Product Studio | Trainee | Acceptable (addendum-42 unified) | Monitor |
| IT Outsourcing | Manager | High variance, acceptable mean (addendum-42) | Monitor |

Marketing final snapshot: `checkBand [5000,7000]`, Accountant trigger `load≥2` held 2w, start
$10k, compliance §9 unchanged. See `docs/addendum-46.md`.