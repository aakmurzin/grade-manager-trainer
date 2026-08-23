# Grade Business Trainer — Addendum 32

Marketing retainer check band. Hire-policy (A31) достигла потолка — S/R ratio ~5× при $600–1800
не решается наймом. Поднимаем чек по одной итерации.

Данные:

- iter1: `playtest-results/batch-addendum-32-iter1-marketing-classical.json`
- iter2: `playtest-results/batch-addendum-32-iter2-marketing-classical.json`

---

## Итерация 1: $2000–3000

| | A31 ($600–1800) | Iter 1 ($2000–3000) |
|---|---|---|
| Bankrupt | 12/12 | **12/12** |
| Mean cum NP | −$9,811 | **−$7,687** |
| Mean payout/session | $1,599 | **$3,064** |
| Sessions 2+ payouts | 4 | 3 |

Payout удвоился, NP сдвинулся на ~$2k — чек работает как рычаг. Но bankrupt по-прежнему 100%,
разрыв остаётся.

---

## Итерация 2: $3500–4500

| | Iter 1 ($2000–3000) | **Iter 2 ($3500–4500)** |
|---|---|---|
| Bankrupt | 12/12 | **11/12 (91.7%)** |
| Mean cum NP | −$7,687 | **−$6,293** |
| Survived 4Q | 0 | **1** (s04: cum −$1,456, Q2 **+$2,860**) |
| Lived ≥ 3Q | 0 | **3** (s03, s08, s09) |
| p90 NP | −$6,460 | **−$1,652** |

Первый выживший. s04 формирует тот же Q1− / Q2+ pattern, что proof-of-concept Design s08 из
`addendum-22`. s03 также показывает Q2 **breakeven** (+$55). Экономика начинает работать на
верхнем хвосте.

---

## Вывод

Check band $3500–4500 — ближе к пороговому значению, но ещё не достаточно для медианного
выживания. Следующий шаг: ещё одна итерация чека к верхней трети целевого расчёта из запроса
($4000–5500), **не** переключение на start-budget — чек как рычаг ещё не исчерпан (bankrupt
91.7%, 1 survivor, трендовое улучшение при каждом повышении).

---

## Текущее значение в коде

`balance.ts` / `marketing_agency.checkBand`: **[3500, 4500]**

---

## Что не трогали

- Start budget ($10k) — не касаться, пока check не исчерпан
- Hire-policy (A31 кап 4) — на месте, работает
- domainReputation-модель — не затрагивается
- Design baseline — не открывать
