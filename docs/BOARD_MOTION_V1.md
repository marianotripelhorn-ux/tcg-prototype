# Daggerlight — Board Motion v1

**Development branch:** `feature/board-motion-v1`  
**Parent/reference:** `prototype/board-redesign-v1`, Godot-inspired React board (commit `69d61adb`).  
**Scope:** Desktop-first motion upgrade. The existing board art, printed card faces, AI, save schema, deck contents and three-position rules remain intact. Mobile layout redesign is deferred.

## Implemented

- `src/board-redesign/motion.tsx`: presentation snapshots, card-flight movement with the Web Animations API, cards exiting to their correct side/position Archives, unused cards moving to discard, and three cards dealing from the player's real deck object.
- `src/App.tsx`: motion frame around existing engine actions. When a card is submitted the engine computes and saves the result immediately; the field may temporarily show the previous round plus the just-played cards until the flight/duel/Archive/deal sequence completes.
- Drag-and-drop flights begin at the pointer release position. Non-drag plays begin from their hand card rectangle. Reduced-motion preference skips travel animations while preserving correct game state.
- Real duel results continue to trigger Power and result cinematics; the hybrid board version has shorter timings. The corresponding Life count updates at the result beat rather than after the full overlay has closed.
- `motion.css`: distinct win/loss/draw card reactions, crown impact/heal feedback, a refined hover lift and reduced-occlusion duel backdrops. No replacement of the board geometry or card artwork.
- `src/board-redesign/disableManifestations.ts` and optional `GameState.manifestationsEnabled`: new React motion-version matches disable all four Manifestations for both sides. AI use, special actions, active shields/relics, archived tokens and token generation are disabled. Saved matches are normalized upon continuation. The engine defaults to Manifestations enabled for other clients and tests.
- In this visual build, original Manifestation-creator printed cards remain in the deck, but their special creation effects are inactive. Do **not** use this branch for balance conclusions.
- `src/board-redesign/motion.test.ts`: regression tests for opt-out, restored-game normalization and non-mutating visual snapshots.
- `.github/workflows/board-motion-v1-preview.yml`: builds/tests on this branch and publishes only under `board-motion-v1/` without replacing the existing board preview or stable client.

## Presentation contract

1. Player selects or drags a legal card. Block further submissions during the visual transition.
2. Compute and persist the real engine action at once; capture the pre-action view and last-duel outcome.
3. The card physically travels to its play target; the rendered board retains old completed plays and the current duel card, even if the engine already advanced a round.
4. Existing Power reveal runs. At result reveal, Life crests react to real damage/heal. The scene responds to win/loss/draw.
5. If the round has ended, ALL played cards travel into their own corresponding Archive counters. Remaining unplayed cards go toward discard. Archive counters reveal the newly stored counts afterward.
6. The next hand is dealt from the deck; afterward gameplay input becomes available again.
7. If the round did not end, restore the authoritative game board as soon as duel resolution finishes.
8. If `No quiero` ends the round, begin directly with Archive/discard/deal; there is no invented third duel.

## Validation and known limits

- The first completed CI validation of this branch passed 183 tests (20 test files) and the TypeScript/Vite production build. Subsequent edits continue through the isolated CI workflow.
- Desktop layout deliberately remains from the reference board. Dedicated touch/mobile work is out of scope for this pass.
- Animation currently uses browser-native WAAPI rather than GSAP. This avoids extra dependencies; a dedicated timeline library can be evaluated once the live motion is reviewed and refined.
- Power/duel still uses the existing cinematic component and its internal number animation; a fully unified custom animation director and dedicated faction ability effects remain future polish.
- The Archive destination is the present per-position counter rather than a newly designed 3D well. The artwork can evolve independently.
- Browser-level motion frames and frame pacing have **not** been independently profiled in this implementation pass. They require a visual QA round on the deployed desktop preview.
- Skip/reduced-motion paths are supported at the movement level; further accessibility and state-machine transition tests should follow visual QA.

## Next visual QA

Test full three-duel rounds, AI No quiero, player No quiero, 2/3-card capacity Champions, same printed card appearing twice, saved game continuation, forced reduced motion, pointer drag placement, card inspection and rapid view switching. Ensure the card face remains sharp and the board never reflows while hovering or placing cards.
