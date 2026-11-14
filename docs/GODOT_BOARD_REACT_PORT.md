# Godot board layout in React

Implemented on prototype/board-redesign-v1, 14 November 2026.

The desktop board now uses the same pale compass artwork, black lane ribbon, Archivo Black headings, faction banner and Champion cutout, large Life crowns, player–rival score pennant, and gold deck back as the Godot prototype. Existing printed card faces and game rules are retained.

The hand stays visible, with a large hover/focus preview. Full-color current cards and compact resolved cards share lanes without spilling into adjacent positions. Gold Power waves are clipped to card fronts; Life losses sweep downward through the crown. Existing automatic duel progression and the real Quiero/No quiero choice remain in place. No audio was added.

## Validation

- 177 tests passed, including archive/special-card callbacks, multi-card slots, and Quiero controls.
- TypeScript and Vite production build passed.
- Browser checked at 1280 × 720, 1600 × 900, and 1366 × 768.
- Played a two-duel round, inspected/selected cards, placed a second card in one lane, chose No quiero, and verified archive totals and the next round. No browser console errors.

The desktop layout is the focus of this pass. Mobile has a compact fallback; a dedicated mobile design and broader device QA remain future work. This pass retains the existing duel presentation timeline rather than introducing a new cinematic engine.
