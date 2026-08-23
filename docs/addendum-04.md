# Grade Business Trainer — Addendum 04

Проактивное увольнение сотрудника как явное действие игрока.

## Экономика
- `prorated_pay = (salary / 12) × weeks_worked_this_quarter` — обязательно
- `severance = salary × 0.5` — поверх pro-rata
- Cooldown найма той же роли: **2 недели** (`ROLE_HIRE_COOLDOWN_WEEKS`)

## decision_log
`employee_terminated` с `reason: "voluntary"`, `recentUtilization`, `jobsCompleted`,
`proratedPay`, `severanceCost`, `brokeLongDelivery`.

## Long-delivery
Увольнение исполнителя активного LD → тот же эффект, что churn (−8 rep, остаток чеков
теряется).

## Hiring Discipline
Ранние увольнения (0 jobs) при **высокой** utilization → штраф.
При **низкой** utilization → без штрафа Hiring; лёгкий плюс Capacity Planning.
