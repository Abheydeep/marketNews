# Project Overview

Market Narrative is a source-backed Indian pre-market intelligence product for
Nifty 50, Bank Nifty, FII/DII flows, crude, Gift Nifty, Asian cues, and public
market context. The public site is free to read and must make the morning state
clear before the cash open.

## Primary Reader

Indian retail or semi-professional traders who read between 7:00 and 9:15 AM IST
and want a disciplined map, not a pile of headlines.

## Core Promise

- A verified public briefing is live before 7:15 AM IST on NSE trading days.
- The brief explains what changed overnight and what must confirm after open.
- Source cards link to original articles and carry unique India read-throughs.
- The Trading Guide stays conditional and educational.
- Market closed, source hold, limited, and full-brief states are explicit.

## In Scope

- Daily archive and `/latest/` briefing pages.
- Trading Guide pages with Nifty and Bank Nifty validation levels.
- Evidence/source ledger with public-safe summaries.
- Indices board, FII/DII page, market statistics, move explainers, and public
  multibagger model tracker.
- Admin and trading surfaces as separate private deployments.

## Out Of Scope

- Public user accounts, comments, personalised watchlists, or paid tiers.
- Public live trading, order placement, or recommendation language.
- Crypto coverage or US-stock investing pages.
- Native mobile apps.
- Any “buy/sell/hold/target” public advice.

## Success Criteria

- A new visitor understands the product in under 5 seconds.
- A returning trader completes the morning read in under 8 minutes.
- `npm run context:verify`, `npm test`, and `npm run test:deploy` pass before
  merge.
- No public page leaks private admin, studio, prompt, broker, or trading control
  data.

