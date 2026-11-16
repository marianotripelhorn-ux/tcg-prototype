# Daggerlight / Gold & Shadow animations on the playable React board

**Integration branch:** `feature/board-animation-integration-v1`  
**Playable browser preview:** https://marianotripelhorn-ux.github.io/tcg-prototype/board-animations-v1/  
**Base:** Animation Lab v5, which contains the same React board, slot, motion and engine files as `feature/board-motion-v1`.

This is **real game integration**, not the standalone `?lab=animations` demo. It is isolated to its own playable preview and has not replaced the earlier gameboard or Labs.

## Art direction preserved from approved v4.2 / v5

- Antique, rich **gold** for Power gains, rebuilding, dealing, contact, neutral Archive transfer and Champion banner.
- Dense material **black** with restrained graphite/ivory contrast for Power decreases and actual Champion Life loss.
- **Complete thin concentric circles**. No broken rings, added diamonds, stars, sigils or newly invented symbols.
- Meaningful broad color sweeps, light engraving and physical card movement rather than particle showers.
- The original React `CardFace` and Champion art remain in the game throughout motion.

## Real event hooks and timing

1. **Card placement / landing** — `CardFlight` in `src/board-redesign/motion.tsx` keeps the original 560 ms real-hand-to-slot WAAPI path; adds gold surface wave + three complete full rings at the landing beat. No fake card.
2. **Power increase / decrease** — `DuelPowerCard` in `src/App.tsx` reads the real `EnginePlay.card.power` vs `EnginePlay.finalPower`; at the existing Power reveal time, it triggers gold for positive and ink-black for negative changes. Neutral Power displays do not emit decorative power FX.
3. **Champion damage / healing** — `LifeCrest` in `src/board-redesign/HybridBoardHardware.tsx` keys its effect off **actual life-prop changes**: ink black for damage, gold for restoration. Fine, complete rings sit **outside** the clipped crown shape; the real Life number remains game-owned. On real duel Life loss, `BoardDamageTransfer` draws a single, physically positioned ink ribbon from the winning played card to the losing Champion's real Life crest. No damage link is fabricated if no Life was lost.
4. **Archive capture** — `ArchiveFlight` keeps each real board card moving toward its own **side and position** Archive target. Its color plate and target full-circle response are temporary presentation classes. The game engine continues to own Archive quantities, score and next round.
5. **Materialization / new hand** — `DealMotion` retains the actual deck-originated deal; new hand cards briefly gain gold filled waves and round accents while appearing.
6. **Champion banner** — `ChampionPanel` retains the original textured fabric, cutout and real Champion text; its expand/reveal adds a restrained gold surface wave and two complete fine rings.
7. **Duel victory/defeat/draw** — the real result screen retains clear text and two complete, subtle rings. The previously unused decorative spark/star glyph string was removed.

## Rules/gameplay constraints

- No modifications to `src/engine/`, `src/data.ts`, `src/types.ts`, deck composition, saved state format, or AI.
- All effects are **presentation only**, keyed by the existing `BoardMotionSequence`, printed/final Power or actual `GameState` Life updates.
- The React hybrid board is on by default; `board=classic` retains its original presentation. The same previously isolated motion-board decision to disable Manifestations is preserved here. This branch **does not re-enable** them.
- Card play does not finish until the original `CardFlight.onComplete`, and the existing duel → archive → deal state machine remains authoritative.
- Effect layers are noninteractive (`pointer-events:none`). Preview and gameplay controls still work.
- `prefers-reduced-motion` suppresses the additional ornament and keeps the previous instant-skip/shortened-play behavior.
- The lab previews v1–v5 are still independently available at their earlier URLs.

## Validation

`.github/workflows/board-animations-v1-preview.yml` checks:
- the existing game Vitest suite (`npm test`);
- the production React/Vite build (`npm run build`);
- a genuine headless Chromium AI match via `scripts/board-animations-smoke.mjs`: splash → menu → Champion selection → playable hybrid React board → select actual hand card → choose legal position → Gold & Shadow flight → real duel resolution → two full-circle result traces. Browser page errors and preserved source elements are checked.

Artifacts are published to `main/board-animations-v1/` ONLY, with the existing previews and playable client left untouched.

## Review priorities before adopting as default

Watch the flow in a real match rather than evaluating only one animation. Check Power clarity, damage-to-Life visual relationship, card readability when fills cross, Archive target clarity and the perceived duration of frequent effects. Adjust speed/density or add a user animation speed preference before promoting into the primary gameboard.
