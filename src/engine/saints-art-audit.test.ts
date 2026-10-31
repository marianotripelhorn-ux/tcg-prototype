import { describe, expect, it } from "vitest";
import { saintCards } from "../data";

const canon = [
  ["SAN-001", "SANTO BIFRONTE", 6, "lateral1"],
  ["SAN-002", "SEGUNDO SANTO DEL EJE", 6, "losing_round2"],
  ["SAN-003", "EQUILIBRADOR", 6, "score_tied1"],
  ["SAN-004", "MÁRTIR", 3, "mirror_martyr"],
  ["SAN-005", "GUARDIANA DE LA SIMETRÍA", 6, "axis_lateral2"],
  ["SAN-006", "SANTO PRISMÁTICO", 5, "opposite_prev3"],
  ["SAN-007", "REY SIN CORONA", 5, "second_trono_double"],
  ["SAN-008", "SÉPTIMA SOMBRA", 6, "opposite_enemy2"],
  ["SAN-009", "AVATAR DE SIMETRÍA", 4, "equal_life_double"],
  ["SAN-010", "VENGADOR EN SOMBRAS", 4, "win_loss4"],
  ["SAN-011", "SANTIDAD ESPEJADA", 5, "prev_draw3"],
  ["SAN-012", "CONSPIRADOR", 5, "first_opposite3"],
] as const;

describe("Santos Card Studio v0.4 sync", () => {
  it("has twelve distinct canonical cards with preserved mechanical IDs", () => {
    expect(saintCards).toHaveLength(12);
    expect(new Set(saintCards.map(c => c.id)).size).toBe(12);
    for (const [i, [code, name, power, effect]] of canon.entries()) {
      const card = saintCards[i];
      expect(card.studioId).toBe(code);
      expect(card.name).toBe(name);
      expect(card.power).toBe(power);
      expect(card.effect).toBe(effect);
      expect(card.faction).toBe("saints");
    }
  });
  it("maps all twelve sprites to the correct 3 x 2 cell", () => {
    saintCards.forEach((card, i) => {
      const sheet = Math.floor(i / 6) + 1;
      const slot = i % 6;
      expect(card.art).toEqual({
        sprite: `./cards/saints/saints-cards-${sheet}.webp`,
        column: slot % 3,
        row: Math.floor(slot / 3)
      });
    });
  });
  it("preserves Trono activation on SAN-005", () => {
    expect(saintCards[4].affinity).toBe("trono");
  });
});
