import { describe,expect,it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChampionPicker } from "./FrontOffice";
import { champions } from "./engine/champions";
import { TUTORIAL_MATCH } from "./onboarding";

describe("Daggerlight first match",()=>{
  it("starts from the tutorial with Majestad Carmesí and easy AI",()=>{
    expect(champions[TUTORIAL_MATCH.championId].name).toContain("Majestad Carmesi");
    expect(TUTORIAL_MATCH.difficulty).toBe("easy");
    expect(TUTORIAL_MATCH.opponentId).toBe("random");
  });
  it("asks for a champion before offering opponent and difficulty",()=>{
    const html=renderToStaticMarkup(createElement(ChampionPicker,{
      onBack:()=>undefined,onPlay:()=>undefined,onGallery:()=>undefined
    }));
    expect(html).toContain("ELEGÍ TU CAMPEÓN");
    expect(html).not.toContain("DIFICULTAD");
  });
});
