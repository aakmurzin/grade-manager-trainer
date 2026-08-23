# Grade Business Trainer — Addendum 26

Cold-start `domainReputation`. Design / A24 payout не трогали, кроме одной константы порога.

Батч: `playtest-results/batch-addendum-26-marketing-classical.json`

---

## 1. Диагностика A24 (без нового батча) — гипотеза **подтверждена**

`domainReputation` растёт **+2 только в `completeProject`**, не на close. Порог смягчения был **50** → нужно **25 сдач в одном домене**.

Retainer duration **12w**: complete не раньше assign+12. 9/12 сессий A24 умирают на w12 — complete не происходит, счётчик так и **0**.

Реконструкция A24 (assign week + 12w vs `weeksPlayed`):

| | max domainReputation (оценка) |
|---|---|
| 9 сессий, смерть ≤ w12 | **0** |
| s02, s11, s12 (дожили до ~w20–24) | **+2** (один complete) |
| ≥50 хотя бы в одном домене | **0 / 12** |

Не совпадение: порог структурно недостижим на Marketing Q1. Цикл

`низкий close → нет complete → domainRep=0 → штраф −20pp → низкий close`

держится. Вариант B (50→25) сам по себе **тоже** требует 13 complete — в Q1 не сработает. Применили как согласованный один рычаг, чтобы это измерить, а не гадать.

---

## 2. Фикс — Вариант B

`DOMAIN_REPUTATION_MISMATCH_SOFTEN`: **50 → 25**. Начисление +2 на complete без изменений (общая механика для всех типов).

---

## 3. Classical Marketing n=12 vs A25

Новый батч пишет `maxDomainReputation` с движка.

| | A25 (порог 50) | A26 (порог 25) |
|---|---|---|
| Bankrupt | 12/12 | **12/12** |
| Pooled assign_lead → project Q1 | 16/80 (**20%**) | 15/84 (**18%**) |
| Median projects Q1 | 1 | 1 |
| max domainRep ≥ 25 | — | **0 / 12** |
| max domainRep (факт) | — | 0 (Q1-смерти) или **2** (4 сессии до w24) |
| Marketer hires | 0 | **0** |

Порог 25 **ни разу не включился**. Конверсия и банкротство в шуме. Marketer по-прежнему не нанимается.

---

## 4. Вывод

Гипотеза ловушки **верна**. Вариант B **недостаточен**: смягчение смотрит на счётчик, который на retainer не двигается до complete через 12 недель — к тому моменту Q1 уже сожжён.

Следующий рычаг сделан в **addendum-27**: начисление на успешный close (+5), +2 на complete оставлен, порог 25 не трогали.

Design Trainee baseline / retainer payout / Rapid EOQ — без изменений (порог 25 глобальный, на Design с коротким циклом complete чаще, 13 сдач vs 25 — мягче, не ломает A23).
