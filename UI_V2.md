# UI v2 — Online game foundation

This branch is the new client foundation. The v0.8.x LAB on `main` remains the balance/regression environment.

## Current goals

- React + TypeScript + Vite.
- Mobile-first game screen.
- Pointer Events drag interaction rather than native HTML drag-and-drop.
- Tap-to-select/tap-position fallback.
- Card component visually based on the printed card hierarchy: Power top-left, faction top-right, art-first composition, name/rules below.
- Trait rendered as a second icon below the faction mark.
- Existing red/blue art sprites are reused directly.
- UI state is intentionally demo/local for now. The next architectural step is moving the deterministic rules engine into `src/engine` and making the UI consume engine state instead of duplicating rules.

## Screen anatomy

1. Rival Champion bar.
2. Compact round / duel status strip.
3. Three vertical lanes: Siniestra, Trono, Diestra.
4. Opponent and player slots in each lane, with Archive counts.
5. Player Champion bar.
6. Three-card hand using the full card treatment.

## Mobile interaction

Cards use Pointer Events. On drag, a floating card follows the pointer and player slots highlight. Releasing over a player slot plays the card in this interaction prototype. A short tap selects the card and then a tap on the board plays it.

This is deliberately independent from the old LAB DOM so the final online client can evolve without destabilizing rule testing.
