# BUG: Marketing Agency retainer never pays revenue

**Status:** fixed (addendum-24) · **Type:** implementation defect (not balance) · **Spec:** `balance-spec.md §6`

## Symptom

Playtest batches (addenda 07–10): Marketing Agency **0/6** sessions with a budget uptick in Rapid Q1, unchanged by hire/assign funnel fixes.

## Root cause (code)

1. **`advanceProject`** paid mid-run checkpoints only for `long_delivery`, not `recurring_retainer`.
2. **`completeProject`** for retainer added `reputation += 2` only — no `$`.
3. Retainer `duration` 12w rarely finished inside Rapid Q1 if assigned mid-quarter.

## Fix (addendum-24)

Quarterly installment while the retainer is alive (`endQuarter` + remaining on `complete`). Reputation +2 per survived payment, −10 on churn. Duration 12w unchanged; Rapid can now pay at EOQ without completing the 12w bar.

## Spec expectation

Retainer should pay periodically while alive (quarterly / ongoing), churn gated by reputation — not a 12-week unpaid one-off.
