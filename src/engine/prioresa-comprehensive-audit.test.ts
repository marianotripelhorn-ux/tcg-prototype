import { describe,expect,it } from "vitest";
import { byId } from "../data";
import type { Position } from "../types";
import { playEffectFeedback, playPowerDelta, formatPowerDelta } from "./presentation";
import { calculateDuel } from "./rules";
import { createGame } from "./state";
import type { EnginePlay } from "./types";

const rng=()=>0.314159;
const play=(id:string,pos:Position):EnginePlay=>({card:byId(id),position:pos});
const fresh=(rival="dextral")=>createGame("prioresa_luna_llena",rival,rng,"player");
function cardPower(id:string,state=fresh(),pos:Position="siniestra",enemy:EnginePlay=play("mensajero","trono")) {
  return calculateDuel(state,play(id,pos),enemy).player;
}
describe("Priorato de Marfil: all twelve cards under Augurio v2",()=>{
  it("Caballero de Marfil reads last Augurio hit",()=>{
    const s=fresh();s.player.lastAuguryResult="hit";
    expect(cardPower("caballero_marfil",s)).toBe(8);
    s.player.lastAuguryResult="miss";expect(cardPower("caballero_marfil",s)).toBe(6);
  });
  it("Sanadora checks lower current life",()=>{
    const s=fresh();s.player.life=7;expect(cardPower("sanadora",s)).toBe(7);
    s.player.life=9;expect(cardPower("sanadora",s)).toBe(5);
  });
  it("six Augurio cards get immediate +3 on same position and none when different",()=>{
    for(const id of ["luna_creciente","reveladora","iniciada","luna_nueva","lucero","vision_revelada"]) {
      const base=byId(id).power;
      expect(cardPower(id,fresh(),"trono",play("mensajero","trono"))).toBe(base+3);
      expect(cardPower(id,fresh(),"trono",play("mensajero","siniestra"))).toBe(base);
    }
  });
  it("Guardia Constelada triggers on repeated enemy position",()=>{
    const s=fresh();s.opponent.roundPlays=[play("mensajero","diestra")];
    expect(cardPower("guardia_constelada",s,"trono",play("invocadagas","diestra"))).toBe(8);
    expect(cardPower("guardia_constelada",s,"trono",play("invocadagas","siniestra"))).toBe(6);
  });
  it("Curación Fallida reads last missed Augurio, no old +1 consolation",()=>{
    const s=fresh();s.player.lastAuguryResult="miss";expect(cardPower("curacion_fallida",s)).toBe(7);
    s.player.lastAuguryResult="hit";expect(cardPower("curacion_fallida",s)).toBe(4);
  });
  it("Exiliada checks change of position between enemy turns",()=>{
    const s=fresh();s.opponent.roundPlays=[play("mensajero","trono")];
    expect(cardPower("exiliada",s,"trono",play("invocadagas","diestra"))).toBe(7);
    expect(cardPower("exiliada",s,"trono",play("mensajero","trono"))).toBe(5);
  });
  it("Daga Lunar doubles its base Power on duel three after two total hits",()=>{
    const s=fresh();s.turn=3;s.player.auguryHitsTotal=2;
    expect(cardPower("daga_lunar",s)).toBe(12);
    s.player.auguryHitsTotal=1;expect(cardPower("daga_lunar",s)).toBe(6);
    s.player.auguryHitsTotal=2;s.turn=2;expect(cardPower("daga_lunar",s)).toBe(6);
  });
});
describe("Augurio animation messages are results, not forecasts",()=>{
  it("shows successful and failed same-duel Augurio",()=>{
    const hit={...play("iniciada","trono"),finalPower:8,notes:["Base 5","+3 Augurio · misma posición"]};
    const miss={...play("iniciada","trono"),finalPower:5,notes:["Base 5"]};
    expect(playEffectFeedback(hit)).toBe("activated");
    expect(playEffectFeedback(miss)).toBe("inactive");
    expect(formatPowerDelta(hit)).toBe("+3 PODER");
  });
  it("recognizes Daga Lunar and modified rival Power",()=>{
    const dagger={...play("daga_lunar","trono"),finalPower:12,notes:["Base 6","+6 duplicación · Daga Lunar · 2 Augurios acertados"]};
    expect(playEffectFeedback(dagger)).toBe("activated");
    expect(formatPowerDelta(dagger)).toBe("+6 PODER");
    const debuffed={...play("curacion_fallida","trono"),finalPower:2,notes:["Base 4"]};
    expect(playPowerDelta(debuffed)).toBe(-2);
    expect(formatPowerDelta(debuffed)).toBe("−2 PODER");
  });
});
