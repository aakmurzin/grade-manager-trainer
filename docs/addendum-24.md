# Grade Business Trainer — Addendum 24

Marketing retainer payout. Design Trainee Classical baseline (`addendum-23`) не трогали.

Баг: `docs/bugs/marketing-retainer-payout.md` (открыт с addendum-09).  
Батчи: `batch-addendum-24-marketing-rapid.json`, `batch-addendum-24-marketing-classical.json`  
Сводка: `playtest-results/addendum-24-marketing-summary.json`

---

## 1. Фикс механики (причина 2)

Retainer больше не бесплатный 12-недельный one-off.

| Было | Стало |
|---|---|
| Checkpoint только у `long_delivery` | Retainer платит на **границе квартала**, пока `inprogress` |
| `complete` → только +2 Reputation | `complete` доплачивает оставшийся чекпоинт, без двойной выплаты |
| 12 мелких чекпоинтов (`value/12`) | 1 квартальный платёж = чек лида (`ceil(12w / 12)`) |
| Churn −8 как LD | Retainer churn **−10** (`REPUTATION_DELTAS.retainerChurn`); недельный шанс как был |
| Survive quarter не платил | +2 Reputation на каждый состоявшийся платёж |

Marketer +% уже в `lead.value` — каждый платёж несёт бонус накопительно, без второго умножения.

---

## 2. Rapid — причина 1 больше не блокер

Director, n=6, Rapid Q1 (12 недель). **6/6 сессий получили payout**, все на **w12 (EOQ)** — не нужно дожидаться конца 12w бара.

| | Rapid n=6 |
|---|---|
| Сессий с `assign_project` | 6/6 |
| Сессий с retainer payout | **6/6** (было 0/6 до фикса) |
| Median first payout week | 12 |
| Mean payout / сессию | ~$1.6k (1–2 платежа) |
| Bankrupt | 3/6 |
| Cum-positive | 0/6 |

Duration 12w **не сокращаем**. Rapid Director по-прежнему жёсткий (старт $10k, один квартал) — это экономика уровня, не баг выплаты. Retainer на Rapid доступен: хотя бы один платёж проходит.

---

## 3. Classical Marketing — первый содержательный батч

Director, n=12, 4Q. Payout работает: **12/12** сессий с выплатой (first week 12).

| | Classical n=12 |
|---|---|
| Retainer payout | **12/12** |
| Mean payouts / сессию | 1.3 |
| Mean $ payout | ~$1.8k |
| Bankrupt | **12/12 (100%)** |
| Cum-positive | 0 |
| Доживают до Q2 | 3/12 (s02, s11, s12) |

Типичный Q1: 1 assign, 1 платёж ~$0.8–1.8k на EOQ, payroll+overhead съедают Director-старт $10k. Это **не регресс фикса** — раньше revenue был ноль; теперь капает, но чек/старт/воронка никогда не калибровались (весь цикл A08–A23 был Design).

Ожидаемый следующий цикл — отдельный, как Design: не чинить Marketing одним параметром в этом addendum.

---

## 4. Что заморожено / очередь

- Design Trainee Classical — без изменений
- Rapid fair/winnable критерий — после Marketing-экономики, не раньше
- Manager/Director-механики (conflict / promotion-каскад) — бэклог
