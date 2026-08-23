# Grade Business Trainer — Addendum 40

Unified Classical check after both completed calibration cycles:

- Design cycle: `addendum-08 -> 23`
- Marketing cycle: `addendum-24 -> 39`

Method:

- `reasonable` agent
- `classical_4q`
- **24 sessions per company type**
- one common batch artifact for direct comparison

Source:

- `playtest-results/batch-addendum-40-all-classical-n96.json`

---

## Unified table

| Company | Level | Bankrupt | Profitable | Q3 or Q4 > 0 | Mean NP | Median NP | p10 | p90 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Design Agency | Trainee | **20.8%** | **4.2%** | 50.0% | **-$7,974** | **-$7,904** | -$13,137 | -$1,339 |
| Product Studio | Trainee | **8.3%** | **62.5%** | 83.3% | **+$2,371** | **+$2,334** | -$9,208 | +$12,314 |
| IT Outsourcing | Manager | **29.2%** | **70.8%** | 75.0% | **+$17,409** | **+$17,394** | -$11,822 | +$43,159 |
| Marketing Agency | Director | **91.7%** | **8.3%** | 8.3% | **-$4,223** | **-$6,255** | -$8,969 | +$411 |

---

## Reading by company

### Design Agency

Design looks **bad**, despite not being the most bankrupt-heavy mode.

Why:

- bankrupt is only **20.8%**
- but profitable is almost zero (**1/24**)
- median and p90 are still negative

So Design no longer reads as "fair/winnable but risky". It reads as "usually survives 4Q but still
loses money". That is a different failure mode from bankruptcy, but still a calibration failure.

Successful shape exists only once:

- `s03`: `[-5043, +3012, -220, +2383]`, cum **+$132**

This is far weaker than the intended `addendum-23` target.

### Product Studio

Product looks **acceptable** and strongly differentiated.

- high profitable rate (**62.5%**)
- low bankrupt (**8.3%**)
- wide dispersion (`p10 -$9.2k`, `p90 +$12.3k`)
- many successful runs show violent quarter-to-quarter swings

This matches the intended "rare high-value bets / high variance" identity much better than a smooth
linear growth curve would.

Examples:

- `s33`: `[-8641, +10660, +12516, +7005]`
- `s32`: `[-5028, +4389, -3204, +8957]`
- `s40`: `[+3292, -787, +6918, +3544]`

### IT Outsourcing

IT looks **strong** and also differentiated.

- profitable **70.8%**
- mean / median very positive
- still some bankrupt / deep-loss tails
- successful runs often explode in Q3/Q4 through large checkpoint revenue

Examples:

- `s49`: `[+10587, +13993, +17326, +30159]`
- `s54`: `[-4075, +9207, -244, +39394]`
- `s71`: `[-7661, +23281, +16535, +9118]`

This is not the same shape as Product: IT often stabilizes into big later-quarter accumulation,
whereas Product is more binary / hit-driven.

### Marketing Agency

Marketing still looks **bad** in the cross-company check.

- bankrupt **91.7%**
- profitable **8.3%**
- Q3/Q4 positive in only **8.3%**
- p90 barely above zero

Only two successful runs:

- `s89`: `[-1640, +4929, +10816, -222]`
- `s90`: `[-3030, +2832, +5967, +4592]`

So the two-factor model from `addendum-37` is real, but still fragile on a fresh 24-seed sample.

---

## Diversity of successful trajectories

The good news: all four types do **not** collapse to one identical curve.

### Product vs IT difference is visible

Product:

- more jagged
- more binary
- more frequent massive quarter swings
- success can come after ugly intermediate dips

IT:

- larger absolute upside
- more checkpoint-driven accumulation
- often calmer after the Q2 turn, though still with some sharp spikes

So the "all companies feel the same" concern is **not** supported by this batch.

### The real issue is uneven viability, not lack of differentiation

What the batch actually says is:

- Product and IT are both viable **and** distinct
- Design and Marketing are both currently underperforming, for different reasons

---

## Priority

Using the user's decision frame:

### Leave alone

- **Product Studio**
- **IT Outsourcing**

They already sit in a reasonable range and show distinct shapes. No immediate calibration cycle is
needed.

### Open / reopen calibration

1. **Marketing Agency** — highest priority
   - still structurally too fragile in fresh n=24
   - previous good result does not generalize enough

2. **Design Agency** — second priority
   - not a bankruptcy crisis, but almost no truly profitable runs
   - mode appears "survive but lose", which is also not the target

---

## Conclusion

The unified cross-company pass does **not** validate the current state as globally calibrated.

It validates something more specific:

- Product Studio: acceptable
- IT Outsourcing: acceptable
- Design Agency: needs a new calibration pass
- Marketing Agency: needs a new calibration pass, highest priority

So the next work should **not** be split across all four types. It should focus on the two
remaining underperformers, starting with Marketing.
