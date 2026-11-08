import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManifestCard } from "./ManifestCard";
import { SPECIAL_NAME, SPECIAL_TEXT } from "./engine/manifestations";
import type { SpecialKind } from "./engine/types";

describe("Manifest card faces", () => {
  const kinds:SpecialKind[]=["dagger","shield","relic","symmetry"];
  it("renders a real, individual card face for each special kind", () => {
    for(const kind of kinds){
      const html=renderToStaticMarkup(createElement(ManifestCard,{kind,size:"modal"}));
      expect(html).toContain('manifest-card--'+kind);
      expect(html).toContain(SPECIAL_NAME[kind]);
      expect(html).toContain(SPECIAL_TEXT[kind]);
      expect(html).toContain("<svg");
      expect(html).toContain('manifest-card-copy');
    }
  });
  it("renders mini board cards and individual playable hand cards",()=>{
    const hand=renderToStaticMarkup(createElement(ManifestCard,{kind:"dagger",size:"hand",selected:true}));
    const field=renderToStaticMarkup(createElement(ManifestCard,{kind:"shield",size:"field"}));
    expect(hand).toContain("is-armed");
    expect(hand).toContain("DAGA ETÉREA");
    expect(field).toContain("manifest-card--field");
    expect(field).toContain("ESCUDO ETÉREO");
  });
});
