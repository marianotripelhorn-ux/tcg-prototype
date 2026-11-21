import { describe, expect, it } from "vitest";
import { blueCards, redCards, saintCards } from "./data";
import { makeMonoDeckDefinition, validateDeck } from "./engine/decks";
import {
  cleanDeckName, makeLibraryDeck, parseDeckLibrary,
  DECK_LIBRARY_LIMIT
} from "./deckLibraryStorage";

const mono = makeMonoDeckDefinition("dextral");
const mixed = {
  ...mono,
  name: "Guardia y Corte",
  cardIds: [
    ...redCards.slice(0, 6).flatMap(c=>[c.id,c.id]),
    ...blueCards.slice(0, 6).flatMap(c=>[c.id,c.id])
  ]
};

describe("saved deck library", () => {
  it("saves original 24-card starter recipes without changing the engine rules", () => {
    const saved = makeLibraryDeck(mono);
    expect(saved.cardIds).toEqual(mono.cardIds);
    expect(saved.cardIds).toHaveLength(24);
    expect(new Set(saved.cardIds).size).toBe(12);
    expect(validateDeck(saved).valid).toBe(true);
    expect(saved.favorite).toBe(false);
  });

  it("round-trips a valid named two-faction library deck", () => {
    const saved = makeLibraryDeck(mixed);
    const restored = parseDeckLibrary(JSON.stringify([saved]));
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe("Guardia y Corte");
    expect(restored[0].cardIds).toEqual(mixed.cardIds);
    expect(validateDeck(restored[0]).factions).toEqual(["red","blue"]);
  });

  it("preserves identity and creation date when editing", () => {
    const first = makeLibraryDeck(mixed);
    const second = makeLibraryDeck({...mixed,name:"Renombrado"},first);
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.name).toBe("Renombrado");
  });

  it("rejects invalid stored decks and duplicate IDs", () => {
    const stored = makeLibraryDeck(mixed);
    const invalid = {...stored,cardIds:[
      ...redCards.slice(0,5).flatMap(c=>[c.id,c.id]),
      ...blueCards.slice(0,6).flatMap(c=>[c.id,c.id]),
      ...saintCards.slice(0,1).flatMap(c=>[c.id,c.id])
    ]};
    const wrongChampion = {...stored,id:"wrong-champion",championId:"not-a-champion"};
    expect(parseDeckLibrary(JSON.stringify([invalid,stored,stored,wrongChampion]))).toHaveLength(1);
    expect(parseDeckLibrary("{bad-json")).toEqual([]);
  });

  it("enforces a finite deck library and cleans names", () => {
    expect(DECK_LIBRARY_LIMIT).toBeGreaterThan(0);
    expect(cleanDeckName("  Mazo\n  del  Rey  ")).toBe("Mazo del Rey");
    expect(()=>makeLibraryDeck({...mono,name:"  "})).toThrow();
  });
});
