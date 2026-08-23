# Grade Business Trainer — Addendum 01 (+ post-playtest patch)

Патч поверх HANDOFF + balance-spec. Исходный addendum A/B/C уже в коде; ниже — сверка и
дополнения после первой игровой сессии.

## Уже было в коде (не переписывать)

- **A** confidence: оси как `{ score, confidence, n }`, пороги n→confidence, gate архетипа ≥4
  medium/high, `client_retention` n/a без long_delivery/retainer, History Last vs Trend
- **B** Skip/mismatch UI, `lead_inspected|skipped`, `matched/forced`, `candidates_rerolled`
  (первые 2 бесплатны), `week_snapshot.anyMatchAvailable`
- **C** Lead Gen `base/(1+bonus)`, capacity 2 с Middle+, close fail = Variant A, Sales close = 2w,
  Recruiter не трогает спавн

## Добавлено / поправлено после живого теста

### Trainee lead intervals
- Manager/Director: high **1.8** / medium **2.5** / low **4**
- Trainee Design Agency: **2.6** (без Lead Gen иначе мгновенный перегруз)
- Product Studio Trainee: без изменений (4)

### Weighted domain spawn (§5)
`DOMAIN_SPAWN_WEIGHTS` в `balance.ts` — взвешенный выбор домена при спавне лида и при
генерации Sales-кандидатов (не равномерный `pick(domains)`).

### Prioritization / avoidable mismatch
- Штраф за простой только если ожидание пересекалось с неделями `anyMatchAvailable`
- `avoidable_mismatch_rate`: доля `forced` назначений, после которых матч освободился /
  появился hire в окне `AVOIDABLE_MISMATCH_WINDOW_WEEKS` (3) — влияет на Hiring + Delivery

### Hoarder archetype
`cashflow ≥ 80 AND capacity ≤ 40` → `hoarder`, проверяется **до** Cautious Builder.
UI-текст — loss-aversion формулировка из патча.

### PAEI (Adizes)
Выводится из 7 осей (+ E из доменов/экспансии). Мелким текстом под архетипом; Blake-Mouton /
Goleman в основной UI не выводятся.

### UX
Подсказка в Sales, когда очередь непуста и нет free Sales capacity.

### History meta
`activityIndex` + `paei` пишутся в `scores.__meta` (без миграции схемы), чтобы Trend не
подставлял hardcoded 0.5.

## Открыто (как в продуктовом патче)

- Веса IT Outsourcing / Marketing Agency — черновые
- Точный порог «разумного окна» для avoidable — калибровать
- Полный список 16 PAEI-комбинаций — не критичен для MVP
