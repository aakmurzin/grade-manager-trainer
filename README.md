# Grade Business Trainer

Management flight simulator for agencies and IT teams. New product (not a fork of the arcade) —
shared brand tokens and some formulas only.

## Stack

- **Next.js** (App Router) + TypeScript on **Vercel**
- **Neon Postgres** + **Drizzle** (schema ready)
- **Auth.js** (email/password — wiring next)
- Game economy: pure TS reducer in `src/game/`
- Manager Report: `src/game/report/` (7 axes)
- Office render: PixiJS (upcoming); Dev Play uses DOM desks for now

## Docs

| File | Purpose |
|------|---------|
| [`docs/pitch.md`](docs/pitch.md) | Product why |
| [`docs/balance-spec.md`](docs/balance-spec.md) | Mechanics source of truth |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Original handoff (stack there said Supabase — we use Next/Neon) |
| [`docs/prototype-reference.html`](docs/prototype-reference.html) | Arcade visual/P&L reference |

## Run locally

```bash
npm install
cp .env.example .env.local   # fill DATABASE_URL + AUTH_SECRET for login
npm run db:push              # apply Drizzle schema to Neon
npm run dev
```

Open [http://localhost:3000/play](http://localhost:3000/play) for Dev Play (works without DB).

Login/signup need Neon. Generate secret:

```bash
openssl rand -base64 32
```

## Current status

- [x] Next.js scaffold + brand tokens
- [x] Decision-log TypeScript contract
- [x] Game loop + support roles + promotions + compliance
- [x] Dev Play UI + P&L + Manager Report radar
- [x] PixiJS isometric office
- [x] Auth.js credentials + session APIs
- [ ] Apply Neon migrations + debug login with real `DATABASE_URL`
- [ ] Balance calibration after live runs
