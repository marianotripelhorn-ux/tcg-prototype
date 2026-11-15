# Daggerlight — Animation Laboratory v1

**Branch:** `feature/animation-lab-v1` (from `feature/board-motion-v1`)  
**Preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/animation-lab-v1/?lab=animations  
**Goal:** A desktop-first isolated showcase for selecting the desired visual language before any cinematic effect is connected to match rules.

## What is integrated

- **GSAP 3:** An independent, cancellable timeline for each of five object animations, with replay, pause/resume and speed control.
- **PixiJS v8:** A real GPU-backed transparent effect layer rendered above the original React card face. Displays animated sparks, light rings, directional arcs, glows, fragment streams and short-lived electric trails. GPU renderer may fall back depending on browser.
- **Actual React card face:** The lab imports `CardFace` from `src/App.tsx` rather than recreating its illustration or typography. The lab uses one card from each of the five factions. All existing Card Studio sprites stay unchanged.
- **Source artwork:** `board/arena-compass-source.png`, `champions/backgrounds/red.webp`, `champions/dextral.webp`.
- **Dedicated entry point:** `?lab=animations` conditionally mounts the laboratory; without it, the usual game loads. This is an experimental branch. No game mechanics, deck contents or balance changed.
- **Isolated deployment:** workflow `.github/workflows/animation-lab-v1-preview.yml` copies a production build to the new GitHub Pages path `animation-lab-v1/`. It never replaces `board-motion-v1/`, `board-redesign-v1/` or the stable game.

## Five experiments

1. **Archivo (transmutación):** A card lifts, receives electric energy, disintegrates from the lower edge under a jagged CSS mask, travels into a three-dimensional Archive well, emits a burst and increments a sample Archive counter. This is a layered prototype inspired by the uploaded GIF's choreography, not yet a true per-pixel shader dissolution.
2. **Colocación:** Card arrives from a simulated hand, floats, rotates and settles through two GSAP motion beats. PixiJS generates a brief contact ring and dust/spark burst.
3. **Poder:** The printed card receives a moving light effect and a demonstration counter increases by 3. Temporary energy arcs and a halo connect the card to the increase.
4. **Impacto:** A directional projectile/arc connects a card to a Life crown, then the sample counter decreases from 9 to 8 with a shock response.
5. **Estandarte:** Fabric stretches/unfurls, the text and original Champion cutout rise independently, then the banner settles.

**Palette:** Cyan/teal arcane and subdued antique gold are comparisons, not approved faction-specific VFX.  
**Controls:** Effect selection, faction card, palette, speed, particle intensity, replay, pause/resume and reset.  
**All values are illustrative:** The lab has no actual duel, damage or Archive rule calculations, and its number changes do not affect saves.

## Sample evaluations

Compare `Arcano` and `Dorado` for Archivo. Decide whether the energy visibly **transfers** the card into storage rather than apparently destroying it. Compare faster speeds to see if the anticipation/landing still reads clearly. Reduce intensity to assess when particles enhance an effect versus obscure the printed illustration.

## Engineering and safety

- PixiJS is only imported in the lazy-loaded laboratory chunk; no extra GPU renderer is mounted during normal matches.
- GSAP handles the DOM object's choreography. PixiJS draws additive GPU primitives with a bounded pool of 320 particles and cleanup on replay or unmount. The laboratory does not capture/scrape or rasterize the original React card.
- The preview renders only when the user presses REPRODUCIR, rather than repeatedly emitting effects in the background.
- The operating system's reduced-motion preference is respected initially, and the user can explicitly opt into complete motion for lab testing.
- Mobile adaptation deferred.
- Tests: existing `npm test` engine/React suite, TypeScript and Vite production build, plus `scripts/animation-lab-smoke.mjs` (real headless Chromium clicks through all five demonstrations and transport controls). The workflow also uploads a screenshot on success.

## Compatible inspiration galleries

- [GSAP timelines and demos](https://gsap.com/demos/)
- [PixiJS interactive examples](https://pixijs.io/examples/)
- [PixiJS Filters](https://filters.pixijs.download/main/docs/index.html) — PixiJS 8 needs compatible v6 filters
- [tsParticles playground](https://particles.js.org/playground/bundles) — optional alternative/preset source, **not added as a dependency**
- [GSAP documentation](https://gsap.com/docs/v3/GSAP/Timeline/)
- [PixiJS 8 Graphics](https://pixijs.com/8.x/guides/components/scene-objects/graphics)

## Not yet done

- No real shader-driven card disintegration or pixel-accurate texture transformation; the experimental edge uses a time-varying CSS clip polygon with Pixi energy around it.
- No visual-effect spritesheet or bespoke texture assets beyond existing game artwork.
- No finalized faction identities, production audio, camera movement, per-card activation VFX or color-contrast certification.
- **Not connected to live game events.** Only after visual approval should any effect be integrated with the presentation-state engine, with lifecycle/skip and duplicate-card regression tests.

## Next decision after testing

Choose the effects worth pursuing (including palette, length and intensity). Prefer selecting one gold-standard reference effect before multiplying variants. Once approved, prioritize a GPU mask/shader for Archive and a proper event-driven director to coordinate FX with real duel states.
