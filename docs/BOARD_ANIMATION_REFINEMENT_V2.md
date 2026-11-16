# Daggerlight React Board — Gold & Shadow Refinement v2

**Branch:** `feature/board-animation-refinement-v2`, isolated from the successful `feature/board-animation-integration-v1`.  
**Playable URL:** https://marianotripelhorn-ux.github.io/tcg-prototype/board-animations-v2/  
**Scope:** visual and motion refinements to the *actual* React hybrid gameboard, with unchanged game engine, AI, card data, and previous previews.

## User feedback and implemented resolutions

1. **Champion size / placement:** The existing cutout illustration is contained in a shallow, cropped window at the bottom of the expanded banner. Only its upper portion is emphasized, below the ability text. It no longer rises across the banner text.
2. **Banner activation:** Mouse-hover and focus handlers that automatically expanded Champion panels were removed. Panels change only on clicking the corresponding Champion button. Initially the player's banner remains expanded.
3. **Banner animation:** Fabric begins in a compressed vertical state and physically unfurls over around one second. The gold surface wave travels from bottom to top rather than horizontally; copy and illustration enter later.
4. **Dark duel rectangle:** The opaque duel and result backdrops are removed. Each duel's actual `EnginePlay` faces are **temporarily represented by the same original React `CardFace`**, measured at their real board slots and animated to a meeting point in the center by the Web Animations API. Original in-slot faces are hidden only while the presentation is active and automatically return afterward. Rules data remains untouched.
5. **Bottom command ribbon:** The command rail extends across the full viewport and uses the *player's real Champion-faction banner background* under a translucent black material overlay.
6. **Quiero / No quiero:** The genuine engine decision is shown in a larger, right-side vertical banner with a measured unfurl and prominent, focusable QUIERO and NO QUIERO buttons. It only appears after duel presentation is done and `game.phase === "awaiting_quiero"`.
7. **Champion Life:** The previously added *travelling damage cable* has been deleted from the App and motion component. Local ink-black bloom, complete crown rings and slight crest compression/recoil now accompany actual life loss. Healing retains a restrained gold response. Numbers still read actual `GameState`.
8. **Pacing:** Card flight lasts 770 ms plus a 230 ms landing hold; duel presentation lasts 2160 ms, including card convergence and Power state reveal; result holds 1470 ms. Archive and deal movements are slightly slower. Skipping via the existing controls remains possible. The OS reduced-motion preference is respected.
9. **Scoreboard:** Responsive, tabular score typography with decreased maximum size and corrected padding prevents score numerals overlapping the clipped side banner.
10. **Historical played cards:** Opponent stacks align to the bottom, facing the center ribbon; the player's stacks align to the top via reversed stack layout. Historical cards fill their slot width and the unnecessary shield glyph is hidden.
11. **Card Power:** Current actual final (or uncertain) Power is now upper-left, covering the original printed Power rather than appearing on the bottom edge.
12. **Background center:** The decorative compass is dynamically aligned to the real battlefield center rather than assuming the image midpoint is identical at every viewport width.

## Files

- `src/board-redesign/HybridBoardHardware.tsx`: click-only panels, cropped Champion, extended textured command bar, real Quiero banner, measured image alignment.
- `src/App.tsx`: integrated board-based duel lift, state hold, no travelling damage cable.
- `src/board-redesign/motion.tsx`: slower physical play, Archive and dealing with hold after contact.
- `src/board-redesign/refinement-v2.css`: contained CSS overrides for geometry, visual motion and responsiveness; imported last via `src/main.tsx`.
- `scripts/board-animations-smoke.mjs`: actual browser match test with additional assertions for click-only behavior, complete geometry, the duel reveal, removal of the black backdrop and damage cable, score fit and original card states.
- `.github/workflows/board-animations-v2-preview.yml`: isolated validation and publish; never overwrites the prior game or Labs.

## Constraints and follow-up QA

- The original React card illustrations, Champion art and board geometry remain. No substitute images, new sigils, particles or semantic game rules were introduced.
- The previous decision to disable Manifestations on experimental motion boards remains unchanged.
- This remains desktop-first; mobile receives safety/responsive rules but is not being redesigned.
- In visual review, check Champion head placement across factions and at 720px and shorter desktop heights; inspect a complete 0–2 decision, both sides' Life loss, Archive sequences and cards stacked in multiple copies. These are needed for aesthetic judgment beyond automated smoke checks.
- The new v2 preview is not yet promoted to the primary playable deployment.
