# Grade Business Trainer — Addendum 12

Промежуточный разбор регрессии после `addendum-10` (Junior/Middle-only Trainee pool).
**Без нового фикса.** Addendum-11 (рациональный найм) сознательно не применяется, пока пул
не разобран.

Данные: `playtest-results/addendum-12-company-breakdown.json`  
Батчи: A06 baseline · A08 step1 · A09 · **A10** (`batch-addendum-10-trainee-tiers.json`)

---

## Full company breakdown (формат addendum-07 §5)

### A10 — все 4 типа (N=6 каждый)

| Company | no-uptick | weeks→$ median (earners) | censor13 median | S/R median cash-in | S/R pooled |
|---|---|---|---|---|---|
| **Design Agency** (trainee) | **4/6** | 8 (n=2) | **13** | 2.22× | 4.16× |
| Product Studio (trainee) | 3/6 | 8 (n=3) | 11.5 | 0.91× | 1.79× |
| IT Outsourcing (manager) | 2/6 | 7 (n=4) | 9 | 1.84× | 2.6× |
| Marketing Agency (director) | 6/6 | — | 13 | — | — (bug) |

Trainee-only (Design+Product): no-uptick **7/12**, S/R median cash-in **0.97×**, pooled **2.6×**.

### Сравнение no-uptick по итерациям

| Company | A06 | A08 step1 | A09 | **A10** | Δ A08→A10 |
|---|---|---|---|---|---|
| Design Agency | 3/6 | **1/6** | **0/6** | **4/6** | **+3** |
| Product Studio | 3/6 | 2/6 | 4/6 | 3/6 | +1 |
| IT Outsourcing | 1/6 | 2/6 | 0/6 | 2/6 | 0 |
| Marketing | 6/6 | 6/6 | 6/6 | 6/6 | 0 |

### Weeks→$ median (earners) · A08 → A10

| Company | A08 | A09 | A10 |
|---|---|---|---|
| Design | 9 | **6** | 8 (только 2 earner’а) |
| Product | 7 | 10.5 | 8 |
| IT | 6.5 | 8.5 | 7 |

### S/R median cash-in · A08 → A10

| Company | A08 | A09 | A10 |
|---|---|---|---|
| Design | 3.28× | 5.77× | **2.22×** (n=2) |
| Product | 1.53× | 2.6× | **0.91×** |
| IT | 2.86× | 1.89× | 1.84× |

---

## Вердикт по развилке

**Регрессия completion (no-uptick) локальна для Design Agency** и привязана к шагу A10
(Junior/Middle-only), не к A08/A09 воронке:

- Design: лучший результат был **0/6** no-uptick в A09 → обвал до **4/6** в A10.
- Product: A10 (3/6) не хуже A08 (2/6) по смыслу шума; худшая точка была **A09 (4/6)** — до
  tier-gate. Нет чистого «A10 убил Product».
- IT: Manager-уровень, Senior в пуле сохранён; A08→A10 **0**. Не задет Trainee tier-gate.
- Marketing: по-прежнему 6/6 — баг retainer (`docs/bugs/marketing-retainer-payout.md`), не A10.

Гипотеза «high-frequency Design + Junior 35% rework» **согласуется с данными**: единственный
Trainee high-freq тип системно потерял completion после убирания Senior с рынка; low-freq
Product по no-uptick не показывает такого же A10-специфичного обвала.

### Следствие для median S/R (предупреждение addendum-12)

На Trainee median S/R **0.97×** выглядит «лучше цели 1.5×», но Design earner’ов осталось **2/6**:
часть сессий ушла из «дорого, но $» в «дёшево, no $». Pooled Design 4.16× и censor13 median **13**
это подтверждают. **Не читать A10 median S/R как победу без no-uptick.**

---

## Развилка (решение по фиксу — ещё не применять)

| Если только Design (✓ подтверждено) | Если шире Product/IT (✗ не подтверждено) |
|---|---|
| Точечно: high-freq + Junior rework — кандидат на частичный откат (напр. guaranteed Middle в Sales/Dev slot, остальные Junior/Middle mix) | Общий Junior-only слишком дорог → другой пересмотр пула |

**Рекомендация направления (не патч):** развилка «только Design» — открыта; конкретный фикс
пула — отдельным шагом после выбора варианта, **до** addendum-11.

---

## Статус addendum-11

Не отдавать, пока не закрыт выбор по Design tier/rework. Иначе тайминг-эвристика наложится на
непроверенный побочный эффект пула.
