# Grade Business Trainer — Addendum 63

Trainee compliance = 0 — вариант (b). Документация прогрессии + закрытие Manager-дыры.

---

## Manager-дыра — подтверждена

| | Compliance | Accountant (`ROLE_UNLOCK`) |
|---|---|---|
| Trainee | off | — (роль не в пуле) |
| Manager (до A63) | **on** | **Director-only** ← дыра |
| Director | on | доступен |

IT Outsourcing (unlock Manager, профиль с compliance в `balance-spec.md §2`) имел тот же
паттерн, что Design Trainee до фикса: риск есть, защиты нет. A52 «Confirmed» этого не ловил —
не было целевой compliance-диагностики.

---

## Решение (не откат Trainee, не compliance=0 на Manager)

| Уровень | Compliance | Accountant |
|---|---|---|
| Trainee | **off** (исключение A37 — нет контрплея) | недоступен |
| Manager+ | **on** | **разблокирован с Manager** (`ROLE_UNLOCK.accountant = 'manager'`) |
| Director | on | доступен |

Принцип A37 сохраняется с Manager вверх: риск через найм. Trainee остаётся единственным
уровнем без compliance — явно в таблице §1.

Код: `src/game/catalog/balance.ts` — `accountant: 'manager'`.
Docs: `balance-spec.md §1` compliance progression table.
