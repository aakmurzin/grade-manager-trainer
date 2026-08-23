# Asset prompts — Trainer delta

Промпты для персонажей/пропов, которых нет в базовом arcade-наборе. Стиль тот же, что у
уже сгенерированных ролей: 16-bit chibi, isometric-adjacent sprite sheet, transparent
checker background.

---

## Designer (Design Agency delivery role)

**Role:** Designer — volume design shop (landings, banners, branding packs). Not an engineer.

**Why a new sheet:** Dev carries a laptop and participates in stack matching. Designer must
read as a different job: tablet + stylus, no laptop. Used only in Design Agency.

**Prompt:**

```
16-bit pixel art character sprite sheet, isometric 2:1 game asset, chibi proportions,
transparent checkerboard background. 4x4 grid of equal cells.

THE DESIGNER: short dark hair, light skin, cream/off-white turtleneck sweater, dark grey
trousers, dark shoes. Signature props: a handheld drawing tablet (screen shows a tiny
color-palette / design UI) and a stylus. Glasses — on the forehead in front-facing work
poses, over the eyes in walking poses.

Row 1 (front, working): four frames facing the viewer, tablet held up so the screen is
visible, stylus in the other hand.
Row 2 (front walk): four-frame walk cycle toward the viewer, arms at sides.
Row 3 (profile walk): four-frame walk cycle to the right, tablet tucked under the arm,
stylus in the free hand. This row is the in-game idle/walk source (matches other roles'
side view).
Row 4 (back walk): four frames walking away, back of the sweater and hair.

No laptop. No code-editor UI. Keep palette consistent across all 16 frames.
```

**In-game mapping (extract script `MAPPING_DESIGNER`):**

| Frame | Sheet cell |
|---|---|
| idle, walk0 | row 3 col 1 (profile + tablet) |
| walk1–3 | row 3 remaining |
| work0, work1 | row 1 cols 1–2 (front presenting tablet) |
