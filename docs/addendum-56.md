# Grade Business Trainer — Addendum 56

Реакция на `addendum-55` аудит Manager Report.

---

## Приоритет 1 — avoidable mismatch 57/57 (закрыт)

**Диагностика** (`playtest-results/addendum-56-avoidable-mismatch-diagnosis.json`, seed
`10005`):

| Реализация | forced | avoidable | rate |
|---|---:|---:|---:|
| До (A55) — global `anyMatchAvailable` + idle | 57 | **57** | **100%** |
| Только domain hire в окне | 57 | 2 | 3.5% |
| **После (A56) — domain hire OR later matched assign** | 57 | **4** | **7%** |

**Root cause:** `matchFreed` смотрел на **глобальный** `week_snapshot.anyMatchAvailable &&
idleSales > 0`. На busy Design-сессии почти каждую неделю есть *какой-то* match в офисе →
55/57 ложных avoidable. Только 2/57 — реальный domain hire.

**Fix** (`computeManagerReport.ts`): avoidable = в окне 3w **после** forced assign:
1. matching hire (sales/designer/dev по domain/stack), **или**
2. matched `assign_lead` / `assign_project` на **тот же domain** (показывает, что match
   скоро стал доступен).

Flagged moment на seed 10005: **исчез** (rate 7% &lt; порога 40%) — не шум.

Окно **3 недели** оставлено; проблема была в предикате, не в ширине окна.

---

## Приоритет 2 — doc-sync Hiring Discipline

`balance-spec.md §3.1` обновлён под фактическую формулу в `computeManagerReport.ts` (не legacy
`match_rate` черновик). Код не менялся ради устаревшей спеки.

---

## Известное ограничение — архетип-однообразие (без действия)

Reasonable-агент → узкий spread архетипов (Design `generalist`, Marketing/IT
`firefighter`/`insufficient_data`). Ожидаемо для одного детерминированного play-стиля.
`hoarder`/`inactive` редки — агент не имитирует накопление/бездействие. Зафиксировано в
`balance-spec.md §16`.

---

## Conclusion

A55 docs + A56 fix. Коммит: docs, diagnosis artifacts, точечная правка avoidable predicate.
