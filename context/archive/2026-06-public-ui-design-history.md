# Public UI Design History — June 2026

Status: superseded design record. This file preserves useful intent from local
indices, FII/DII, and mobile-review artifacts that were removed on 1 July 2026.
It is not an active issue list. Current ownership and open work live in
`context/architecture-context.md` and `context/progress-tracker.md`.

## Indices and GIFT Nifty

The redesign aimed to make `/indices/` and `/indices/gift-nifty/` useful during
the pre-market window through:

- a shared Market Narrative document shell and navigation;
- live index polling with a visible stale/offline state;
- a GIFT Nifty spotlight, implied-gap calculation, session countdown, and
  historical gap context;
- global-market breadth, India VIX context, and concise macro read-through;
- responsive layouts that retain useful hierarchy on a 390px viewport.

These responsibilities now live in the focused `indices-*` and
`gift-nifty-*` modules rather than `publish-site.mjs`. The shared-shell and
single-footer contracts are enforced by `public-page-contract.test.mjs` and
`architecture-guard.test.mjs`.

## FII/DII

The redesign focused on interpretation instead of presenting an undifferentiated
grid of figures:

- sign-aware, calmer flow colors;
- a cash-flow battle bar and FII long/short positioning gauge;
- readable primary and secondary charts, including a 50% neutral reference;
- missing-data rows represented as missing rather than zero;
- compact lakh formatting, magnitude bars, and responsive tables;
- one canonical shared footer and mobile shell.

The corresponding implementation is split across `fii-dii-page.mjs`,
`fii-dii-styles.mjs`, `fii-dii-charts.mjs`, `fii-dii-tables.mjs`,
`fii-dii-format.mjs`, and `fii-dii-copy.mjs`. Future claims about historical
extremes or market regimes must remain computed from stored data and must not be
hardcoded.

## Mobile review principles

The removed Word review and screenshot fragments emphasized these durable
principles:

- reduce duplicated navigation and move secondary destinations under a compact
  overflow entry where appropriate;
- avoid repeating publication time wording across every surface;
- combine related controls into one coherent card;
- use compact, modern disclosure controls;
- ensure fixed mobile navigation never obscures the final content;
- keep FII/DII and Indices reachable from the shared navigation.

Most concrete June findings were subsequently addressed through the shared
shell, centralized chrome, breakpoint alignment, single-column mobile source
cards, and footer de-duplication. Any remaining visual concern must be reproduced
against the latest generated artifact before it is added as an active defect.

## Removed source artifacts

The source material consolidated here consisted of local redesign Markdown, an
HTML mockup with host-dependent CSS tokens, a Word document with embedded
screenshots and personal metadata, a stale local issue list, and two duplicate
PNG fragments. They were intentionally not committed in their original forms.

No architecture diagrams changed.
