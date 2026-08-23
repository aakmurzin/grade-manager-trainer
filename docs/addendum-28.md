# Grade Business Trainer — Addendum 28

Три связанных вопроса: архитектура retainer (Marketing), регресс Design, финальная модель
`domainReputation`. Фиксов баланса нет — диагностика + раздельный трекинг.

Данные:

- Marketing (очередь): `batch-addendum-27-marketing-classical.json`
- Design freeze: `batch-addendum-22-classical-design.json`
- Design A27 n=12: `batch-addendum-27-classical-design.json`
- Design A28 n=24: `playtest-results/batch-addendum-28-classical-design.json`
- Сводка: `playtest-results/addendum-28-diagnosis.json`

---

## Часть A / Трек 1 — Marketing: retainer требует назначения

**Ответ:** активный retainer платит, качает progress и проходит weekly churn **только если**
он `inprogress` **и** `assignedEmployeeId` указывает на живого сотрудника. `queued` (сделка
закрыта, исполнитель не назначен) на EOQ **молчит**.

Это тот же класс lock, что `long_delivery` / `locksEmployee`: назначение ставит delivery в
`working` до конца контракта. У retainer нет отдельного флага — lock через `emp.status`.

**Исполнитель — Dev, не Marketer.** `deliveryRoleFor(marketing_agency) === 'dev'`. Marketer —
`keySupport`: +% к чеку лида, в `assign_project` не участвует. Наблюдение «0 Marketer» с
addendum-25 **верно и по-прежнему бесполезно** как объяснение очереди: очередь ждёт Dev.

Код: `payAliveRetainers` пропускает проект без `emp`; `advanceProject` сразу `return`, если
исполнителя нет. Close создаёт проект со `status: 'queued'`.

A27 (n=12), тот же батч:

| | mean |
|---|---|
| Hire Dev | **0.8** |
| Hire Marketer | **0** |
| Hire Sales | 1.8 |
| Q1 assign_project | **1** (медиана) |
| Оценка closes (`floor(maxDR/5)`) | 1–5 |

Сессии с domainRep 25 закрывают несколько продаж и назначают один retainer — не потому что
«Sales не успевает держать вторую сделку вместо первой», а потому что **один Dev залочен на
12 недель**. Неуспешных `assign_project` = 0: агент не пытается посадить очередь без idle
delivery.

Следующий рычаг (не в этом addendum): рациональный найм **Dev** под растущий queued-портфель
retainers, аналог addendum-11, с runway-гейтом под 12w до EOQ. Marketer — отдельный рычаг
размера чека, не capacity.

---

## Часть B — модель domainReputation

```
domainSalesReputation[domain]     += 5   // Lead → closed
domainDeliveryReputation[domain]  += 2   // Project → complete
domainReputation[domain] = sales + delivery
```

Soften (−20→−10pp, порог 25) и будущий UI смотрят **сумму**. Компоненты пишутся в
`week_snapshot` и в SessionResult (`maxDomainSales/Delivery`, `domainRepByQuarter`,
`weekCombinedDomainRepGte25`). Порог 25 и +5/+2 не менялись.

---

## Часть A / Трек 2 — Design: причинная связь не подтверждена

Вопрос: ускоренный close-счётчик (A27) ломает Design через soften × `forceAssignIdleThreshold`?

**Агент domain-состояние не видит.** `mismatchOnly` = нет idle Sales/Designer с тем же domain,
не close chance. `forceAssignIdleThreshold` у Design = **1w**; skip = **0** во всех трёх батчах
(A22 / A27 / A28). Решение force vs skip от счётчика не зависит.

Косвенный путь (больше успешных mismatch-close → больше backlog ≥4 → больше force-assign)
на данных **против** гипотезы: банкроты A28 **меньше** force-assign лидов в Q1 (4.5 vs 7.9) и
**медленнее** копят specialization.

Раздельный счётчик, Design n=24:

| Q1 max по домену | sales | delivery | combined |
|---|---|---|---|
| mean | 22.7 | 6.7 | 29.3 |
| Порог 25 (combined) | — | — | 16/24 сессий, медиана **неделя 11** |

Sales даёт ~77% Q1-суммы — close-триггер реально ускоряет метр. Но банкроты:

| | bankrupt (2) | alive (22) |
|---|---|---|
| Q1 combined | **22.5** | 29.9 |
| Q1 sales | **17.5** | 23.2 |
| Неделя ≥25 | **13** (оба) | медиана 11 |

Крах не «слишком быстро включился soften». У умерших порог позже и Q1-специализация ниже.

Где ломались:

| | A22 n=12 | A27 n=12 | **A28 n=24** |
|---|---|---|---|
| Bankrupt | **8.3% (1)** | 25% (3) | **8.3% (2)** |
| Квартал смерти | Q4 | Q3×1 + Q4×2 | **Q4×2** |
| Cum-positive | 1 (s08 +$896) | 0 | 0 (лучшее −$1755, s08) |
| Mean cum NP | −$6976 | −$8124 | −$8221 |

A27 25% и Q3-смерть s08 на n=12 — **шум**. n=24 возвращает bankrupt rate freeze и поздний Q4-паттерн
как у A22 s07. Изолированный PoC (+$896) в этом прогоне не повторился; P(0/24 | p=1/12) ≈ 12% —
совместимо со случайностью правого хвоста, не с новым источником краха.

Mean NP на ~$1.2k хуже freeze. Это не доказанный побочный эффект close-триггера: банкроты как
раз копят sales-репутацию медленнее. Менять N / порог / Design-рычаги **не будем**.

---

## Что дальше

1. Marketing: один рычаг — Dev hire под queued retainers (A11), не Marketer и не новый порог.
2. Design: не открывать калибровку из A27-регресса; n=24 снял bankrupt-панику.
3. Модель счётчика — в коде; +2 на complete по-прежнему черновик.
