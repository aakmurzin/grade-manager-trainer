# Grade Business Trainer — Addendum 35

Fourth iteration of the Marketing retainer check lever.

Only change:

- `marketing_agency.checkBand`: `[4000, 5500]` -> `[4500, 6500]`

Batch:

- `playtest-results/batch-addendum-35-iter4-marketing-classical.json`

Baseline for comparison:

- `addendum-33` iter3 (`[4000, 5500]`): bankrupt **91.7%**, mean NP **-$4,237**, p90 **-$614**

---

## Result

| | Iter3 ($4000-5500) | Iter4 ($4500-6500) |
|---|---:|---:|
| Bankrupt | 11/12 (91.7%) | **8/12 (66.7%)** |
| Profitable | 1/12 (8.3%) | **4/12 (33.3%)** |
| Mean cum NP | -$4,237 | **-$1,523** |
| p50 NP | -$6,059 | **-$2,388** |
| p90 NP | -$614 | **+$5,299** |
| Best session | +$17,118 | **+$16,941** |

This is not a flat repeat of iter2/iter3. The bankrupt plateau **broke**.

---

## Session shape

Profitable full-4Q runs:

- `s04`: **+$5,549** (`[-5570, +7238, -1283, +5164]`)
- `s05`: **+$3,045** (`[-2072, +3541, +63, +1513]`)
- `s06`: **+$16,941** (`[-4004, +4179, +12032, +4734]`)
- `s08`: **+$2,930** (`[-1061, +1300, +2308, +383]`)

Notable borderline case:

- `s03`: bankrupt, but **cum NP +$716** with `finalBudget = -$584`
  - quarter path: `[-437, +3897, -2744]`
  - end hint includes `Compliance check failed (−$1600)`

Interpretation: this is not merely one lucky outlier in the top tail. There is now a visible cluster
of runs that survive Q1, flip in Q2, and remain viable through 4Q.

---

## Reading against the Addendum 35 criteria

### 1. Did bankrupt fall below 91.7%?

**Yes.** It dropped to **66.7%**.

That alone invalidates the feared "third flat plateau in a row" scenario.

### 2. Did mean / p90 continue to improve?

**Yes.**

- mean NP improved by another **$2.7k**
- p90 crossed from negative to clearly positive
- p50 also moved materially upward

This is a broad shift, not just a single extreme winner.

### 3. Did it become "too generous"?

**Not clearly.**

Reasons:

- 8/12 sessions still go bankrupt
- median NP is still negative
- Q1 remains meaningfully negative in the successful runs

So the mode still carries risk and requires a turnaround; it is not trivialized.

---

## Conclusion

`[4500, 6500]` is the first Marketing band that moves the mode out of the previous bankrupt plateau
and produces multiple profitable 4Q proofs of concept at once.

This means:

- the check lever is **not exhausted**
- switching to `start budget` now would be premature
- the current direction is still economically productive

The mode is still not fully "fair" by aggregate standards (`bankrupt 66.7%`, median NP negative),
but it is much closer to the target shape:

- realistic Q1 loss,
- real possibility of Q2 turn,
- nontrivial but repeatable survival path,
- not guaranteed success.

---

## Recommended next interpretation

The next step, if continuing the same lever, should be treated as **fine-tuning**, not rescue:

- we are no longer trying to prove the economy can work
- we are now tuning how often the turnaround path appears

In other words, `addendum-35` keeps the project on the **check-first** branch.
