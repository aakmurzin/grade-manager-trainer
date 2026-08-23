# Grade Business Trainer — Addendum 34

Diagnostic follow-up to `addendum-33`, using the already collected batch:

- source: `playtest-results/batch-addendum-33-iter3-marketing-classical.json`
- focus: the 11 bankrupt sessions only

Question: are typical losses dying in pure Q1 before check size can matter, or are they dying
later, after payouts already happened?

---

## Death timing

Death-week distribution across the 11 bankrupt sessions:

- week 13: 1 session
- week 14: 1 session
- week 21-24: 5 sessions
- week 36: 4 sessions

Raw weeks:

`[13, 14, 21, 23, 24, 24, 24, 36, 36, 36, 36]`

Median death week: **24**

Interpretation:

- **0/11** die in pure Q1 (`<= 12`)
- only **2/11** die immediately after the Q1 boundary (`13-14`)
- the typical bankrupt session dies in **Q2**, not Q1
- a substantial tail survives into **Q3**

So the dominant failure mode is **not** "cannot survive until first quarter ends".

---

## Did payout happen before death?

For the same 11 bankrupt sessions:

- **11/11** had at least one retainer payout before death
- **11/11** had first payout by **week 12**
- **0/11** died before first payout

This is the key diagnostic answer: for the bankrupt group in `addendum-33`, the check lever had
already had a chance to act in every single case.

---

## Typical bankrupt shape

Representative median-ish failures:

- `s02`: dies week 24 after 1 payout, Q1/Q2 = `[-5926, -4130]`
- `s03`: dies week 24 after 4 payouts, Q1/Q2 = `[-3427, -2110]`
- `s08`: dies week 24 after 1 payout, Q1/Q2 = `[-5789, -1615]`

Later failures show the same pattern more clearly:

- `s05`: week 36, Q2 nearly breakeven `-146`, then collapses in Q3
- `s10`: week 36, actual Q2 turnaround `+2189`, then dies in Q3

This means the typical failure is not "no check ever arrived". It is closer to:

- first check arrives,
- runway extends,
- but the portfolio still fails to sustain enough margin across Q2/Q3.

---

## Decision impact

Against the branch in the user request:

- `If typical death is in Q1 before first payout` -> **not supported**
- `If death is spread across later quarters after payout` -> **supported strongly**

Therefore the data argues **against** switching to `start budget` immediately.

`start budget` is the right tool for pure pre-payout runway failure. That is not what dominates the
`addendum-33` bankrupt set. The dominant problem remains post-payout economics / stability, which
is still more consistent with the check lever than with budget as the next first-choice change.

---

## Conclusion

`addendum-33` does **not** show a Q1-before-first-payout death pattern. The median bankrupt
session dies around **week 24**, and every bankrupt session already received at least one payout.

So the diagnostic answer is:

- **do not switch to start budget yet based on this batch**
- a fourth check iteration remains justified if the goal is to keep attacking the dominant observed
  failure mode

If the next check raise still leaves bankrupt flat, *then* the case for budget as a secondary
runway lever becomes much stronger, because the pure check lever would have failed twice on the
same post-payout death distribution.
