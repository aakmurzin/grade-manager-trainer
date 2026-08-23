# Grade Business Trainer — Addendum 41

Stop-check before choosing Design vs Marketing priority after `addendum-40`.

Question:

> Was the `addendum-40` unified batch using the same effective configuration as the earlier
> confirmed Design / Marketing runs, or are we mixing methodological differences with balance
> conclusions?

Short answer:

- **code configuration:** yes, effectively identical
- **batch methodology / randomness:** no, not identical

That second difference is large enough that priority selection should pause until methodology is
addressed.

---

## 1. Was the code configuration different?

### Marketing

At the time of `addendum-40`, the code still had:

- `marketing_agency.checkBand = [4500, 6500]`
- the Accountant rational-hire trigger in `scripts/playtest/agents/reasonable.ts`

So `addendum-40` did **not** accidentally run the old pre-Accountant / pre-final-check
configuration.

### Design

No later step between the Design cycle closure and `addendum-40` introduced a Design-specific
balance change that would explain the regression by configuration drift.

So there is no obvious "wrong code loaded" explanation for the Design/Marketing drop.

---

## 2. What *was* different? The methodology

There are two concrete differences.

### A. Unified batch changes agent seeds for Marketing

`run-batch.ts` computes session seeds from the running session index:

```ts
seed: 1000 + i * 97 + k * 13
```

In a single-company Marketing batch:

- sessions are `s01..s24`
- seeds are `1097 .. 3627`

In the unified 4-company batch:

- Marketing sessions are `s73..s96`
- seeds are `8081 .. 10611`

So even with identical code, the unified Marketing sample is **not** using the same agent-seed
distribution as the isolated Marketing batch used in `addendum-37/39`.

This alone is enough to make "91.7% in unified vs 70.8% in isolated" not a pure apples-to-apples
comparison.

### B. The engine randomness is not seeded at all

Much more important: the simulation engine still uses raw `Math.random()` in multiple places:

- lead / candidate rolls
- close / rework / churn / compliance checks
- other event generation

`run-batch.ts` only seeds the **agent**:

```ts
const agent = agentFactory(plan.seed);
```

The engine itself is created with:

```ts
const session = new HeadlessSession({ ... })
```

and no RNG seed is passed into engine state.

This means:

- even when agent seeds are identical, engine outcomes are **not reproducible**
- Design can drift batch-to-batch even under the same isolated seed list
- n=24 is therefore weaker as a "confirmation" standard than the project had been treating it

This was already noted earlier in the cycle (`addendum-27`), but `addendum-40` makes it a
first-order methodological issue rather than a side note.

---

## 3. Consequence for Design vs Marketing priority

The current discrepancy is **not safely interpretable as a new balance verdict**.

Why:

- Marketing changed both its sample seeds **and** its engine RNG path
- Design kept the same agent-seed pattern as an isolated design batch would, but still changed
  materially because the engine RNG is unseeded

That is exactly the signature of a methodology problem, not a trustworthy "both modes regressed at
once for real balance reasons" conclusion.

So the stop-signal is valid:

- do **not** choose Design vs Marketing priority yet based on `addendum-40`
- first resolve the variance / reproducibility question

---

## 4. What should be investigated next?

Priority methodological question:

### Make batch runs reproducible at the engine level

Right now the project has:

- seeded agent behavior
- unseeded simulation behavior

That is not enough for stable calibration work.

Recommended next investigation:

1. introduce deterministic RNG plumbing into the engine (replace direct `Math.random()` usage)
2. make unified and isolated batches able to use the same per-company seed lists
3. only then repeat the cross-company n=24 or n=48 comparison

Until that is done, the interpretation of "confirmed at n=24" across the earlier cycle is weaker
than previously assumed.

---

## Conclusion

`addendum-40` did **not** run the wrong Design/Marketing code.

But it **did** run under a materially different and non-reproducible randomization setup:

- Marketing got different agent seeds in unified vs isolated mode
- all companies still depend on unseeded engine `Math.random()`

Therefore the correct next priority is **variance / RNG methodology**, not Design vs Marketing
recalibration yet.
