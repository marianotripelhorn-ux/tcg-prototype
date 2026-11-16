# Daggerlight — Shadow Sweep v3

**Branch:** `feature/round-archive-shadow-sweep-v3`  
**Base:** `feature/round-archive-sweep-v2`  
**Isolated playable preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/round-shadow-sweep-v3/

## Screenshot feedback addressed

The v2 sweep looked choppy because it animated an irregular, evolving `clip-path: polygon(...)` geometry while also applying a live `backdrop-filter` to the moving layer. The result surface also did not cover the complete ivory board: the score-side area was exposed and the leftmost ivory margin was only partially shaded.

Version 3 replaces that animation, rather than increasing its intensity or simply extending its runtime.

## Visual choreography

1. **Full ivory-field eclipse (1,450ms)** — a dark, blue-black veil takes over the **entire** ivory playfield, from the far-left ground behind the Champion banners to the far-right score edge. Actual Champion portraits remain crisp, and the top navigation/bottom command bar remain independent. An unboxed white round result rises against the shadow with a restrained field-wide light trace. No centered grey panel or gold-on-grey title.
2. **Living shadow sweep (1,000ms)** — the opaque stage-wide curtain shrinks smoothly from the left toward the **existing right-hand duel score** using only transform/opacity; a separate, softly lit leading edge sweeps rightward at the same pace. Neither element animates a polygon, mask, backdrop blur or layout property. The score receives a subtle light pulse near the ending.
3. **Real Archive travel** — all physically played cards move in a left-to-right sequence to their own Archive counters, not into the score. Each flight is 790ms, with staggered lane departures. Archive rings remain tied to each destination.
4. **Archive counts and next deal** — the curtain and its score pulse **fully finish** before the Archive phase releases the board. The engine-authoritative Archive counts update, then the genuine new hand is dealt. Extra floating Archive confirmation text stays visually hidden.
5. **Reduced motion** — no sweeping curtain animation; the gameplay state progresses without requiring a held sequence.

## Implementation constraints

- `src/board-redesign/round-shadow-sweep-v3.css` is a final, branch-scoped override; all earlier preview branches remain unchanged.
- `src/board-redesign/roundChoreography.tsx` renders two independent compositor layers for the moving curtain and edge.
- `src/board-redesign/motion.tsx` synchronizes the Archive flight completion with a 1,070ms minimum hold so the curtain is not removed before its 1,000ms animation has ended.
- No changes to the rules engine, AI, card data, Archive semantics, Champion art, save game, deck mechanics or sound.
- CSS shadow and edge surfaces use only animated `transform` and `opacity`. Static gradients supply shading; no continuously repainted `backdrop-filter` or `clip-path` animations.

## QA

- `npm test`: original rules and prior presentation tests.
- `npm run build`: TypeScript/Vite production.
- `scripts/round-shadow-sweep-v3-smoke.mjs`: full real-Chromium AI round, verifies the dark field's true viewport geometry, white contrast, no result panel, compositor-only curtain and wavefront, real-score light pulse, real Archive card movements, Archive counter refresh and next hand.
- .github/workflows/round-shadow-sweep-v3-preview.yml publishes only `main/round-shadow-sweep-v3`.

## Fast-pass pacing refinement

After evaluating v3 visually, the shadow exit was shortened from 2.58 seconds to **1 second**, preserving the GPU-only transform animation and luminous leading edge. The round receipt stays on screen for **1.45 seconds**, played cards have quicker staggered Archive flights (**790 ms** per card), Archive-count confirmation takes **480 ms**, and new-hand deal flights take **700 ms** each. Archive advancement still waits for both the curtain and the real played-card animations; there is no abrupt cut and no gameplay change.

## Human review

Check a full three-duel round and an early `No quiero` ending, slower computers, both light/dark UI settings, mobile, different Champion banners, busy Archives and disabled reduced-motion settings.
