# Grade Business Trainer — Addendum 33

Third iteration of the Marketing retainer check-band lever from `addendum-32`.
Only one parameter changed:

- `marketing_agency.checkBand`: `[3500, 4500]` -> `[4000, 5500]`

Batch:

- `playtest-results/batch-addendum-33-iter3-marketing-classical.json`

---

## Result

Compared with `addendum-32` iter2 baseline:

| | Iter2 ($3500-4500) | Iter3 ($4000-5500) |
|---|---:|---:|
| Bankrupt | 11/12 (91.7%) | **11/12 (91.7%)** |
| Profitable | 0/12 | **1/12 (8.3%)** |
| Mean cum NP | -$6,293 | **-$4,237** |
| p90 NP | -$1,652 | **-$614** |
| Best session | -$1,456 | **+$17,118** |

Session-level highlights:

- `s06` reached full 4Q completion and finished **+$17,118**
- `s10` showed a local turnaround in Q2 (`-$5,844`, `+$2,189`, `-$2,132`) but still died
- `s05` nearly hit quarterly breakeven in Q2 (`-$146`) before collapsing in Q3

---

## Interpretation

The check lever is **still producing directional improvement**, but the shape changed:

- Median-ish quality improved again (`mean NP`, `p90 NP`)
- Bankrupt rate **did not** improve beyond iter2
- The new success signal came as a **single large profitable outlier**, not as a broad increase
  in 3Q+/survivor count

So this does **not** read like the lever is exhausted yet, but it is the first sign that further
check increases may buy more upside in the top tail than reliability in the middle.

This is different from the clear monotonic mass-shift seen from iter1 -> iter2:

- iter1 -> iter2: first survivor, more long-lived sessions, bankrupt 100% -> 91.7%
- iter2 -> iter3: same bankrupt, better tail, first profit

---

## Stop / continue assessment

Against the criteria from the user request:

- `Bankrupt continues to fall` -> **No** (flat at 91.7%)
- `Share of survivors / cum-positive grows` -> **Yes, but narrowly** (0 -> 1 profitable run)
- `Too generous / trivial profit` -> **Not proven**, but `s06` is large enough to treat as a
  warning sign rather than proof of overcorrection

Practical reading: we are near the point where one more increase should be treated as a diagnostic
probe, not an automatic continuation of the same trend.

---

## Conclusion

`[4000, 5500]` improves the upper tail and produces the first **cum-positive** Marketing proof of
concept, but it does **not** reduce bankrupt rate below the `addendum-32` iter2 level.

This is the first plausible sign of a **partial plateau** for the pure check-band lever:

- enough to prove the economy can work
- not enough to make the mode broadly fair yet
- not clearly overgenerous either

If the next step is another check raise, it should be evaluated as a **final probe for this lever**.
If bankrupt remains flat again, the next rational branch is `start budget` as the second lever for
Q1 runway rather than continuing to raise check indefinitely.
