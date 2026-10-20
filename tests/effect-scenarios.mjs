import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error("Could not extract game script.");

let source = match[1];
const cut = source.indexOf("function renderCardList(){");
if (cut < 0) throw new Error("Could not find safe script cut point.");
source = source.slice(0, cut);

const context = {
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Array,
  Object,
  Number,
  String,
  Boolean,
  RegExp,
  Promise,
  document: {
    getElementById() {
      return {
        innerHTML: "", textContent: "", disabled: false, open: false, value: "random",
        classList: { add(){}, remove(){}, toggle(){} },
        appendChild(){}, addEventListener(){}, showModal(){}, close(){},
        style: {}, dataset: {}
      };
    },
    createElement() {
      return {
        classList: { add(){}, remove(){}, toggle(){} },
        appendChild(){}, addEventListener(){}, click(){}, style: {}, dataset: {}
      };
    },
    querySelectorAll(){ return []; }
  },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  navigator: {},
  Blob: class {},
  URL: { createObjectURL(){ return ""; }, revokeObjectURL(){} },
  setTimeout(){}
};
context.globalThis = context;

source += `
globalThis.__ENGINE__ = {
  cards, champions, playerTemplate, previewPendingPower, calculatePowers, applyPost,
  affinityActive, baseDoubleReasons, capacity,
  setState(v){ state=v; },
  getState(){ return state; }
};
`;

vm.createContext(context);
vm.runInContext(source, context);
const E = context.__ENGINE__;

const allCards = Object.values(E.cards).flat();
const card = id => {
  const c = allCards.find(x => x.id === id);
  if (!c) throw new Error("Missing card " + id);
  return c;
};
const play = (id, position) => ({ card: card(id), position });

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
  else passed++;
}
function truth(label, actual) { check(label, !!actual, true); }

function fresh(aChampion="athos", bChampion="desartes") {
  const A = E.playerTemplate(aChampion, false);
  const B = E.playerTemplate(bChampion, true);
  A.hand=[]; B.hand=[]; A.deck=[]; B.deck=[];
  A.roundPlays=[]; B.roundPlays=[]; A.duelResults=[]; B.duelResults=[];
  A.archives={siniestra:[],trono:[],diestra:[]};
  B.archives={siniestra:[],trono:[],diestra:[]};
  const s = {
    round:1, turn:1, roundStarter:"player", initiative:"player",
    player:A, ai:B, duelScore:{player:0,ai:0}, rounds:[], logs:[], finished:false
  };
  E.setState(s);
  return {s,A,B};
}
function filler(n, id="mensajero") { return Array.from({length:n},()=>card(id)); }

function direct(label, id, pos, expectedPositive, setupPositive, expectedNegative, setupNegative) {
  {
    const {A,B}=fresh();
    if (setupPositive) setupPositive(A,B,E.getState());
    const p=play(id,pos);
    const preview=E.previewPendingPower(p,A,B).power;
    const exact=E.calculatePowers(p,A,play("mensajero","trono"),B).a;
    check(label+" preview +", preview, expectedPositive);
    check(label+" exact +", exact, expectedPositive);
  }
  if (expectedNegative !== undefined) {
    const {A,B}=fresh();
    if (setupNegative) setupNegative(A,B,E.getState());
    const p=play(id,pos);
    const preview=E.previewPendingPower(p,A,B).power;
    const exact=E.calculatePowers(p,A,play("mensajero","trono"),B).a;
    check(label+" preview -", preview, expectedNegative);
    check(label+" exact -", exact, expectedNegative);
  }
}
function exact(label, aId,aPos,bId,bPos, setup, expectedA, expectedB) {
  const {A,B}=fresh();
  if(setup) setup(A,B,E.getState());
  const r=E.calculatePowers(play(aId,aPos),A,play(bId,bPos),B);
  if(expectedA!==undefined) check(label+" A",r.a,expectedA);
  if(expectedB!==undefined) check(label+" B",r.b,expectedB);
}
function post(label, id,pos,result,setup,assertion,aff=true) {
  const {A,B}=fresh();
  if(setup) setup(A,B,E.getState());
  E.applyPost(A,play(id,pos),result,B,aff);
  assertion(A,B,E.getState(),label);
}

