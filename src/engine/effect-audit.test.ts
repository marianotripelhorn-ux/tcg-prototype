import { describe, expect, it } from "vitest";
import { allCards, byId } from "../data";
import type { DuelResult, Position } from "../types";
import { applyPost, submitPlayerPlay } from "./game";
import { calculateDuel, previewOpeningPower } from "./rules";
import { createGame } from "./state";
import type { EnginePlay, GameState } from "./types";

const fixed = () => 0.314159;

const directEffects = [
  "bonus2","first_or_prev_diestra2","won_prev2","empty_sin5","trono_before4",
  "diestra_before3","second_special3","third4","archive_here","archive_empty2",
  "archive_two2","opp_archive_more2","archive_three6","trono_archive_three3",
  "least_archive2","opp_archive_capped","clear_archive2x","lateral1","losing_round2",
  "score_tied1","axis_lateral2","opposite_prev3","first_round3","winning_round2",
  "prev_draw3","win_loss4","first_opposite3","archive_leads_global","archive_exact2_5",
  "archive_all_diff3","last_augury_hit2","lower_life2","last_augury_miss3","lunar_finish_double"
] as const;

const contextualEffects = [
  "enemy_printed6_2","copy_plus2","enemy_affinity2","opposite_enemy2",
  "enemy3","lost_prev_enemy3","enemy_boosted_minus2","prev_draw_enemy3",
  "cancel_enemy_affinity","enemy_repeat2","enemy_change2"
] as const;

const futureEffects = [
  "loss_next3","won_round_next3","next_position2","next_diestra2","enemy_next3","mirror_martyr"
] as const;

const doubleEffects = ["second_trono_double","equal_life_double"] as const;

const auguryEffects = ["augury_match3"] as const;

const auditedEffects = [...directEffects,...contextualEffects,...futureEffects,...doubleEffects,...auguryEffects];

function fresh(playerChampion="athos", opponentChampion="desartes") {
  const state=createGame(playerChampion,opponentChampion,fixed,"player");
  state.round=1;
  state.turn=1;
  state.roundStarter="player";
  state.initiative="player";
  state.phase="awaiting_player";
  state.duelScore={player:0,opponent:0};
  state.pendingPlayerPlay=null;
  state.pendingOpponentPlay=null;
  state.lastDuel=null;
  state.rounds=[];
  for (const p of [state.player,state.opponent]) {
    p.hand=[];
    p.deck=[];
    p.discard=[];
    p.roundPlays=[];
    p.duelResults=[];
    p.archives={siniestra:[],trono:[],diestra:[]};
    p.nextBuff=0;
    p.nextBuffNotes=[];
    p.incomingDebuff=0;
    p.incomingNotes=[];
    p.nextPositionBoost=0;
    p.nextPositionSpecificBoost=null;
    p.bluePassiveUsed=false;
    p.empireanBuff=0;
    p.nextBaseDouble=false;
    p.saintPassiveUsed=false;
    p.athosDiestraCapacity=1;
    p.viniraUsed=false;
    p.auguryHitsTotal=0;
    p.healedLife=0;
    p.lastAuguryResult=null;
    p.auguryHitsSinceHeal=0;
    p.auguryHeals=0;
  }
  return state;
}

function play(id:string, position:Position): EnginePlay {
  return {card:byId(id),position};
}

function filler(n:number, id="mensajero") {
  return Array.from({length:n},()=>byId(id));
}

type Setup = (state:GameState)=>void;

function directCase(
  label:string,
  id:string,
  position:Position,
  expectedPositive:number,
  setupPositive?:Setup,
  expectedNegative?:number,
  setupNegative?:Setup
) {
  it(label, () => {
    const positive=fresh();
    setupPositive?.(positive);
    const positivePlay=play(id,position);
    expect(previewOpeningPower(positive,positivePlay,positive.player,positive.opponent).power).toBe(expectedPositive);
    expect(calculateDuel(positive,positivePlay,play("mensajero","trono")).player).toBe(expectedPositive);

    if (expectedNegative!==undefined) {
      const negative=fresh();
      setupNegative?.(negative);
      const negativePlay=play(id,position);
      expect(previewOpeningPower(negative,negativePlay,negative.player,negative.opponent).power).toBe(expectedNegative);
      expect(calculateDuel(negative,negativePlay,play("mensajero","trono")).player).toBe(expectedNegative);
    }
  });
}

