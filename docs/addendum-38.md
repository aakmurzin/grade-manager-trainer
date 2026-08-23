# Grade Business Trainer — Addendum 38

Diagnostic follow-up to `addendum-37`, using the already collected final n=24 batch:

- source: `playtest-results/batch-addendum-37-final-marketing-n24.json`
- no new stochastic batch was needed

Goal: decide whether the new Accountant trigger

- `compliance load >= 2`
- held for `>= 2w`

is itself too early / too late, or whether the remaining problem is mostly hiring-priority / budget
competition.

---

## Important observability limit

The saved batch contains:

- action decisions with week + rationale
- end hints
- final summary fields

It does **not** contain full weekly load snapshots for each no-hire session.

So:

- for the **9 hire sessions**, trigger timing can be reconstructed quite well from the stored hire
  rationale (`load X held for Yw`)
- for the **15 no-hire sessions**, we cannot prove exactly how many met the 2/2w condition at some
  earlier week, because that weekly path was not persisted in the batch artifact

This means the first requested slice can only be answered **partially**, not exactly.

---

## 1. Sessions with Accountant hires: how fast after trigger?

Hire sessions: **9 / 24**

For each hire session, the rationale stores how long the load had already been held at hire time:

| Session | Hire week | Rationale payload | Delay beyond 2w trigger |
|---|---:|---:|---:|
| s06 | 13 | load 2 held for 2w | **0w** |
| s08 | 15 | load 2 held for 2w | **0w** |
| s12 | 15 | load 2 held for 2w | **0w** |
| s05 | 13 | load 2 held for 4w | **2w** |
| s04 | 13 | load 2 held for 5w | **3w** |
| s22 | 14 | load 2 held for 6w | **4w** |
| s02 | 34 | load 2 held for 9w | **7w** |
| s17 | 22 | load 3 held for 9w | **7w** |
| s11 | 25 | load 4 held for 12w | **10w** |

Delay distribution:

- immediate at threshold: **3 sessions**
- short lag (2-4w): **3 sessions**
- long lag (7-10w): **3 sessions**

Interpretation:

- the trigger does **not** behave like a deterministic instant autopick
- in many sessions, the trigger condition had existed for quite a while before the actual hire
- that points more to **budget / hire-priority competition** than to a threshold that is too strict

---

## 2. No-hire sessions: did compliance-hit happen before any Accountant could help?

No-hire sessions: **15 / 24**

Among those 15:

- sessions with a recorded failed compliance event: **8**
- sessions ending with `inProgressProjectsAtEnd >= 2`: **6**
- long runs (`weeksPlayed >= 36`): **4**

This is enough to answer the third requested slice directionally:

- yes, in a meaningful subset of no-hire sessions, compliance-hit did occur while there was still
  no Accountant at all
- so for those runs, Accountant protection arrived too late to matter, or never arrived

But because weekly load snapshots were not persisted, we cannot distinguish exactly between:

- "trigger never became true"
- "trigger became true, but budget/priority blocked hire"

for every one of the 15 sessions.

---

## 3. Does the current trigger look too early / too broad?

No.

Evidence:

- only **9/24** sessions hired Accountant
- only **3/9** hired immediately once the trigger matured
- several hires lagged by **7-10 weeks** beyond the threshold

This is the opposite of an autopick pattern.

If the trigger were too broad / too early, we would expect:

- Accountant in nearly every Marketing run
- hires clustered almost immediately after trigger maturity
- low variance in hire timing

We observe none of those.

---

## Best interpretation

The strongest reading from the stored batch is:

- the current `2 contracts for 2w` trigger is **not the main problem**
- the remaining friction is more likely:
  - cash availability at the relevant week
  - competition with Sales / Dev / desk-room priorities
  - candidate-pool availability

So this looks like a **priority / timing under budget pressure** problem, not a threshold-width
problem.

---

## Conclusion

Based on the already collected `addendum-37` final batch:

- **do not loosen the Accountant trigger yet**
- **do not tighten it either**
- leave `>= 2` held for `2w` as-is for now

Reason:

- it is not behaving like an autopick
- it is not firing uniformly early
- the observed hire delays strongly suggest that improving *how the agent prioritizes Accountant
  once the trigger is active* is a more promising next lever than changing the trigger parameters

If deeper proof is needed for no-hire sessions, the next diagnostic artifact should persist weekly
compliance-load snapshots, because the current batch format cannot answer that slice exactly.
