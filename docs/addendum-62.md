# Grade Business Trainer — Addendum 62

EN/UA archetype blurbs (полная матрица 8×3 с RU) + уточнение Trainee compliance.

---

## Trainee compliance — какой путь

Подтверждено в коде / `addendum-63`: вариант **(b)** — compliance для Trainee **выключен
полностью**, не точечный regulated-domain фикс (a).

Это исключение из принципа A37 («фикс через найм, не через снижение риска»), оправданное тем,
что Accountant на Trainee физически недоступен — риск без контрплея. Зафиксировано в
`balance-spec.md §1` как дизайн прогрессии, не побочный эффект.

---

## Архетип-тексты

Файлы:

- `messages/en.json` — EN (addendum-62)
- `messages/ru.json` — RU (addendum-60 + updated `insufficient_data` + `inactive`)
- `messages/ua.json` — UA (addendum-62)

Runtime: `src/i18n/archetypes.ts` → `archetypeBlurb()` default locale **`en`** (A61).
Полный `next-intl` switcher — следующий шаг; словари уже на месте.
