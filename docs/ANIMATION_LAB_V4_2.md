# Daggerlight — Animation Lab v4.2: Complete resonance circles

**Branch:** `feature/animation-lab-v4-2` from `feature/animation-lab-v4-1`  
**Isolated preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v4-2/?lab=animations

## Visual adjustment

Replace all v4.1 **broken/partial circular traces** with **complete, thin concentric circles**, without introducing any new symbols or particles:

- **Power Increase / Decrease:** keep all three rings (outer, middle, inner), but illuminate all four border sides; adjust ring opacity down slightly to compensate for the larger illuminated perimeter.
- **Champion Damage:** keep the two concentric crown-impact rings and display them as complete circles, again with a restrained reduction in opacity.

**Retained from v4.1:** timing, motion choreography, gold for positive effects, ink black for negative effects, slightly more substantial color waves/fills, original React card art and gameboard.

## Technical details

Only `src/animation-lab/v4-motion.css` changes the visuals:
- Card rings: `.lab-v4-orbit.outer/.middle/.inner` use `border-color: currentColor`, with opacities `0.62/0.74/0.52`.
- Champion impact: `.lab-v4-impact-arcs .outer/.inner` use `border-color: currentColor`, with opacities `0.76/0.62`.

`scripts/animation-lab-smoke.mjs` now checks in Chromium that all **five rings** have a matching color and a nonzero solid border on **all four sides**. All other existing laboratory tests remain intact.

`.github/workflows/animation-lab-v4-2-preview.yml` runs the normal test, production build, and browser suite, then deploys to a new isolated preview path without replacing the playable game or the v4.1 Lab.

**Scope:** experimentation only. No gameplay effects are integrated yet; mobile redesign and Manifestations remain outside this scope.
