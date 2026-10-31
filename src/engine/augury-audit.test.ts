import { describe, expect, it } from "vitest";
import { byId } from "../data";
import type { Position } from "../types";
import { recordAugury, submitPlayerPlay } from "./game";
import { calculateDuel, previewOpeningPower } from "./rules";
import { createGame, resetRoundPlayer } from "./state";
import type { EnginePlay, GameState } from "./types";
const rng=()=>.314159;
const play=(id:string,position:Position):EnginePlay=>({card:byId(id),position});
function fresh(enemy="dextral"):GameState {
  return createGame("prioresa_luna_llena",enemy,rng,"opponent");
}
function resolve(state:GameState,cardId:string,playerPosition:Position,rivalCardId:string,rivalPosition:Position) {
  state.phase="awaiting_player";
  state.initiative="opponent";
  state.player.hand=[byId(cardId)];
  state.pendingOpponentPlay=play(rivalCardId,rivalPosition);
  submitPlayerPlay(state,0,playerPosition,rng);
}

describe("Augurio v2: same position, same duel",()=>{
  it("six and only six Priorato cards all say Augurio +3",()=>{
    const names=["luna_creciente","reveladora","iniciada","luna_nueva","lucero","vision_revelada"];
    for(const id of names) {
      expect(byId(id).effect).toBe("augury_match3");
      expect(byId(id).text).toBe("Augurio +3.");
    }
  });
  it("gains +3 when two cards share any of the three positions",()=>{
    for(const position of ["siniestra","trono","diestra"] as Position[]) {
      const s=fresh();const a=play("luna_creciente",position);const b=play("mensajero",position);
      const power=calculateDuel(s,a,b);
      expect(power.player).toBe(8);
      expect(power.playerNotes).toContain("+3 Augurio · misma posición");
    }
  });
  it("gains no Power when positions differ: no consolation +1",()=>{
    const st=fresh();
    expect(calculateDuel(st,play("reveladora","siniestra"),play("mensajero","diestra")).player).toBe(4);
    expect(previewOpeningPower(st,play("reveladora","siniestra"),st.player,st.opponent).exact).toBe(false);
  });
  it("the same rule works when the Prioresa opens and the rival answers",()=>{
    const s=createGame("prioresa_luna_llena","dextral",rng,"player");
    s.player.hand=[byId("luna_creciente")];
    s.opponent.hand=[byId("mensajero")];
    const choice=play("luna_creciente","trono");
    // The engine's deterministic response must use some legal position.
    const observedPower=calculateDuel(s,choice,play("mensajero","trono")).player;
    expect(observedPower).toBe(8);
    // In the actual resolved duel, only the played positions decide the result.
    submitPlayerPlay(s,0,"trono",rng);
    expect(s.lastDuel?.playerPlay.finalPower).toBe(
      s.lastDuel?.opponentPlay.position==="trono" ? 8 : 5
    );
  });
  it("a hit counts even if the Augurio loses its duel",()=>{
    const s=fresh();
    resolve(s,"reveladora","trono","incendiario","trono"); // 7 versus 8
    expect(s.lastDuel?.outcome).toBe("opponent");
    expect(s.player.auguryHitsTotal).toBe(1);
    expect(s.player.auguryHitsSinceHeal).toBe(1);
    expect(s.player.lastAuguryResult).toBe("hit");
  });
  it("a miss changes last Augurio result but never cancels earlier hits",()=>{
    const s=fresh();
    s.player.auguryHitsTotal=2;
    s.player.auguryHitsSinceHeal=2;
    resolve(s,"luna_nueva","siniestra","mensajero","trono");
    expect(s.player.lastAuguryResult).toBe("miss");
    expect(s.player.auguryHitsTotal).toBe(2);
    expect(s.player.auguryHitsSinceHeal).toBe(2);
  });
  it("records heal on third cumulative hit regardless of which duel won",()=>{
    const s=fresh();
    s.player.life=7;
    s.player.auguryHitsTotal=2;
    s.player.auguryHitsSinceHeal=2;
    resolve(s,"luna_creciente","trono","mensajero","trono");
    expect(s.player.auguryHitsTotal).toBe(3);
    expect(s.player.auguryHeals).toBe(1);
    expect(s.player.auguryHitsSinceHeal).toBe(0);
    expect(s.player.life).toBe(8);
    expect(s.player.healedLife).toBe(1);
  });
  it("restored green Life is consumed first when taking damage",()=>{
    const s=fresh();
    s.player.life=9;
    s.player.healedLife=1;
    resolve(s,"lucero","siniestra","incendiario","trono");
    expect(s.player.life).toBe(8);
    expect(s.player.healedLife).toBe(0);
  });
  it("does not exceed the cap of two heals, even with more hits",()=>{
    const s=fresh();
    s.player.life=5;
    s.player.auguryHeals=2;
    s.player.auguryHitsTotal=6;
    s.player.auguryHitsSinceHeal=0;
    resolve(s,"reveladora","trono","mensajero","trono");
    expect(s.player.auguryHitsTotal).toBe(7);
    expect(s.player.auguryHeals).toBe(2);
    expect(s.player.life).toBe(5);
  });
  it("keeps lifetime hits after round resets, with no queued Power",()=>{
    const s=fresh();
    s.player.auguryHitsTotal=2;
    s.player.auguryHitsSinceHeal=2;
    s.player.lastAuguryResult="hit";
    resetRoundPlayer(s.player,rng);
    expect(s.player.auguryHitsTotal).toBe(2);
    expect(s.player.auguryHitsSinceHeal).toBe(2);
    expect(s.player.lastAuguryResult).toBe("hit");
    expect("auguryBuff" in s.player).toBe(false);
    expect("pendingAuguries" in s.player).toBe(false);
  });
  it("Daga Lunar doubles printed Power in duel three after two lifetime hits",()=>{
    const s=fresh();
    s.turn=3;
    s.player.auguryHitsTotal=2;
    expect(calculateDuel(s,play("daga_lunar","siniestra"),play("mensajero","trono")).player).toBe(12);
    expect(calculateDuel(s,play("daga_lunar","siniestra"),play("mensajero","trono")).playerNotes)
      .toContain("+6 duplicación · Daga Lunar · 2 Augurios acertados");
    s.player.auguryHitsTotal=1;
    expect(calculateDuel(s,play("daga_lunar","siniestra"),play("mensajero","trono")).player).toBe(6);
    s.player.auguryHitsTotal=2;s.turn=2;
    expect(calculateDuel(s,play("daga_lunar","siniestra"),play("mensajero","trono")).player).toBe(6);
  });
  it("recordAugury does nothing for cards without the keyword",()=>{
    const s=fresh();
    recordAugury(s,s.player,play("caballero_marfil","trono"),play("mensajero","trono"));
    expect(s.player.auguryHitsTotal).toBe(0);
  });
});
