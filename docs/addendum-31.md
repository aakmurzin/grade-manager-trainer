# Grade Business Trainer — Addendum 31

Закрытие обоих треков `addendum-28`. Design regression закрыт (шум, n=24 вернул baseline).
Marketing — A11-найм Dev под retainer-портфель; фикс необходимый, но недостаточный.

Данные: `playtest-results/batch-addendum-31-marketing-classical.json`

---

## Трек 2 — закрыт

A27 25% bankrupt Design на n=12 был шумом. n=24 (`addendum-28`) вернул bankrupt = 8.3%,
паттерн Q4 — идентично A23 freeze. domainReputation-модель (раздельный трекинг + combined
score, порог 25, +5/+2) подтверждена безопасной. Ничего не откатывали.

Методологическая заметка: не принимать сквозных решений по n=12, если n=24 доступен.

---

## Трек 1 — A31 Dev hire для retainer-портфеля

### Фикс

Расширена `evaluateDeliveryHire`-логика reasonable-агента:

```
if (queued retainers >= 1 && deliveryCount < MAX_DELIVERY_STAFF_RETAINER(4) && budget ok)
  → hire Dev
```

Триггер: "queued retainer-проектов >= 1", `budget >= salary×2`, `startBudget × 0.10` runway.
Капа для Marketing — 4 Dev (vs 3 Design), cooldown общий (GROWTH_COOLDOWN_WEEKS=8 не
затрагивается, т.к. это не headcount review, а отдельный ранний path).

### Результат: n=12 Classical

| | A27 (baseline) | **A31** |
|---|---|---|
| Bankrupt | 12/12 | **12/12** |
| Mean cum NP | −$9 702 | **−$9 811** |
| Mean payout/session | ~$1 200 | **$1 599** |
| Sessions with 2+ payouts | 1–2 (est) | **4/12** |
| Mean Dev hired | 0.8 | **1.3** |
| Q1 assign_project (median) | 1 | **1** (s01/s05/s11/s12: 2) |
| Queued retainers at end | 0–4 | 0–**10** |

### Диагностика

Найм работает: retainer-path срабатывает в 4/12 сессий, рано (w4–w10), ставит второго Dev.
Те сессии получают 2 ретейнер-выплаты на EOQ ($2 500–2 900) вместо одной.

**Но $2 800 от 2 retainer — это 5× меньше payroll за 12 недель.** Структурная арифметика:

- Типичный payroll к EOQ: ~$4 500–6 000 (2 Sales + 1–2 Dev + overhead ~15%)
- Retainer payout: **$600–1 800** × живых на EOQ (1–2)
- S/R ratio: **~4–5×** (тот же, что A25 диагностировал)

Даже при идеальном assigning (все retainer сразу на Dev) и 0 churn, 2 retainer × $1 200 avg =
$2 400 на EOQ; payroll за 12 недель двух хайров + два Sales ≈ $11 000+. Более ранний hire
увеличивает NP gap (больше зарплат без существенного дополнительного revenue), не закрывает его.

### Вывод

Retainer-hire — **необходимый, не достаточный** рычаг. Без него 1 Dev блокирует портфель
навсегда; с ним 2 Dev позволяют 2 retainer на EOQ, что математически лучше, но S/R ratio по-
прежнему ~5× и банкротство неизбежно при текущем чеке.

Фикс агента **оставляем** (правильная эвристика; Design не сломана — порог проверен).
Следующий рычаг — **check band** или **start budget** Marketing Director, не найм.

---

## Что не трогали

- domainReputation-модель — подтверждена A28 Трек 2
- Design Trainee Classical baseline — подтверждён на n=24
- Marketer role — не delivery, не assign_project
- Headcount-review (Q3+) — retainer-path отдельная ранняя эвристика, не переоткрытие A21

---

## Следующий рычаг (не в этом addendum)

Marketing Director: S/R ~5× при 1–2 retainer. Два кандидата:

1. **Check band** $600–1800 → выше (сейчас retainer ~ one-off check; несколько retainer ×
   бОльший чек быстрее покрывают payroll)
2. **Start budget** $10k → выше (купить время до первого EOQ; те же сессии, что получают 2
   payouts, могли бы дожить до Q2 и получить второй EOQ-цикл)

Не оба сразу — один за шаг. Вероятно check band (ближе к причине, чем костыль бюджета).
