# Daggerlight — Animation Lab v3: ethereal dissolution, restrained

**Branch:** `feature/animation-lab-v3` (based on `feature/animation-lab-v2`).  
**Preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v3/?lab=animations  
**Scope:** standalone visual studies only. No code changes to gameplay rules, AI, card art or the existing board.

## Visual decision from latest feedback

The approved *starting point* is **Disolución etérea**, the original/reference-inspired sequence, NOT the fully opaque dual-front Marea Quiral. The first effect has the right choreography, but too many generic particles. The user prefers antique **gold for favorable effects** and suggests **black for adverse effects**.

### Default v3 study: Disolución etérea refinada

1. Card lifts subtly from the ivory board.
2. The ornate silhouette gains a tight, clear border.
3. One continuous material wave fills the card from below, gold or near-black. A restrained darkening of the stone/halo creates buildup.
4. The printed card yields to a luminous/dark outline; the original disintegration/filament structure is preserved.
5. The silhouette dissolves. A single directed filament travels away and a broad, soft material response crosses the stone.
6. The wave and outline recede.

**Particle budget:** 6 + 6 small particles per playback at 100% intensity, versus hundreds generated through the original repeated perimeter and per-frame emission. The real `CardFace` remains unchanged. One controlled PixiJS filament is retained; there is no fan of random lightning arcs.

**Polarity switch:**
- **+ Dorado:** favorable enhancement, activation or positive transformation. Gold core `#f5dda0`, antique gold mass `#bd924c`, warm amber shadow. The black board still comes through outside the card.
- **− Negro:** negative, drain, debuff or harmful transformation. Near-black ink `#060708` and graphite `#262729`, with a narrowly lit pale edge against ivory. It should feel like absorbing light, rather than adding neon purple or an electric particle storm.

These are **visual semantics only**, not a promise that all cards/abilities of any faction will share the same palette. There is no game event linkage or inferred status effect.

### Comparisons preserved

The v1 `Disolución etérea`, v2 `Marea Quiral`, v2 `Sello de Poder`, reverse materialization and other experiments remain available in the lab. Their original choreography is preserved. The polarity switch recolors their energy accents for consistent favorable/adverse comparison, but future gameplay choices remain undecided.

## Engineering

- `src/animation-lab/spectral-v3.css`: material wave, warm vs black palette, minimal stone halo, no new texture assets.
- `src/animation-lab/AnimationLab.tsx`: new default `spectral-refined` experiment (10 total). The earlier `spectral` branch remains as before, with explicit visual comparisons. GSAP drives opacity/clip masks and temporal buildup; PixiJS adds only a handful of residual accents.
- `scripts/animation-lab-smoke.mjs`: plays all ten studies in Chromium; verifies both palette switches and black shader-inspired CSS fill actually use ink values.
- `.github/workflows/animation-lab-v3-preview.yml`: deploys only to the new `animation-lab-v3/` Pages folder, and leaves all old previews and the playable game untouched.

## Questions for visual approval

1. Does the original first effect feel stronger now that the solid wave, rather than particle density, carries its climax?
2. Does the negative ink effect read as a debuff without making the artwork unreadable too early?
3. Should gold and black operate globally as positive/negative grammar, while faction identity controls secondary surface patterns?
4. Does the color remain on the card enough, or should it also affect the engraved compass in the surrounding stone?

This is an iteration on an approved candidate, not a final VFX style guide. Desktop-first; Manifestations still excluded from motion build; mobile adaptation deferred.
