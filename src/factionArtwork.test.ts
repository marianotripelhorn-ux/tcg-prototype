import { describe, expect, it } from "vitest";
import { factionArt, factionArtUrl } from "./factionArtwork";
import type { Faction } from "./types";

describe("Faction visual assets", () => {
  const factions:Faction[]=["red","blue","white","saints","ivory"];

  it("defines a vertical and horizontal image for every game faction", () => {
    expect(Object.keys(factionArt).sort()).toEqual([...factions].sort());
    for (const faction of factions) {
      expect(factionArt[faction].portrait).toBe(`${faction}-portrait.webp`);
      expect(factionArt[faction].banner).toBe(`${faction}-banner.webp`);
    }
  });

  it("builds asset URLs within Vite's configured site base", () => {
    const base=import.meta.env.BASE_URL;
    for(const faction of factions) {
      expect(factionArtUrl(faction,"portrait")).toBe(`${base}factions/${faction}-portrait.webp`);
      expect(factionArtUrl(faction,"banner")).toBe(`${base}factions/${faction}-banner.webp`);
    }
  });
});