function exactCase(
  label:string,
  playerId:string,
  playerPosition:Position,
  opponentId:string,
  opponentPosition:Position,
  setup:Setup|undefined,
  expectedPlayer:number,
  expectedOpponent:number
) {
  it(label, () => {
    const state=fresh();
    setup?.(state);
    const result=calculateDuel(state,play(playerId,playerPosition),play(opponentId,opponentPosition));
    expect(result.player).toBe(expectedPlayer);
    expect(result.opponent).toBe(expectedOpponent);
  });
}

function postCase(
  label:string,
  id:string,
  position:Position,
  result:DuelResult,
  affinity:boolean,
  setup:Setup|undefined,
  assertion:(state:GameState)=>void
) {
  it(label, () => {
    const state=fresh();
    setup?.(state);
    applyPost(state,state.player,play(id,position),result,state.opponent,affinity);
    assertion(state);
  });
}

describe("Daggerlight v2 complete effect audit", () => {
  it("covers exactly the 59 unique effect IDs in the current 60-card pool", () => {
    const actual=[...new Set(allCards.map(card=>card.effect))].sort();
    expect(actual).toHaveLength(59);
    expect(actual).toEqual([...auditedEffects].sort());
    expect(allCards).toHaveLength(60);
    expect(allCards.filter(card=>card.effect==="archive_here").map(card=>card.id).sort())
      .toEqual(["archivista","bibliotecario"]);
  });

  describe("Majestad Dextral", () => {
    directCase("bonus2", "invocadagas","diestra",7);
    it("bonus2 requires Diestra affinity", () => {
      const state=fresh();
      const p=play("invocadagas","trono");
      expect(previewOpeningPower(state,p,state.player,state.opponent).power).toBe(5);
      expect(calculateDuel(state,p,play("mensajero","trono")).player).toBe(5);
    });
    directCase("first_or_prev_diestra2","guardia_dextral","diestra",7,undefined,5,s=>{
      s.player.roundPlays=[play("mensajero","trono")];
    });
    directCase("won_prev2","caballero_tigre","diestra",8,s=>{
      s.player.duelResults=["win"];
    },6,s=>{ s.player.duelResults=["loss"]; });
    directCase("empty_sin5","corona_eterea","trono",7,undefined,2,s=>{
      s.player.roundPlays=[play("mensajero","siniestra")];
    });
    directCase("trono_before4","blazewalker","siniestra",8,s=>{
      s.player.roundPlays=[play("mensajero","trono")];
    },4);
    directCase("diestra_before3","guardia_castillo","trono",8,s=>{
      s.player.roundPlays=[play("mensajero","diestra")];
    },5);
    directCase("second_special3","maestro_armas","diestra",10,s=>{
      s.player.roundPlays=[play("invocadagas","diestra")];
    },7);
    directCase("first_round3","incendiario","trono",8,undefined,5,s=>{
      s.player.roundPlays=[play("mensajero","trono")];
    });
    directCase("winning_round2","ejecutor_real","trono",7,s=>{
      s.duelScore={player:1,opponent:0};
    },5);

    postCase("loss_next3 positive","mensajero","trono","loss",false,undefined,s=>{
      expect(s.player.nextBuff).toBe(3);
    });
    postCase("loss_next3 negative","mensajero","trono","win",false,undefined,s=>{
      expect(s.player.nextBuff).toBe(0);
    });
    postCase("won_round_next3 positive","asesor_real","trono","win",false,s=>{
      s.player.duelResults=["win"];
    },s=>{ expect(s.player.nextBuff).toBe(3); });
    postCase("won_round_next3 negative","asesor_real","trono","loss",false,undefined,s=>{
      expect(s.player.nextBuff).toBe(0);
    });
    postCase("next_diestra2","abanderado_real","trono","draw",false,undefined,s=>{
      expect(s.player.nextPositionSpecificBoost).toEqual({
        position:"diestra",amount:2,source:"Abanderado real"
      });
    });
  });

  describe("Corte Sinistral", () => {
    exactCase("lost_prev_enemy3","protector","trono","mensajero","diestra",s=>{
      s.player.duelResults=["loss"];
    },5,2);
    exactCase("lost_prev_enemy3 negative","protector","trono","mensajero","diestra",undefined,5,5);
    exactCase("enemy3","asesino_sinistral","siniestra","mensajero","trono",undefined,4,2);
    exactCase("enemy3 negative","asesino_sinistral","trono","mensajero","trono",undefined,4,5);
    exactCase("enemy_printed6_2","criatura_invocada","siniestra","caballero_tigre","trono",undefined,8,6);
    exactCase("enemy_printed6_2 negative","criatura_invocada","siniestra","mensajero","trono",undefined,6,5);
    exactCase("copy_plus2","prodigio","siniestra","caballero_tigre","trono",undefined,8,6);
    exactCase("copy_plus2 off affinity","prodigio","trono","caballero_tigre","trono",undefined,3,6);
    postCase("next_position2","invocador","trono","draw",true,undefined,s=>{
      expect(s.player.nextPositionBoost).toBe(2);
    });
    postCase("next_position2 off affinity","invocador","siniestra","draw",false,undefined,s=>{
      expect(s.player.nextPositionBoost).toBe(0);
    });
    exactCase("cancel_enemy_affinity","sabio","trono","invocadagas","diestra",undefined,4,5);
    exactCase("cancel_enemy_affinity off affinity","sabio","siniestra","invocadagas","diestra",undefined,4,7);
    directCase("third4","caballero_luciernaga","siniestra",10,s=>{
      s.turn=3;
    },6,s=>{ s.turn=2; });
    postCase("enemy_next3","oraculo","siniestra","draw",true,undefined,s=>{
      expect(s.opponent.incomingDebuff).toBe(3);
    });
    postCase("enemy_next3 off affinity","oraculo","trono","draw",false,undefined,s=>{
      expect(s.opponent.incomingDebuff).toBe(0);
    });
    exactCase("enemy_boosted_minus2","desencantador","trono","mensajero","siniestra",s=>{
      s.opponent.nextBuff=3;
      s.opponent.nextBuffNotes=["+3 test"];
    },5,6);
    exactCase("enemy_boosted_minus2 negative","desencantador","trono","mensajero","siniestra",undefined,5,5);
    exactCase("enemy_affinity2","lectora_gestos","siniestra","invocadagas","trono",undefined,7,5);
    exactCase("enemy_affinity2 negative","lectora_gestos","siniestra","mensajero","trono",undefined,5,5);
    exactCase("prev_draw_enemy3","tejedor_sombras","trono","mensajero","siniestra",s=>{
      s.player.duelResults=["draw"];
    },4,2);
    exactCase("prev_draw_enemy3 negative","tejedor_sombras","trono","mensajero","siniestra",undefined,4,5);

    directCase("archive_here Archivista regression","archivista","trono",8,s=>{
      s.player.archives.trono=filler(3);
    },5);
  });

  describe("Empíreos", () => {
    directCase("archive_here Bibliotecario","bibliotecario","trono",7,s=>{
      s.player.archives.trono=filler(3);
    },4);
    directCase("archive_empty2","gusano_blanco","trono",6,undefined,4,s=>{
      s.player.archives.trono=filler(1);
    });
    directCase("archive_two2","legionario_draconido","trono",7,s=>{
      s.player.archives.trono=filler(2);
    },5,s=>{ s.player.archives.trono=filler(1); });
    directCase("clear_archive2x","libro_amaram","trono",8,s=>{
      s.player.archives.trono=filler(3);
    },2);
    directCase("opp_archive_more2","heraldo","trono",7,s=>{
      s.player.archives.trono=filler(1);
      s.opponent.archives.trono=filler(2);
    },5,s=>{
      s.player.archives.trono=filler(2);
      s.opponent.archives.trono=filler(1);
    });
    directCase("archive_three6","huevo","trono",8,s=>{
      s.player.archives.trono=filler(3);
    },2,s=>{ s.player.archives.trono=filler(2); });
    directCase("trono_archive_three3","dragon_anciano","trono",9,s=>{
      s.player.archives.trono=filler(3);
    },6,s=>{ s.player.archives.trono=filler(2); });
    directCase("least_archive2","forjador_anillos","siniestra",7,s=>{
      s.player.archives.siniestra=[];
      s.player.archives.trono=filler(1);
      s.player.archives.diestra=filler(2);
    },5,s=>{
      s.player.archives.siniestra=filler(2);
      s.player.archives.trono=[];
      s.player.archives.diestra=filler(1);
    });
    directCase("opp_archive_capped","escriba_escamado","trono",8,s=>{
      s.opponent.archives.trono=filler(6);
    },4);
    directCase("archive_leads_global","cronista_draconido","trono",6,s=>{
      s.player.archives.siniestra=filler(2);
      s.player.archives.trono=filler(1);
      s.player.archives.diestra=[];
      s.opponent.archives.siniestra=filler(1);
      s.opponent.archives.trono=[];
      s.opponent.archives.diestra=filler(3);
    },4);
    directCase("archive_exact2_5","memoria_petrificada","trono",8,s=>{
      s.player.archives.trono=filler(2);
    },3,s=>{ s.player.archives.trono=filler(1); });
    directCase("archive_all_diff3","cartografo_empireo","trono",8,s=>{
      s.player.archives.siniestra=[];
      s.player.archives.trono=filler(1);
      s.player.archives.diestra=filler(2);
    },5);

    it("Libro de Amaram actually clears the chosen Archive after resolution", () => {
      const state=fresh("desartes","athos");
      state.player.archives.trono=filler(3);
      state.player.hand=[byId("libro_amaram")];
      state.initiative="opponent";
      state.pendingOpponentPlay=play("mensajero","siniestra");
      submitPlayerPlay(state,0,"trono",fixed);
      expect(state.player.archives.trono).toHaveLength(0);
      expect(state.lastDuel?.playerPlay.finalPower).toBe(8);
    });
  });

  describe("Priorato de Marfil", () => {
    directCase("last_augury_hit2","caballero_marfil","trono",8,s=>{
      s.player.lastAuguryResult="hit";
    },6,s=>{ s.player.lastAuguryResult="miss"; });

    directCase("lower_life2","sanadora","trono",7,s=>{
      s.player.life=8; s.opponent.life=9;
    },5,s=>{ s.player.life=9; s.opponent.life=9; });

    exactCase("enemy_repeat2","guardia_constelada","trono","mensajero","trono",s=>{
      s.opponent.roundPlays=[play("mensajero","trono")];
    },8,5);
    exactCase("enemy_repeat2 negative","guardia_constelada","trono","mensajero","diestra",s=>{
      s.opponent.roundPlays=[play("mensajero","trono")];
    },6,5);

    directCase("last_augury_miss3","curacion_fallida","trono",7,s=>{
      s.player.lastAuguryResult="miss";
    },4,s=>{ s.player.lastAuguryResult="hit"; });

    exactCase("enemy_change2","exiliada","trono","mensajero","diestra",s=>{
      s.opponent.roundPlays=[play("mensajero","trono")];
    },7,5);
    exactCase("enemy_change2 negative","exiliada","trono","mensajero","trono",s=>{
      s.opponent.roundPlays=[play("mensajero","trono")];
    },5,5);

    directCase("lunar_finish_double","daga_lunar","trono",12,s=>{
      s.turn=3;s.player.auguryHitsTotal=2;
    },6,s=>{s.turn=2;s.player.auguryHitsTotal=2;});

    exactCase("augury_match3 activated","luna_creciente","trono","mensajero","trono",undefined,8,5);
    exactCase("augury_match3 missed","luna_creciente","trono","mensajero","diestra",undefined,5,5);
    it("all six Augurio designs share the same mechanic",()=>{
      const cards=["luna_creciente","reveladora","iniciada","luna_nueva","lucero","vision_revelada"];
      for(const id of cards) {
        expect(byId(id).effect).toBe("augury_match3");
      }
    });
  });

  describe("Santos", () => {
    directCase("lateral1","santo_bifronte","siniestra",7);
    directCase("lateral1 Trono","santo_bifronte","trono",6);
    directCase("losing_round2","contrapeso","trono",8,s=>{
      s.duelScore={player:0,opponent:1};
    },6,s=>{ s.duelScore={player:1,opponent:0}; });
    directCase("score_tied1","equilibrador","trono",7,undefined,6,s=>{
      s.duelScore={player:1,opponent:0};
    });
    postCase("mirror_martyr","martir_espejo","trono","draw",false,s=>{
      s.duelScore={player:1,opponent:1};
    },s=>{ expect(s.player.nextBaseDouble).toBe(true); });
    postCase("mirror_martyr negative","martir_espejo","trono","loss",false,s=>{
      s.duelScore={player:0,opponent:1};
    },s=>{ expect(s.player.nextBaseDouble).toBe(false); });
    directCase("axis_lateral2","custodio_eje","trono",8,s=>{
      s.player.roundPlays=[play("mensajero","siniestra")];
    },6);
    directCase("opposite_prev3","paso_especular","diestra",8,s=>{
      s.player.roundPlays=[play("mensajero","siniestra")];
    },5,s=>{ s.player.roundPlays=[play("mensajero","trono")]; });

    it("second_trono_double", () => {
      const positive=fresh();
      positive.turn=3;
      positive.player.roundPlays=[play("mensajero","siniestra"),play("mensajero","trono")];
      const p=play("procesion_perfecta","diestra");
      expect(previewOpeningPower(positive,p,positive.player,positive.opponent).power).toBe(10);
      expect(calculateDuel(positive,p,play("mensajero","trono")).player).toBe(10);

      const negative=fresh();
      negative.turn=3;
      negative.player.roundPlays=[play("mensajero","trono"),play("mensajero","diestra")];
      const n=play("procesion_perfecta","siniestra");
      expect(previewOpeningPower(negative,n,negative.player,negative.opponent).power).toBe(5);
      expect(calculateDuel(negative,n,play("mensajero","trono")).player).toBe(5);
    });

    exactCase("opposite_enemy2","reflejo_viviente","siniestra","mensajero","diestra",undefined,8,5);
    exactCase("opposite_enemy2 negative","reflejo_viviente","siniestra","mensajero","trono",undefined,6,5);

    it("equal_life_double", () => {
      const positive=fresh();
      positive.player.life=6;
      positive.opponent.life=6;
      const p=play("avatar_simetria","trono");
      expect(previewOpeningPower(positive,p,positive.player,positive.opponent).power).toBe(8);
      expect(calculateDuel(positive,p,play("mensajero","trono")).player).toBe(8);

      const negative=fresh();
      negative.player.life=6;
      negative.opponent.life=5;
      const n=play("avatar_simetria","trono");
      expect(previewOpeningPower(negative,n,negative.player,negative.opponent).power).toBe(4);
      expect(calculateDuel(negative,n,play("mensajero","trono")).player).toBe(4);
    });

    directCase("win_loss4","pendulo","trono",8,s=>{
      s.player.duelResults=["win","loss"];
    },4,s=>{ s.player.duelResults=["win"]; });
    directCase("prev_draw3","santo_gemelo","trono",8,s=>{
      s.player.duelResults=["draw"];
    },5,s=>{ s.player.duelResults=["win"]; });
    directCase("first_opposite3","palindromo","diestra",8,s=>{
      s.player.roundPlays=[play("mensajero","siniestra")];
    },5,s=>{ s.player.roundPlays=[play("mensajero","trono")]; });
  });
});
