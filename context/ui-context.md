# UI Context

The public product should feel like a premium Indian market desk: dense enough
for traders, calm enough to read before open, and mobile-first enough to scan on
a phone.

## Visual Rules

- Dark-only theme. No light-mode toggle.
- Use existing CSS variables/tokens when available; avoid raw one-off colors in
  new components.
- Minimum tap target: 44px.
- Minimum public font size: 12px.
- Cards use restrained radius; avoid cards inside cards.
- Tables scroll horizontally on mobile and should not force page overflow.
- Bottom/mobile navigation must remain reachable on public pages.

## Public Page Structure

- Header/nav.
- Main content with clear publication state.
- Evidence/source depth below the first actionable summary.
- Footer with Archive, FII/DII, Market Statistics, About, Contact, Privacy, and
  Terms links.

## Copy Rules

- Plain trader language.
- No robotic fallback headlines.
- No “buy/sell/hold/target” advice.
- Avoid passive voice where possible.
- Market closed, source hold, limited, and global-cue-only states must be clear.

## Mobile Regression Baseline

Public pages should load without horizontal overflow at phone widths:

- `/`
- `/latest/`
- `/latest/trading-guide/`
- latest dated briefing and guide
- `/indices/`
- `/multibagger/`
- `/money-flow/fii-dii/`
- `/market-statistics/`
- `/moves/`
- `/about/`, `/subscribe/`, `/contact/`, `/privacy/`, `/terms/`

