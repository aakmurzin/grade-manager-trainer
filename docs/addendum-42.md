# Grade Business Trainer — Addendum 42

Реакция на root cause из `addendum-41`: движок не был seeded, agent-seed и engine-randomness
расходились, unified/isolated batch использовали разные seed-диапазоны. Внедрён детерминированный
RNG, выровнена методология batch, выполнена ре-верификация ключевых точек.

---

## 1. Честная переоценка addendum-08 → addendum-40

**Остаётся валидным:** направление и относительный эффект каждого фикса (S/R после Sales-пула;
bankrupt после Accountant-триггера; поляризация после чрезмерного чека). Это были сравнения
«до/после одного изменения» с видимым сдвигом — для интерпретации направления не нужна точная
RNG-траектория.

**Под вопросом:** любое конкретное число как *точная, воспроизводимая* характеристика системы.
«Marketing bankrupt = 70.8%» (`addendum-37`) и «Marketing bankrupt = 91.7%» (`addendum-40`) были
верны для конкретных невоспроизводимых выборок, не гарантированным свойством конфигурации.

**Практический вывод:** решения «рычаг исчерпан» (`addendum-23`, `addendum-37`) опирались на
несколько итераций тренда — это частично защищает от шума одной выборки. Но «плато 91.7%→91.7%»
(`addendum-35`) могло быть менее устойчивым, чем выглядело, если каждое число само по себе не
воспроизводилось.

---

## 2. Код: детерминированный RNG

### Engine

- `src/game/engine/rng.ts` — mulberry32 (`initRngState`, `rngFloat`, `rngInt`, `rngPick`)
- `GameState` хранит `sessionSeed` + `rngState`; все rolls в `reducer.ts` идут через seeded PRNG
  (close, rework, churn, compliance, lead value variance, candidate/domain/stack picks)
- `createInitialState({ seed })` принимает опциональный seed; UI без seed — случайный старт

### Batch seeds

- `src/game/engine/seeds.ts`:

| Company | Base | Sessions 1..24 |
|---|---:|---|
| design_agency | 10_000 | 10_001 … 10_024 |
| product_studio | 20_000 | 20_001 … 20_024 |
| it_outsourcing | 30_000 | 30_001 … 30_024 |
| marketing_agency | 40_000 | 40_001 … 40_024 |

- `scripts/playtest/run-batch.ts`: `seed = sessionSeedFor(companyType, indexWithinType)`
- **Один seed** → agent (`createReasonableAgent(seed)`) + engine (`HeadlessSession({ seed })`)

### Детерминизм

`scripts/playtest/smoke-determinism.ts`: seed `40001` дважды → identical `netProfit`, `bankrupt`,
final `rngState`.

---

## 3. Ре-верификация (Classical, reasonable, n=24 per type)

Источники:

- Design: `playtest-results/batch-addendum-42-design-n24.json`
- Marketing: `playtest-results/batch-addendum-42-marketing-n24.json`
- Unified: `playtest-results/batch-addendum-42-unified-n96.json`

### Unified = isolated (методология исправлена)

| Company | A40 unified (old RNG) | A42 isolated | A42 unified |
|---|---:|---:|---:|
| Design bankrupt | 20.8% | **20.8%** | **20.8%** |
| Marketing bankrupt | **91.7%** | **75.0%** | **75.0%** |
| Marketing profitable | 8.3% | **20.8%** | **20.8%** |

Marketing **91.7% в A40 — артефакт** (другие agent-seeds + unseeded engine). На детерминированных
seed isolated и unified **бит-в-бит совпадают** (s73..s96 = те же траектории, что s01..s24
Marketing isolated).

### Design «рычаг исчерпан» (`addendum-23`)

| | A23 (n=12, old seeds) | A42 (n=24, new seeds) |
|---|---|---|
| Bankrupt | 8.3% (1/12) | **20.8%** (5/24) |
| Profitable | 8.3% (1/12) | **0%** |
| Mean NP | −$6,976 | **−$8,873** |
| Median NP | −$7,697 | **−$9,135** |

Абсолютные числа сдвинулись (другой seed-набор + теперь seeded engine), но **форма провала та же**:
Design Trainee Classical — глубокий минус, почти нет profitable, bankrupt умеренный. Вывод A23
«не дожимать стартовый бюджет, рычаг исчерпан» **сохраняется по форме**, не по точным p50.

### Marketing финальная конфигурация (`addendum-39`)

Config: `checkBand [4500, 6500]` + Accountant heuristic (без изменений).

| | A37 final (old seeds) | A42 (new seeds) |
|---|---|---|
| Bankrupt | 70.8% | **75.0%** |
| Profitable | 29.2% | **20.8%** |
| Mean NP | −$2,891 | **−$2,629** |
| p90 NP | +$8,412 | **+$8,352** |

Порядок величин совпадает (высокий bankrupt, положительный p90). Точные проценты **не** равны
старым — ожидаемо при смене seed-диапазона. Конфигурация **не** «ломается» до 91.7% bankrupt при
корректной методологии.

### Product / IT (контроль unified)

| Company | A42 bankrupt | A42 profitable | Mean NP |
|---|---:|---:|---:|
| Product Studio | 4.2% | 58.3% | +$1,235 |
| IT Outsourcing | 50.0% | 50.0% | +$7,432 |

Product по-прежнему playable; IT высокая дисперсия (bankrupt 50%, но mean сильно плюс) — как в A40
по форме, другие точные числа.

---

## 4. Check-band «плато» (addendum-33 → 35) — отложено

Paired-сравнение `[4000,5500]` vs `[4500,6500]` vs `[5000,7000]` **на одном seed-наборе** теперь
технически возможно, но не прогонялось в этом addendum. Рекомендация: три конфигурации × те же
24 seed `40001..40024` — тогда «плато» можно проверить без independent-sample шума.

---

## 5. Рекомендация по n

С paired comparison (config A vs B на `40001..400024`) **n=24 может быть достаточным** — не
увеличивать до 48 заранее. Оценить после первого paired check-band прогона.

---

## 6. Следующий шаг

1. ~~Seeded PRNG в engine~~ ✓
2. ~~Выровнять unified/isolated seeds~~ ✓
3. ~~Ре-верификация Design / Marketing / unified~~ ✓
4. **Optional:** paired check-band plateau на seeds `40001..40024`
5. **Только после (4) или явного skip:** вернуться к вопросу Design vs Marketing priority из
   `addendum-41` — уже на надёжных данных

**Не менять без новых paired-данных:** `checkBand [4500,6500]`, Accountant trigger, Design
baseline, compliance base rate.

---

## Conclusion

Root cause из A41 устранён. A40 Marketing **91.7% bankrupt** не подтверждается — это был
методологический артефакт. Текущая Marketing final config на детерминированных seed: **75% /
20.8% profitable**. Design остаётся «deep loss, rare win» (**20.8% bankrupt, 0% profitable**).
Calibration cycle может продолжаться на воспроизводимой основе; paired-сравнения конфигов —
следующий инструмент.
