# Grade Business Trainer — Addendum 36

This step combined two tasks:

1. quantify the scale of the `s03` compliance-driven bankrupt pattern from `addendum-35`
2. run the next check-band fine-tuning iteration at `[5000, 7000]`

Files:

- compliance diagnosis source: `playtest-results/batch-addendum-35-iter4-marketing-classical.json`
- iter5 batch: `playtest-results/batch-addendum-36-iter5-marketing-classical.json`

---

## Part A — How common is the `s03` pattern?

Among the 8 bankrupt sessions in `addendum-35` iter4:

- **6/8** had a compliance-hit in `endHints`
- **5/8** would have had **positive finalBudget** without that compliance penalty
  - `s01`, `s03`, `s07`, `s10`, `s11`
- **2/8** would have been outright **profitable** without the compliance penalty
  - `s01`, `s03`

This is much larger than a one-off edge case.

Important nuance:

- only `s03` is the cleanest "economically positive, formally dead because of compliance" example
- but the broader set shows that compliance is now a **material secondary death factor**
  once the core check economy becomes partly viable

So the hypothesis "Accountant / compliance protection may become the next lever" is now supported
well enough to keep as the next branch after check calibration.

---

## Part B — Iter5 check: `[5000, 7000]`

Only balance change:

- `marketing_agency.checkBand`: `[4500, 6500]` -> `[5000, 7000]`

Comparison against `addendum-35` iter4 baseline:

| | Iter4 ($4500-6500) | Iter5 ($5000-7000) |
|---|---:|---:|
| Bankrupt | 8/12 (66.7%) | **10/12 (83.3%)** |
| Profitable | 4/12 (33.3%) | **2/12 (16.7%)** |
| Mean cum NP | -$1,523 | **-$3,705** |
| p50 NP | -$2,388 | **-$6,794** |
| p90 NP | +$5,299 | **+$12,664** |

Profitable runs in iter5:

- `s10`: **+$14,538** (`[+33, -1773, +10842, +5436]`)
- `s12`: **+$18,830** (`[+467, +556, +11013, +6794]`)

Interpretation:

- upside increased for the very best runs
- but the distribution as a whole got **worse**
- this is the opposite of the healthy mass-shift seen in `addendum-35`

So `[5000, 7000]` looks worse not because it is "too easy", but because it becomes **more
volatile / polarized**: a couple of huge winners, too many structural losers.

---

## Combined reading

`addendum-36` answers both open questions:

### 1. Is compliance now a real second factor?

**Yes.**

At `iter4` viability, compliance stopped being background noise and became large enough to flip
multiple session outcomes.

### 2. Should the check keep moving upward immediately?

**Not past `[4500, 6500]` on current evidence.**

`[5000, 7000]` regressed on the primary success metrics:

- higher bankrupt rate
- fewer profitable runs
- worse mean and median

This makes `[4500, 6500]` the best-performing checked point in the explored range so far.

---

## Practical conclusion

Current best reading:

- keep `check` as the main validated lever conceptually
- but treat `[4500, 6500]` as the current **best-known local optimum**
- do **not** assume that further raising the check continues to help

The next promising branch is no longer "just more check". It is:

- either confirm `[4500, 6500]` with a larger batch,
- or open the newly justified secondary branch: Accountant / compliance protection

Given `addendum-35` and `addendum-36` together, the strongest new statement is:

> the economy is now good enough that compliance randomness can decide marginal runs,
> but pushing the check above `[4500, 6500]` degrades the central distribution.
