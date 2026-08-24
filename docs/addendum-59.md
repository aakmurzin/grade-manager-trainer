# Grade Business Trainer — Addendum 59

Продолжение живого playtest (`addendum-58`).

---

## Баг 3 — архетип без текста-интерпретации

**Аудит кода:** UI проводка **есть** — `ManagerReportView` вызывает `archetypeBlurb(report.archetype)`.
Проблема — **content gap**, не баг логики.

`archetypeBlurb()` в `computeManagerReport.ts` возвращает текст только для:

| Archetype | Blurb |
|---|---|
| `hoarder` | ✓ (addendum-02 §F) |
| `insufficient_data` | ✓ «Пока рано…» |
| firefighter, cautious_builder, gambler, people_first, specialist, generalist, inactive | **нет текста** |

`Generalist` — самый частый на reasonable-агенте (`addendum-55/56`) → игрок видит только label.

**Действие:** ждём копирайт от автора (1–2 предложения на архетип, тон как у Hoarder). После
текстов — дописать в `archetypeBlurb()`, отдельного UI-фикса не нужно.

---

## Уже исправлено на лету — Compliance fine в P&L

Штраф $1000 не попадал в P&L → добавлена строка **Fines & penalties** (`quarterPenalties` /
`QuarterPL.penalties`). Зафиксировано для истории; отдельного фикса не требует.
