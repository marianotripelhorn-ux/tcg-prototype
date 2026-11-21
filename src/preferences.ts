/** Local presentation preferences; independent of game rules and saves. */
export interface GamePreferences {
  audioEnabled: boolean;
  volume: number;
  motion: "standard" | "reduced";
}
export const DEFAULT_PREFERENCES: Readonly<GamePreferences> = {
  audioEnabled: true, volume: 100, motion: "standard"
};
const KEY = "daggerlight-settings-v1";
const LEGACY_SOUND = "daggerlight-duel-sfx";

export function normalizePreferences(value: unknown, legacySoundEnabled = true): GamePreferences {
  const input = value && typeof value === "object" ? value as Partial<GamePreferences> : {};
  const v = typeof input.volume === "number" && Number.isFinite(input.volume)
    ? input.volume : DEFAULT_PREFERENCES.volume;
  return {
    audioEnabled: typeof input.audioEnabled === "boolean" ? input.audioEnabled : legacySoundEnabled,
    volume: Math.max(0, Math.min(100, Math.round(v))),
    motion: input.motion === "reduced" ? "reduced" : "standard"
  };
}
export function readPreferences(): GamePreferences {
  try {
    const sound = window.localStorage.getItem(LEGACY_SOUND) !== "off";
    const data = window.localStorage.getItem(KEY);
    return normalizePreferences(data ? JSON.parse(data) : null, sound);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
export function writePreferences(next: GamePreferences): void {
  try {
    const clean = normalizePreferences(next);
    window.localStorage.setItem(KEY, JSON.stringify(clean));
    window.localStorage.setItem(LEGACY_SOUND, clean.audioEnabled ? "on" : "off");
  } catch { /* Storage blocked; live settings still work. */ }
}
export function shouldReduceMotion(motion: GamePreferences["motion"]): boolean {
  return motion === "reduced" || (typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