// RED — direct power.
direct("bonus2","invocadagas","diestra",7,null,5,null);
direct("first_or_prev_diestra2 first","guardia_dextral","diestra",7,null,5,(A)=>A.roundPlays=[play("mensajero","trono")]);
direct("won_prev2","caballero_tigre","diestra",8,(A)=>A.duelResults=["win"],6,(A)=>A.duelResults=["loss"]);
direct("empty_sin5","corona_eterea","trono",7,null,2,(A)=>A.roundPlays=[play("mensajero","siniestra")]);
direct("trono_before4","blazewalker","siniestra",8,(A)=>A.roundPlays=[play("mensajero","trono")],4,null);
direct("diestra_before3","guardia_castillo","trono",8,(A)=>A.roundPlays=[play("mensajero","diestra")],5,null);
direct("second_special3","maestro_armas","diestra",10,(A)=>A.roundPlays=[play("invocadagas","diestra")],7,null);
direct("first_round3","incendiario","trono",8,null,5,(A)=>A.roundPlays=[play("mensajero","trono")]);
direct("winning_round2","ejecutor_real","trono",7,(A,B,s)=>s.duelScore={player:1,ai:0},5,null);

// RED — future state.
post("loss_next3","mensajero","trono","loss",null,(A,B,s,l)=>check(l,A.nextBuff,3));
post("loss_next3 negative","mensajero","trono","win",null,(A,B,s,l)=>check(l,A.nextBuff,0));
post("won_round_next3","asesor_real","trono","win",(A)=>A.duelResults=["win"],(A,B,s,l)=>check(l,A.nextBuff,3));
post("won_round_next3 negative","asesor_real","trono","loss",(A)=>A.duelResults=["loss"],(A,B,s,l)=>check(l,A.nextBuff,0));
post("next_diestra2","abanderado_real","trono","draw",null,(A,B,s,l)=>{
  check(l+" pos",A.nextPositionSpecificBoost?.position,"diestra");
  check(l+" amount",A.nextPositionSpecificBoost?.amount,2);
});

// BLUE contextual/exact.
exact("lost_prev_enemy3","protector","trono","mensajero","diestra",(A)=>A.duelResults=["loss"],5,2);
exact("lost_prev_enemy3 negative","protector","trono","mensajero","diestra",null,5,5);
exact("enemy3","asesino_sinistral","siniestra","mensajero","trono",null,4,2);
exact("enemy3 negative","asesino_sinistral","trono","mensajero","trono",null,4,5);
exact("enemy_printed6_2","criatura_invocada","siniestra","caballero_tigre","trono",null,8,6);
exact("enemy_printed6_2 negative","criatura_invocada","siniestra","mensajero","trono",null,6,5);
exact("copy_plus2","prodigio","siniestra","caballero_tigre","trono",null,8,6);
exact("copy_plus2 negative affinity","prodigio","trono","caballero_tigre","trono",null,3,6);
post("next_position2","invocador","trono","draw",null,(A,B,s,l)=>check(l,A.nextPositionBoost,2),true);
post("next_position2 negative","invocador","siniestra","draw",null,(A,B,s,l)=>check(l,A.nextPositionBoost,0),false);
exact("cancel_enemy_affinity","sabio","trono","invocadagas","diestra",null,4,5);
exact("cancel_enemy_affinity negative","sabio","siniestra","invocadagas","diestra",null,4,7);
direct("third4","caballero_luciernaga","siniestra",10,(A,B,s)=>s.turn=3,6,(A,B,s)=>s.turn=2);
post("enemy_next3","oraculo","siniestra","draw",null,(A,B,s,l)=>check(l,B.incomingDebuff,3),true);
post("enemy_next3 negative","oraculo","trono","draw",null,(A,B,s,l)=>check(l,B.incomingDebuff,0),false);
exact("enemy_boosted_minus2","desencantador","trono","mensajero","siniestra",(A,B)=>{B.nextBuff=3;B.nextBuffNotes=["+3 test"];},5,6);
exact("enemy_boosted_minus2 negative","desencantador","trono","mensajero","siniestra",null,5,5);
exact("enemy_affinity2","lectora_gestos","siniestra","invocadagas","trono",null,7,5);
exact("enemy_affinity2 negative","lectora_gestos","siniestra","mensajero","trono",null,5,5);
exact("prev_draw_enemy3","tejedor_sombras","trono","mensajero","siniestra",(A)=>A.duelResults=["draw"],4,2);
exact("prev_draw_enemy3 negative","tejedor_sombras","trono","mensajero","siniestra",null,4,5);

