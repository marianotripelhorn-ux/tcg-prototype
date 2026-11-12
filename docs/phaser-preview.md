# Daggerlight · Phaser experiment

This experiment is intentionally independent of both public versions.

- Classic: `/gameplay-v1/`
- Manifestations LAB: `/gameplay-v1-lab/`
- Phaser first interaction proof: `/gameplay-phaser/` (this workstream)

## Scope

One Phaser scene automatically reflows between wide and portrait layouts.
It uses real champion metadata and early Dextral card data, along with
artwork hosted in the LAB. Its logic demonstrates the interactions only.

Supported in the first vertical slice:
- Three card objects, both mouse and pointer/touch drag.
- Real in-canvas hit testing for Siniestra, Trono and Diestra.
- Responsive layout and board reflow on browser/phone resize.
- Card selection and enlargement, plus an inspection view.
- Slot occupancy and reset after placing three cards.
- Mirrored layout / portraits appropriate to desktop and mobile.

Not yet connected: full engine rules, opponent AI, Archive effects,
match results, Manifestaciones, PvP, or Arcade. No effect in the Classic/LAB.

## Acceptance gates before any migration

1. Test click-to-select and drag-to-play on Chromium desktop.
2. Test touch selection and drag on Safari iPhone and Android Chrome.
3. Test at 1366×768, 1920×1080, 390×844, 375×667.
4. Check all drag hit zones, cancel, resize, zoom and card text readability.
5. Connect existing `src/engine` through an adapter; no rewriting rules.
6. Retain separate preview until interactive browser smoke tests pass.

Run locally: `npm install`, then `npm run build:phaser`.
To serve: `npx vite --config vite.phaser.config.ts`.
Phaser dependency: v4.2.1.
