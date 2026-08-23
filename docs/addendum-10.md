# Grade Business Trainer — Addendum 10

Реакция на `addendum-09`. Один новый фикс + методологические выводы; Marketing уведён в баг-трекер.

Пост-фикс батч: `playtest-results/batch-addendum-10-trainee-tiers.json`  
Анализ: `playtest-results/addendum-10-summary.json`  
Сравнение с: `batch-addendum-09-devweight.json`

---

## Методология (из A09) — зафиксировать

1. **Вес пула Dev — тупиковая ветка.** 24/24 Dev@w1 и с guarantee, и с weight 8. Не крутить вес 4–5 дальше: агент нечувствителен. Батчи с этим `reasonable`-агентом не отвечают на «когда выгодно нанимать X», если эвристика «если можно — сразу».
2. **Marketing retainer** — дефект реализации §6, не баланс → `docs/bugs/marketing-retainer-payout.md`. Не блокирует п. ниже.

---

## Фикс — Trainee pool: Junior/Middle only

В `newCandidate`: при `managerLevel === 'trainee'` тир только `junior | middle`.  
Manager/Director — по-прежнему `junior | middle | senior`.  
Senior на Trainee только через promotion (§5).

Не трогали: Sales-гарантию, Dev weight (без hard-guarantee), `STACK_SPAWN_WEIGHTS`, зарплатные вилки.

Baseline A09: ~**25%** наймов были Senior (11/44 в rationale-логах) — рычаг реально задевал стоимость week-1 штата.

---

## Батч после фикса (N=24)

| Метрика | A09 | A10 | Цель ≤1.5× |
|---|---|---|---|
| Median S/R (cash-in, весь батч) | 3.83× | **1.53×** | ≈ достигнута |
| Pooled ΣS/ΣR (весь батч) | 4.15× | **3.37×** | ещё высоко (нули + Marketing) |
| Median S/R **Trainee-only** (Design+Product) | 3.89× | **0.97×** | да |
| Pooled S/R Trainee-only | 5.7× | **2.6×** | лучше, ещё >1.5 |
| Dev hire week 1 | 24/24 | **24/24** | ожидаемо без изменений |
| Trainee Senior hires | были | **0** | ок |

По Company (фрагмент):

| | Design A09→A10 | Product A09→A10 |
|---|---|---|
| No uptick | 0→**4**/6 | 4→3/6 |
| Weeks→$ med | 6→8 | 10.5→8 |
| S/R median cash-in | 5.77→**2.22** | 2.6→**0.91** |
| S/R pooled | 4.81→4.16 | 6.74→**1.79** |

---

## Вердикт по шагу «резать зарплаты Dev»

- **Median S/R по батчу ≈ 1.53×** — у порога цели addendum-08; на Trainee-подвыборке median **ниже** 1.5×.
- Прямое снижение вилки Junior/Middle Dev **сейчас не требуется** по критерию «только если median всё ещё существенно выше 1.5×».
- Pooled всё ещё 2.6–3.4× из‑за сессий без revenue (и мёртвого Marketing) — это не тот же сигнал, что median среди earners.
- **Регрессия Design no-uptick (0→4)** — вероятный побочный эффект более слабого Junior-тир close/delivery; не смешивать с salary cut. Отдельный разбор при следующем прогоне (не откатывать tier-gate без цифр).

---

## Код

```ts
// newCandidate — Addendum 10
const tier =
  state.managerLevel === 'trainee'
    ? pick(['junior', 'middle'] as const)
    : pick(['junior', 'middle', 'senior'] as const);
```

---

## Открыто

- Design funnel regress после убирания Senior с рынка — мониторить
- Marketing — `docs/bugs/marketing-retainer-payout.md`
- Salary-band cut Dev — отложен, пока median S/R не уйдёт снова выше ~1.5× при стабильной воронке
