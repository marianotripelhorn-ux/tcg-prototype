# Daggerlight — Shadow Sweep v3

**Branch:** `feature/round-archive-shadow-sweep-v3`  
**Base:** `feature/round-archive-sweep-v2`  
**Isolated playable preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/round-shadow-sweep-v3/

## Screenshot feedback addressed

The v2 sweep looked choppy because it animated an irregular, evolving `clip-path: polygon(...)` geometry while also applying a live `backdrop-filter` to the moving layer. The result surface also did not cover the complete ivory board: the score-side area was exposed and the leftmost ivory margin was only partially shaded.

Version 3 replaces that animation, rather than increasing its intensity or simply extending its runtime.

## Visual choreography

1. **Full ivory-field eclipse (1,450ms)** — a dark, blue-black veil takes over the **entire** ivory playfield, from the far-left ground behind the Champion banners to the far-right score edge. Actual Champion portraits remain crisp, and the top navigation/bottom command bar remain independent. An unboxed white round result rises against the shadow with a restrained field-wide light trace. No centered grey panel or gold-on-grey title.
2. **Living shadow sweep (650ms)** — the opaque, full-size curtain translates continuously off the ivory board to the right, revealing the field behind it. Its luminous edge is attached to the **same** surface, so nothing can fall out of sync. Only two transform keyframes and one easing curve are used; no scaling, polygon, mask or backdrop blur animation. The score briefly receives the passing shadow.
3. **Real Archive travel** — all physically played cards move in a left-to-right sequence to their own Archive counters, not into the score. Each flight is 640ms, with short staggered lane departures. Archive rings remain tied to each destination.
4. **Archive counts and next deal** — the curtain and its score pulse **fully finish** before the Archive phase releases the board. The engine-authoritative Archive counts update, then the genuine new hand is dealt. Extra floating Archive confirmation text stays visually hidden.
5. **Reduced motion** — no sweeping curtain animation; the gameplay state progresses without requiring a held sequence.

## Implementation constraints

- `src/board-redesign/round-shadow-sweep-v3.css` is a final, branch-scoped override; all earlier preview branches remain unchanged.
- `src/board-redesign/roundChoreography.tsx` renders a single compositor layer; its luminous edge is a static CSS pseudo-element on that moving surface.
- `src/board-redesign/motion.tsx` synchronizes the Archive flight completion with a 700ms minimum hold so the curtain is not removed before its 650ms translation has ended.
- No changes to the rules engine, AI, card data, Archive semantics, Champion art, save game, deck mechanics or sound.
- CSS shadow and edge surfaces use only animated `transform` and `opacity`. Static gradients supply shading; one two-keyframe `translate3d` tween moves the entire surface without scaling, filtering, repeated keyframe easing or `clip-path` animations.

## QA

- `npm test`: original rules and prior presentation tests.
- `npm run build`: TypeScript/Vite production.
- `scripts/round-shadow-sweep-v3-smoke.mjs`: full real-Chromium AI round, verifies the dark field's true viewport geometry, white contrast, no result panel, single 650ms full-size curtain with attached light edge, real-score light pulse, real Archive card movements, Archive counter refresh and next hand.
- .github/workflows/round-shadow-sweep-v3-preview.yml publishes only `main/round-shadow-sweep-v3`.

## Fast-pass pacing refinement

After testing the faster version visually, the remaining choppiness was traced to multi-stop keyframe easing and an independently animated edge. The revised shadow is **one continuous 650ms translate3d** movement, with an attached static illuminated edge. The round receipt stays at **1.45 seconds**; played cards enter their Archives in **640ms** with shortened staggering; Archive-count confirmation takes **350ms**; and each new-hand deal lasts **600ms** with an 85ms stagger. Archive advancement still waits for the real card movements and completed curtain, preserving gameplay rules and correctness.

## Human review

Check a full three-duel round and an early `No quiero` ending, slower computers, both light/dark UI settings, mobile, different Champion banners, busy Archives and disabled reduced-motion settings.