// Shared archive scaling.
direct("archive_here Bibliotecario","bibliotecario","trono",7,(A)=>A.archives.trono=filler(3),4,null);
direct("archive_empty2","gusano_blanco","trono",6,null,4,(A)=>A.archives.trono=filler(1));
direct("archive_two2","legionario_draconido","trono",7,(A)=>A.archives.trono=filler(2),5,(A)=>A.archives.trono=filler(1));
direct("clear_archive2x","libro_amaram","trono",8,(A)=>A.archives.trono=filler(3),2,null);
direct("opp_archive_more2","heraldo","trono",7,(A,B)=>{A.archives.trono=filler(1);B.archives.trono=filler(2);},5,(A,B)=>{A.archives.trono=filler(2);B.archives.trono=filler(1);});
direct("archive_three6","huevo","trono",8,(A)=>A.archives.trono=filler(3),2,(A)=>A.archives.trono=filler(2));
direct("trono_archive_three3","dragon_anciano","trono",9,(A)=>A.archives.trono=filler(3),6,(A)=>A.archives.trono=filler(2));
direct("least_archive2","forjador_anillos","siniestra",7,(A)=>{A.archives.siniestra=[];A.archives.trono=filler(1);A.archives.diestra=filler(2);},5,(A)=>{A.archives.siniestra=filler(2);A.archives.trono=[];A.archives.diestra=filler(1);});
direct("opp_archive_capped","escriba_escamado","trono",8,(A,B)=>B.archives.trono=filler(6),4,null);
direct("archive_leads_global","cronista_draconido","trono",6,(A,B)=>{A.archives.siniestra=filler(2);A.archives.trono=filler(1);A.archives.diestra=[];B.archives.siniestra=filler(1);B.archives.trono=[];B.archives.diestra=filler(3);},4,null);
direct("archive_exact2_5","memoria_petrificada","trono",8,(A)=>A.archives.trono=filler(2),3,(A)=>A.archives.trono=filler(1));
direct("archive_all_diff3","cartografo_empireo","trono",8,(A)=>{A.archives.siniestra=[];A.archives.trono=filler(1);A.archives.diestra=filler(2);},5,null);

