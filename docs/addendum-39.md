# Grade Business Trainer — Addendum 39

Final diagnostic step for the Marketing branch after `addendum-38`.

Question: in the 3 sessions where Accountant hire lagged by **7-10 weeks** after trigger maturity,
was Accountant losing to other hires on priority, or was the budget objectively too constrained for
much of that window?

Source:

- `playtest-results/batch-addendum-37-final-marketing-n24.json`

Sessions inspected:

- `s02` (lag 7w)
- `s11` (lag 10w)
- `s17` (lag 7w)

---

## What the agent bought in the lag window

### s11

- trigger maturity window starts around **week 15**
- at week 15 the agent hired **Dev Sam** for queued retainers
- budget then fell to **$911**
- Accountant was hired only at **week 25**, after budget recovered above **$9k**

Read: this is not "Accountant lost despite comfortable cash". The first half of the window is
plain budget constraint after a delivery-critical hire.

### s17

- trigger maturity window starts around **week 15**
- at week 15 the agent hired **Dev Denis** for `4 queued retainer(s)`
- then built a desk and budget fell to **$496**
- Accountant arrived at **week 22**, only after the budget recovered to the **$5k-6k** range

Read: same pattern as `s11`, even more clearly. Dev/delivery capacity consumed the budget first;
Accountant was delayed by real cash scarcity, not a bad threshold.

### s02

- trigger maturity window starts around **week 27**
- there are **no competing hire actions** in the window before Accountant
- budget sits low for several weeks (`~$1525`) and Accountant appears only at **week 34**
- hire happens after a much stronger cash moment at week 34

Read: no evidence of role-priority competition here. This looks like a company waiting for a safer
cash cushion rather than irrationally preferring some other role.

---

## Synthesis

Across the 3 long-lag sessions:

- **2/3** show explicit competing **Dev** hires at the start of the lag window
- in those same sessions, budget drops immediately to **$911** and **$496**
- the remaining **1/3** shows no competing hires, but still no sign of abundant spare cash during
  most of the window

So the dominant explanation is:

- **budget / timing constraint first**
- role-priority competition second, but specifically because Dev under retainer backlog is the more
  urgent survival purchase in that moment

This does **not** look like a clean case for adding more Accountant priority weight right now.

---

## Decision

Per the stop condition in the request:

- the evidence is closer to **"budget objectively insufficient in the early window"**
- therefore this branch should **stop at the current configuration**

Accepted Marketing configuration:

- `checkBand = [4500, 6500]`
- Accountant trigger in `reasonable`:
  - compliance-load portfolio `>= 2`
  - held for `2w`

Reason for stopping:

- the two-factor model is already confirmed at n=24
- further tuning of Accountant priority risks optimizing behavior that is actually rational under
  cash pressure
- the remaining gap is no longer a clean "agent bug" in the same sense as the earlier 0-Marketer /
  0-Dev / 0-Accountant blind spots

---

## Closure summary for addendum-24 -> addendum-39

Marketing started as a structurally unwinnable mode for the wrong reasons:

1. **Retainer economics were too weak**
   - fixed by raising the retainer check band from the original very low range to a viable
     Marketing Director range of **`[4500, 6500]`**

2. **The agent under-reacted to long-cycle risk**
   - first on delivery capacity for queued retainers
   - then on compliance protection once the economy became marginally viable

3. **Final viable model is two-factor**
   - base economy: viable retainer unit economics
   - second-order protection: Accountant hired under sustained compliance exposure

End state:

- not perfect, still risky
- but now a coherent, explainable, and intentionally teachable management scenario rather than a
  broken one
