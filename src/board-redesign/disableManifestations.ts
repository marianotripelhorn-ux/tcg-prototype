import type { GameState } from "../engine/types";
import { positions } from "../data";

/**
 * Experimental motion build disables all Manifestations for both sides.
 * The original React branch and default game-engine behavior are unaffected.
 * This normalizes old saved matches too, so hidden shields/relics cannot act.
 */
export function disableManifestations(state:GameState):GameState{
  state.manifestationsEnabled=false;
  for(const side of [state.player,state.opponent]){
    side.specialHand=[];
    side.manifestations=[];
    for(const position of positions){
      side.archives[position]=side.archives[position].filter(card=>!card.specialArchiveKind);
    }
  }
  return state;
}
