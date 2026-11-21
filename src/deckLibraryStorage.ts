import { validateDeck } from "./engine/decks";
import type { DeckDefinition } from "./engine/decks";

/** This store is local to the browser; saved match data uses a separate key. */
export const DECK_LIBRARY_KEY = "daggerlight-deck-library-v1";
export const DECK_LIBRARY_LIMIT = 40;
export const DECK_NAME_MAX = 42;

export interface LibraryDeck extends DeckDefinition {
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
}

export function cleanDeckName(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, DECK_NAME_MAX).trim();
}

export function makeLibraryDeck(definition: DeckDefinition, previous?: LibraryDeck): LibraryDeck {
  const name = cleanDeckName(definition.name);
  if (!name) throw new Error("Poné un nombre a tu mazo.");
  if (!validateDeck(definition).valid) throw new Error("El mazo no cumple las reglas de construcción.");
  const now = new Date().toISOString();
  return {
    id: previous?.id ?? ("deck-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9)),
    name,
    championId: definition.championId,
    cardIds: [...definition.cardIds],
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    favorite: previous?.favorite ?? false
  };
}

/** Untrusted or stale localStorage values must never enter the match engine. */
export function parseDeckLibrary(serialized: string | null): LibraryDeck[] {
  if (!serialized) return [];
  try {
    const payload: unknown = JSON.parse(serialized);
    if (!Array.isArray(payload)) return [];
    const used = new Set<string>();
    const results: LibraryDeck[] = [];
    for (const item of payload) {
      if (!item || typeof item !== "object") continue;
      const deck = item as Partial<LibraryDeck>;
      if (typeof deck.id !== "string" || !deck.id || used.has(deck.id) ||
          typeof deck.name !== "string" || !cleanDeckName(deck.name) ||
          typeof deck.championId !== "string" ||
          !Array.isArray(deck.cardIds) || !deck.cardIds.every(x => typeof x === "string") ||
          !validateDeck({
            id: deck.id, name: deck.name, championId: deck.championId,
            cardIds: deck.cardIds
          }).valid) continue;
      used.add(deck.id);
      results.push({
        id: deck.id,
        name: cleanDeckName(deck.name),
        championId: deck.championId,
        cardIds: [...deck.cardIds],
        favorite: deck.favorite === true,
        createdAt: typeof deck.createdAt === "string" ? deck.createdAt : "",
        updatedAt: typeof deck.updatedAt === "string" ? deck.updatedAt : ""
      });
      if (results.length >= DECK_LIBRARY_LIMIT) break;
    }
    return results;
  } catch {
    return [];
  }
}

export function readDeckLibrary(): LibraryDeck[] {
  try { return parseDeckLibrary(window.localStorage.getItem(DECK_LIBRARY_KEY)); }
  catch { return []; }
}

export function writeDeckLibrary(decks: LibraryDeck[]): boolean {
  if (decks.length > DECK_LIBRARY_LIMIT || decks.some(x => !validateDeck(x).valid)) return false;
  try {
    window.localStorage.setItem(DECK_LIBRARY_KEY, JSON.stringify(decks));
    return true;
  } catch { return false; }
}
