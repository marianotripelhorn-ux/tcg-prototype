import { describe,expect,it } from "vitest";
import { byId } from "../data";
import type { Position } from "../types";
import { auguryMatches, submitPlayerPlay } from "./game";
import { playEffectFeedback, playPowerDelta, formatPowerDelta } from "./presentation";
import { calculateDuel } from "./rules";
import { createGame } from "./state";
import type { EnginePlay, PendingAugury } from "./types";

const rng=()=>0.314159;
const play=(id:string,pos:Position):EnginePlay=>({card:byId(id),position:pos});
const fresh=(rival="dextral")=>createGame("prioresa_luna_llena",rival,rng,"player");
const pending=(effect:string,pos:Position="siniestra"):PendingAugury=>({
  effect,sourceCardId:"test",sourceName:"TEST",sourcePosition:pos
});
function cardPower(id:string,state= fresh(),pos:Position="siniestra",enemy:EnginePlay=play("mensajero","trono")) {
  return calculateDuel(state,play(id,pos),enemy).player;
}

describe("Priorato de Marfil: twelve card-condition audit",()=>{
  it("Caballero de Marfil grants +2 on last Augury hit and not on miss",()=>{
    const st=fresh();st.player.lastAuguryResult="hit";
    expect(cardPower("caballero_marfil",st)).toBe(8);
    st.player.lastAuguryResult="miss";
    expect(cardPower("caballero_marfil",st)).toBe(6);
  });
  it("Sanadora checks Vida, not round score",()=>{
    const st=fresh();st.player.life=7;
    expect(cardPower("sanadora",st)).toBe(7);
    st.player.life=9;
    expect(cardPower("sanadora",st)).toBe(5);
  });
  it("Luna Creciente checks opponent's position equal to its played position",()=>{
    const st=fresh();expect(auguryMatches(pending("augury_same_position","trono"),play("mensajero","trono"),st.opponent)).toBe(true);
    expect(auguryMatches(pending("augury_same_position","trono"),play("mensajero","diestra"),st.opponent)).toBe(false);
  });
  it("Reveladora checks printed power >= 6, not modified power",()=>{
    const st=fresh();expect(auguryMatches(pending("augury_printed6"),play("caballero_tigre","diestra"),st.opponent)).toBe(true);
    expect(auguryMatches(pending("augury_printed6"),play("mensajero","diestra"),st.opponent)).toBe(false);
  });
  it("Iniciada checks specifically opponent's Trono play",()=>{
    const st=fresh();expect(auguryMatches(pending("augury_trono"),play("mensajero","trono"),st.opponent)).toBe(true);
    expect(auguryMatches(pending("augury_trono"),play("mensajero","siniestra"),st.opponent)).toBe(false);
  });
  it("Luna Nueva predicts opposite lateral and cannot work from Trono",()=>{
    const st=fresh();expect(auguryMatches(pending("augury_opposite_lateral","siniestra"),play("mensajero","diestra"),st.opponent)).toBe(true);
    for(const pos of ["siniestra","trono","diestra"] as Position[]) {
      expect(auguryMatches(pending("augury_opposite_lateral","trono"),play("mensajero",pos),st.opponent)).toBe(false);
    }
  });
  it("Guardia Constelada triggers only when rival repeats a position",()=>{
    const st=fresh();st.opponent.roundPlays=[play("mensajero","diestra")];
    expect(cardPower("guardia_constelada",st,"trono",play("invocadagas","diestra"))).toBe(8);
    expect(cardPower("guardia_constelada",st,"trono",play("invocadagas","siniestra"))).toBe(6);
  });
  it("Lucero requires repeated rival position from this round",()=>{
    const st=fresh();st.opponent.roundPlays=[play("mensajero","diestra")];
    expect(auguryMatches(pending("augury_repeated_position"),play("invocadagas","diestra"),st.opponent)).toBe(true);
    expect(auguryMatches(pending("augury_repeated_position"),play("invocadagas","trono"),st.opponent)).toBe(false);
  });
  it("Visión Revelada checks existence of an affinity, not whether it is active",()=>{
    const st=fresh();expect(auguryMatches(pending("augury_enemy_affinity"),play("invocadagas","siniestra"),st.opponent)).toBe(true);
    expect(auguryMatches(pending("augury_enemy_affinity"),play("mensajero","diestra"),st.opponent)).toBe(false);
  });
  it("Curación Fallida activates on a last Augury miss",()=>{
    const st=fresh();st.player.lastAuguryResult="miss";
    expect(cardPower("curacion_fallida",st)).toBe(7);
    st.player.lastAuguryResult="hit";
    expect(cardPower("curacion_fallida",st)).toBe(4);
  });
  it("Exiliada checks opponent changed position from their own prior play",()=>{
    const st=fresh();st.opponent.roundPlays=[play("mensajero","trono")];
    expect(cardPower("exiliada",st,"trono",play("invocadagas","diestra"))).toBe(7);
    expect(cardPower("exiliada",st,"trono",play("mensajero","trono"))).toBe(5);
  });
  it("Daga Lunar grants +2 only in the third duel",()=>{
    const st=fresh();expect(cardPower("daga_lunar",st)).toBe(6);
    st.turn=3;expect(cardPower("daga_lunar",st)).toBe(8);
  });
  it("current implementation updates last Augury status during the response to a committed card",()=>{
    const hit=fresh();
    hit.player.hand=[byId("caballero_marfil")];
    hit.opponent.hand=[byId("caballero_tigre")];
    hit.player.pendingAuguries=[pending("augury_printed6")];
    submitPlayerPlay(hit,0,"siniestra",rng);
    expect(hit.player.lastAuguryResult).toBe("hit");
    expect(hit.lastDuel?.playerPlay.finalPower).toBe(8);
    expect(hit.player.auguryBuff).toBe(3);

    const miss=fresh();
    miss.player.hand=[byId("curacion_fallida")];
    miss.opponent.hand=[byId("mensajero")];
    miss.player.pendingAuguries=[pending("augury_printed6")];
    submitPlayerPlay(miss,0,"siniestra",rng);
    expect(miss.player.lastAuguryResult).toBe("miss");
    expect(miss.lastDuel?.playerPlay.finalPower).toBe(7);
    expect(miss.player.auguryBuff).toBe(1);
  });

  it("third successful Augury triggers one heal and queues +3 on committed card",()=>{
    const st=fresh();st.player.hand=[byId("sanadora")];st.opponent.hand=[byId("invocadagas")];
    st.player.life=6;st.player.auguryHitsSinceHeal=2;
    st.player.pendingAuguries=[pending("augury_enemy_affinity")];
    submitPlayerPlay(st,0,"siniestra",rng);
    expect(st.player.lastAuguryResult).toBe("hit");
    expect(st.player.auguryHeals).toBe(1);
    expect(st.player.auguryHitsSinceHeal).toBe(0);
    expect(st.player.life).toBeGreaterThanOrEqual(6);
    expect(st.player.life).toBeLessThanOrEqual(7);
    expect(st.player.auguryBuff).toBe(3);
    expect(st.lastDuel?.playerPlay.finalPower).toBe(7);
  });
});

describe("Combat presentation is not game logic",()=>{
  it("distinguishes a missed conditional ability from applied bonus or a forecast",()=>{
    const miss=play("curacion_fallida","trono");miss.finalPower=4;miss.notes=["Base 4"];
    expect(playEffectFeedback(miss)).toBe("inactive");
    const hit={...miss,finalPower:7,notes:["Base 4","+3 último Augurio fallado"]};
    expect(playEffectFeedback(hit)).toBe("activated");
    expect(formatPowerDelta(hit)).toBe("+3 PODER");
    const debuffed={...miss,finalPower:2};expect(playPowerDelta(debuffed)).toBe(-2);
    expect(formatPowerDelta(debuffed)).toBe("−2 PODER");
    const forecast=play("iniciada","trono");
    expect(playEffectFeedback(forecast)).toBe("forecast");
  });
});
