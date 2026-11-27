import { DECK_LIBRARY_KEY } from "./deckLibraryStorage";
import { AVATAR_KEY } from "./playerAvatar";
import { PROGRESSION_KEY } from "./soloProgression";
import { WELCOME_KEY } from "./onboarding";
import { SAVE_KEY, HISTORY_KEY } from "./persistence";

// Explicit allowlist: never clear the entire origin or touch preferences,
// telemetry consent, or diagnostic playtest exports.
export const PROFILE_RESET_KEYS = [
  "daggerlight-lab-player-name-v1", AVATAR_KEY, WELCOME_KEY,
  DECK_LIBRARY_KEY, PROGRESSION_KEY, SAVE_KEY, HISTORY_KEY,
  "daggerlight-lab-arcade-v1"
] as const;
export function resetLocalProfile(store?: Pick<Storage,"getItem"|"removeItem"|"setItem">):boolean {
  try {
    const target=store??window.localStorage;
    const snapshot=PROFILE_RESET_KEYS.map(key=>[key,target.getItem(key)] as const);
    try {
      for(const key of PROFILE_RESET_KEYS)target.removeItem(key);
      return true;
    } catch {
      // Restore the previous values if a storage operation fails.
      for(const [key,value] of snapshot){
        try{if(value===null)target.removeItem(key);else target.setItem(key,value);}catch{}
      }
      return false;
    }
  } catch { return false; }
}
