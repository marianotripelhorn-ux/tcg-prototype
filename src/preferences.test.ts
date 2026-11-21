import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, normalizePreferences } from "./preferences";
describe("Daggerlight preferences", () => {
  it("respects the legacy mute switch", () => {
    expect(normalizePreferences(null,false)).toEqual({...DEFAULT_PREFERENCES,audioEnabled:false});
  });
  it("preserves valid settings", () => {
    expect(normalizePreferences({audioEnabled:false,volume:45,motion:"reduced"}))
      .toEqual({audioEnabled:false,volume:45,motion:"reduced"});
  });
  it("sanitizes invalid and extreme settings", () => {
    expect(normalizePreferences({volume:900,motion:"fast"}).volume).toBe(100);
    expect(normalizePreferences({volume:-12,motion:"fast"}).motion).toBe("standard");
    expect(normalizePreferences({volume:NaN}).volume).toBe(100);
  });
});
