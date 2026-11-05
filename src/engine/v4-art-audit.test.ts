import { describe,expect,it } from "vitest";
import { allCards,cardsByFaction } from "../data";
import { championShortName,championSubtitle } from "../championArtwork";
import { champions } from "./champions";

describe("Card Studio GAME visual release",()=>{
  it("maps all 60 cards to their exported full-card sprites in the right 3x2 cells",()=>{
    expect(allCards).toHaveLength(60);
    expect(new Set(allCards.map(card=>card.studioId)).size).toBe(60);
    for(const [faction,cards] of Object.entries(cardsByFaction)){
      expect(cards).toHaveLength(12);
      cards.forEach((card,index)=>{
        expect(card.art).toEqual({
          sprite:`./cards/v4/${faction}-${Math.floor(index/6)+1}.webp`,
          column:(index%6)%3,
          row:Math.floor((index%6)/3)
        });
      });
    }
  });
  it("keeps the nine original champion abilities while giving short display names",()=>{
    expect(Object.values(champions)).toHaveLength(9);
    for(const champion of Object.values(champions)){
      expect(championShortName(champion.name)).toBeTruthy();
      expect(champion.text.length).toBeGreaterThan(10);
      expect(championShortName(champion.name)).not.toContain(",");
    }
    expect(championShortName(champions.athos.name)).toBe("Athos");
    expect(championSubtitle(champions.athos.name)).toBe("Capitán de la Guardia Dextral");
  });
});
