# Grade Business Trainer — Addendum 37

This step did four things:

1. reverted Marketing retainer `checkBand` to `[4500, 6500]`
2. confirmed that the strong `addendum-35` n=12 result does **not** fully hold at n=24
3. added an Accountant hire heuristic to the reasonable agent
4. re-ran Marketing n=24 on the final configuration

Files:

- check-only confirmation: `playtest-results/batch-addendum-37-check-only-marketing-n24.json`
- final config: `playtest-results/batch-addendum-37-final-marketing-n24.json`

---

## Code changes

### 1. Check rollback

`src/game/catalog/balance.ts`

- `marketing_agency.checkBand`: `[5000, 7000]` -> `[4500, 6500]`

### 2. Accountant hire heuristic

`scripts/playtest/agents/reasonable.ts`

Added a new Director / Marketing-specific trigger:

- count active compliance-load projects as
  - `inprogress long_delivery`
  - `inprogress recurring_retainer`
- if load `>= 2` for `>= 2` consecutive weeks
- no Accountant yet
- enough budget / runway

then hire the cheapest available Accountant.

The reroll logic was also extended so Accountant is considered a missing critical role when this
trigger is active.

This keeps compliance risk intact in the engine; the fix is via agent behavior, not lower event
rates.

---

## Part A — `[4500, 6500]` check-only confirmation at n=24

Result:

- bankrupt: **87.5%**
- profitable: **12.5%**
- mean NP: **-$3,888**
- p50 NP: **-$5,020**
- p90 NP: **+$3,415**

This is materially weaker than the earlier n=12 signal from `addendum-35`.

Conclusion:

- `addendum-35` was directionally useful, but too optimistic at n=12
- `[4500, 6500]` is still better than `[5000, 7000]`, but not yet a robust standalone fix

---

## Part B — Final config at n=24 (`[4500, 6500]` + Accountant heuristic)

Result:

- bankrupt: **70.8%**
- profitable: **29.2%**
- mean NP: **-$978**
- p50 NP: **-$4,740**
- p90 NP: **+$12,632**

Compared with check-only n=24:

| | Check only n=24 | Final config n=24 |
|---|---:|---:|
| Bankrupt | 87.5% | **70.8%** |
| Profitable | 12.5% | **29.2%** |
| Mean NP | -$3,888 | **-$978** |
| p50 NP | -$5,020 | **-$4,740** |
| p90 NP | +$3,415 | **+$12,632** |

This is a large improvement.

---

## Did the Accountant heuristic actually fire?

Yes.

In the final n=24 batch, the agent hired an Accountant in **9 sessions**.

Examples from decision rationales:

- `s06`: `Hire Accountant Jakub (junior) — compliance load 2 held for 2w.`
- `s11`: `Hire Accountant Kate (junior) — compliance load 4 held for 12w.`
- `s12`: `Hire Accountant Maria (senior) — compliance load 2 held for 2w.`

There were also explicit mitigated compliance events in at least:

- `s05` (profitable)
- `s12` (profitable)

So the heuristic is not only present in code; it visibly changes actual run behavior.

---

## Reading the result

### 1. Was `[4500, 6500]` a stable local optimum by itself?

Not really.

At n=24, pure check-only performance is much worse than the earlier n=12 result suggested.

### 2. Is the new Accountant branch justified?

Yes, strongly.

The final config materially outperforms check-only n=24, and the agent demonstrably uses the new
role in exactly the kind of long-cycle portfolio state that addendum-36 identified as risky.

### 3. Is the check lever still the main story?

Yes, but now as part of a **two-factor** model:

- check calibrates whether the underlying retainer economy can ever work
- Accountant behavior reduces a second-order cause of failure once the economy is close enough

This matches the observed transition in the data from structural losses to event-sensitive marginal
runs.

---

## Conclusion

The cleanest current working configuration is:

- `marketing_agency.checkBand = [4500, 6500]`
- reasonable agent with the new Accountant hire trigger

This does **not** fully solve Marketing yet (`bankrupt 70.8%` is still high), but it is clearly
better than either:

- pushing the check higher to `[5000, 7000]`, or
- relying on check alone without compliance-aware hiring

`addendum-37` therefore closes the "Accountant as second lever" question positively.
