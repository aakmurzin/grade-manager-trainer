# Grade Business Trainer — Addendum 05

Два независимых фикса после тестовой итерации.

## A. Пул кандидатов

- Размер доски: **5**
- Гарантирован **1 Sales** (если роль доступна и не на hire-cooldown)
- Остальные 4 — weighted по unlock уровня менеджера
- `FREE_REROLLS_PER_SESSION = 3` (было 2; пересчёт под меньшее число вынужденных reroll)

## B. Domain ⊥ Stack на Project

### Диагноз (до фикса)
- `Lead` нёс только `domain` (Sales-матч) — ок
- `Project` нёс только `stack` (Dev-матч) — **domain с лида терялся при close**
- Матчинг по ролям уже был разделён; проблема была в потере domain на проекте,
  не в «одном слитом теге»

### Фикс
```
Project { domain, stack }  // оба независимы
closeLead → domain = lead.domain, stack = pick(STACKS)  // равномерно пока
```
- Sales штрафуется только по domain (на лиде)
- Dev — только по stack (на проекте); domain не влияет на Dev
- UI Tasks: `domain · stack`

### Открыто
- Веса `stack` по Company Type — временно uniform 25%