// SAINTS.
direct("lateral1","santo_bifronte","siniestra",7,null,6,(A,B,s)=>{});
{
  const {A,B}=fresh(); const p=play("santo_bifronte","trono");
  check("lateral1 Trono preview",E.previewPendingPower(p,A,B).power,6);
  check("lateral1 Trono exact",E.calculatePowers(p,A,play("mensajero","trono"),B).a,6);
}
direct("losing_round2","contrapeso","trono",8,(A,B,s)=>s.duelScore={player:0,ai:1},6,(A,B,s)=>s.duelScore={player:1,ai:0});
direct("score_tied1","equilibrador","trono",7,null,6,(A,B,s)=>s.duelScore={player:1,ai:0});
post("mirror_martyr","martir_espejo","trono","draw",(A,B,s)=>s.duelScore={player:1,ai:1},(A,B,s,l)=>truth(l,A.nextBaseDouble));
post("mirror_martyr negative","martir_espejo","trono","loss",(A,B,s)=>s.duelScore={player:0,ai:1},(A,B,s,l)=>check(l,A.nextBaseDouble,false));
direct("axis_lateral2","custodio_eje","trono",8,(A)=>A.roundPlays=[play("mensajero","siniestra")],6,null);
direct("opposite_prev3","paso_especular","diestra",8,(A)=>A.roundPlays=[play("mensajero","siniestra")],5,(A)=>A.roundPlays=[play("mensajero","trono")]);
{
  const {A,B,s}=fresh(); s.turn=3; A.roundPlays=[play("mensajero","siniestra"),play("mensajero","trono")];
  const p=play("procesion_perfecta","diestra");
  check("second_trono_double preview +",E.previewPendingPower(p,A,B).power,10);
  check("second_trono_double exact +",E.calculatePowers(p,A,play("mensajero","trono"),B).a,10);
}
{
  const {A,B,s}=fresh(); s.turn=3; A.roundPlays=[play("mensajero","trono"),play("mensajero","diestra")];
  const p=play("procesion_perfecta","siniestra");
  check("second_trono_double preview -",E.previewPendingPower(p,A,B).power,5);
  check("second_trono_double exact -",E.calculatePowers(p,A,play("mensajero","trono"),B).a,5);
}
exact("opposite_enemy2","reflejo_viviente","siniestra","mensajero","diestra",null,8,5);
exact("opposite_enemy2 negative","reflejo_viviente","siniestra","mensajero","trono",null,6,5);
{
  const {A,B}=fresh(); A.life=6;B.life=6;
  const p=play("avatar_simetria","trono");
  check("equal_life_double preview +",E.previewPendingPower(p,A,B).power,8);
  check("equal_life_double exact +",E.calculatePowers(p,A,play("mensajero","trono"),B).a,8);
}
{
  const {A,B}=fresh(); A.life=6;B.life=5;
  const p=play("avatar_simetria","trono");
  check("equal_life_double preview -",E.previewPendingPower(p,A,B).power,4);
  check("equal_life_double exact -",E.calculatePowers(p,A,play("mensajero","trono"),B).a,4);
}
direct("win_loss4","pendulo","trono",8,(A)=>A.duelResults=["win","loss"],4,(A)=>A.duelResults=["win"]);
direct("prev_draw3","santo_gemelo","trono",8,(A)=>A.duelResults=["draw"],5,(A)=>A.duelResults=["win"]);
direct("first_opposite3","palindromo","diestra",8,(A)=>A.roundPlays=[play("mensajero","siniestra")],5,(A)=>A.roundPlays=[play("mensajero","trono")]);

// Champion interaction regression scenarios.
{
  const {A}=fresh("athos","desartes");
  check("Athos starts one Diestra slot",E.capacity(A,"diestra"),1);
}
{
  const {A}=fresh("desartes","athos");
  A.archives.siniestra=filler(2);A.archives.trono=filler(1);A.archives.diestra=filler(2);
  check("Desartes tied most-populated Siniestra",E.capacity(A,"siniestra"),2);
  check("Desartes non-leading Trono",E.capacity(A,"trono"),1);
}
{
  const {A,B}=fresh("vinira","desartes");
  const p=play("invocadagas","trono");
  check("Vinira off-affinity preview +1",E.previewPendingPower(p,A,B).power,8);
  check("Vinira off-affinity exact +1",E.calculatePowers(p,A,play("mensajero","trono"),B).a,8);
  A.viniraUsed=true;
  check("Vinira second off-affinity no override",E.calculatePowers(p,A,play("mensajero","trono"),B).a,5);
}

if (failures.length) {
  console.error(`Scenario audit failed: ${failures.length} failure(s), ${passed} assertions passed.`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`PASS: ${passed} scenario assertions across all 47 unique effects and key Champion interactions.`);
