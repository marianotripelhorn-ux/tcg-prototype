/**
 * Daggerlight private-room API.
 * Deploy separately with Cloudflare Workers + Durable Objects.
 * Game state (including both hidden hands) NEVER leaves the room object.
 */
import { startPvpGame, cloneGame, nextHumanSide, nextHumanQuieroSide, submitHumanPlay, submitHumanQuiero } from "../../src/engine/game";
import { champions } from "../../src/engine/champions";
import type { GameState, Side } from "../../src/engine/types";
import type { Position } from "../../src/types";

interface Env {
  ROOMS: DurableObjectNamespace;
  ALLOWED_ORIGIN: string;
}
type Feedback={fun:number;clarity:number;comment:string;at:string};
type RoomData={
  hostToken:string;guestToken?:string;hostChampion:string;guestChampion?:string;
  createdAt:string;updatedAt:string;version:number;
  game?:GameState;feedback?:{host?:Feedback;guest?:Feedback};
};
const validPosition=(v:unknown):v is Position=>v==="siniestra"||v==="trono"||v==="diestra";
const error=(message:string,status=400)=>Response.json({error:message},{status});
const readToken=(req:Request)=>(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();
const flip=(s:Side):Side=>s==="player"?"opponent":"player";

function visibleState(actual:GameState,seat:"host"|"guest") {
  const view=cloneGame(actual);
  if(seat==="guest"){
    [view.player,view.opponent]=[view.opponent,view.player];
    [view.pendingPlayerPlay,view.pendingOpponentPlay]=[view.pendingOpponentPlay,view.pendingPlayerPlay];
    view.initiative=flip(view.initiative);
    view.roundStarter=flip(view.roundStarter);
    view.winner=view.winner==="draw"?"draw":view.winner?flip(view.winner):undefined;
    view.duelScore={player:actual.duelScore.opponent,opponent:actual.duelScore.player};
    view.rounds=view.rounds.map(r=>({
      ...r,score:{player:r.score.opponent,opponent:r.score.player},
      playerLife:r.opponentLife,opponentLife:r.playerLife,starter:flip(r.starter),
      reason:r.reason==="player_no_quiero"?"opponent_no_quiero":r.reason==="opponent_no_quiero"?"player_no_quiero":"completed"
    }));
    if(view.lastDuel){
      const d=view.lastDuel;
      view.lastDuel={...d,playerPlay:d.opponentPlay,opponentPlay:d.playerPlay,outcome:d.outcome==="draw"?"draw":flip(d.outcome)};
    }
  }
  // These arrays contain private information even when the other player's hand
  // is currently empty. They MUST NOT be sent to the browser.
  view.opponent.hand=[];
  view.opponent.deck=[];
  view.opponent.discard=[];
  delete view.opponent.deckList;
  delete view.opponent.deckRecipe;
  view.player.deck=[];
  view.player.discard=[];
  delete view.player.deckList;
  delete view.player.deckRecipe;
  // Never expose the initial shoe order. The UI needs only our own hand.
  return view;
}

export class DaggerlightRoom {
  constructor(private state:DurableObjectState,private env:Env){}
  private async get(){return this.state.storage.get<RoomData>("room");}
  private async put(room:RoomData){
    await this.state.storage.put("room",room);
    // Avoid indefinite retention of unfinished playtest games.
    await this.state.storage.setAlarm(Date.now()+7*24*60*60*1000);
  }
  async alarm(){await this.state.storage.deleteAll();}
  async fetch(request:Request):Promise<Response>{
    const path=new URL(request.url).pathname;
    let body:Record<string,unknown>={};
    if(request.method==="POST"){
      try{body=await request.json() as Record<string,unknown>;}
      catch{return error("Solicitud inválida.");}
    }
    if(path==="/create"&&request.method==="POST"){
      if(await this.get())return error("La sala ya existe.",409);
      const champ=String(body.champion||"");
      const token=String(body.token||"");
      if(!champions[champ]||token.length<28)return error("Datos inválidos.");
      const now=new Date().toISOString();
      await this.put({hostToken:token,hostChampion:champ,createdAt:now,updatedAt:now,version:0});
      return Response.json({ok:true});
    }
    const room=await this.get();
    if(!room)return error("Sala no encontrada o caducada.",404);
    if(path==="/join"&&request.method==="POST"){
      const champ=String(body.champion||"");
      const token=String(body.token||"");
      if(!champions[champ]||token.length<28)return error("Datos inválidos.");
      if(room.guestToken)return error("La sala ya tiene dos jugadores.",409);
      if(token===room.hostToken)return error("Necesitás otro navegador para unirte.",400);
      room.guestToken=token;room.guestChampion=champ;
      room.game=startPvpGame(room.hostChampion,champ);
      room.version++;room.updatedAt=new Date().toISOString();
      await this.put(room);
      return Response.json({ok:true});
    }
    const token=readToken(request);
    const seat=token&&token===room.hostToken?"host":token&&token===room.guestToken?"guest":null;
    if(!seat)return error("No tenés permiso para acceder a esta sala.",403);
    const side:Side=seat==="host"?"player":"opponent";
    if(path==="/status"&&request.method==="GET"){
      const waiting=room.game?room.game.phase==="finished"?"finished":"playing":"waiting";
      const next=room.game?.phase==="awaiting_quiero"?nextHumanQuieroSide(room.game):room.game?nextHumanSide(room.game):null;
      return Response.json({
        status:waiting,seat,version:room.version,
        hostChampion:room.hostChampion,guestChampion:room.guestChampion||null,
        myTurn:next===side,
        game:room.game?visibleState(room.game,seat):null
      },{headers:{"Cache-Control":"no-store"}});
    }
    if(path==="/action"&&request.method==="POST"){
      if(!room.game)return error("Esperando al segundo jugador.",409);
      if(room.game.phase==="finished")return error("La partida terminó.",409);
      if(!Number.isInteger(body.version)||body.version!==room.version)return error("La sala cambió. Actualizá el estado.",409);
      const next=cloneGame(room.game);
      try{
        if(body.type==="play"){
          if(!Number.isInteger(body.handIndex)||!validPosition(body.position))return error("Carta o posición inválida.");
          submitHumanPlay(next,side,body.handIndex as number,body.position);
        }else if(body.type==="quiero"){
          if(typeof body.wants!=="boolean")return error("Elegí Quiero o No quiero.");
          submitHumanQuiero(next,side,body.wants);
        }else{return error("Acción no admitida.");}
      }catch(e){return error(e instanceof Error?e.message:"Acción rechazada.",409);}
      room.game=next;room.version++;room.updatedAt=new Date().toISOString();
      await this.put(room);
      return Response.json({ok:true,version:room.version});
    }
    if(path==="/feedback"&&request.method==="POST"){
      if(!room.game||room.game.phase!=="finished")return error("Completá la partida primero.",409);
      const fun=Number(body.fun),clarity=Number(body.clarity);
      if(!Number.isInteger(fun)||fun<1||fun>5||!Number.isInteger(clarity)||clarity<1||clarity>5)return error("Puntuación de 1 a 5.");
      const comment=String(body.comment||"").slice(0,500);
      room.feedback={...room.feedback,[seat]:{fun,clarity,comment,at:new Date().toISOString()}};
      room.version++;await this.put(room);
      return Response.json({ok:true});
    }
    if(path==="/report"&&request.method==="GET"){
      if(!room.game)return error("La partida no comenzó.",409);
      // Only room members can download anonymized match results.
      return Response.json({
        roomStatus:room.game.phase,startedAt:room.createdAt,updatedAt:room.updatedAt,
        ruleset:"manifestaciones-v0.1-2026-11",
        champions:[room.hostChampion,room.guestChampion],
        winner:room.game.winner||null,rounds:room.game.rounds,
        events:room.game.events,duels:room.game.events.filter(e=>e.kind==="duel").length,
        life:{host:room.game.player.life,guest:room.game.opponent.life},
        feedback:room.feedback||{}
      },{headers:{"Cache-Control":"no-store"}});
    }
    return error("Ruta inexistente.",404);
  }
}

function cors(request:Request,env:Env,response:Response) {
  const origin=request.headers.get("Origin")||"";
  const allowed=origin===env.ALLOWED_ORIGIN||(/^http:\/\/localhost:\d+$/.test(origin));
  const headers=new Headers(response.headers);
  if(allowed){headers.set("Access-Control-Allow-Origin",origin);headers.set("Vary","Origin");}
  headers.set("Access-Control-Allow-Headers","Authorization,Content-Type");
  headers.set("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  headers.set("X-Content-Type-Options","nosniff");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    const origin=request.headers.get("Origin")||"";
    const validOrigin=!origin||origin===env.ALLOWED_ORIGIN||/^http:\/\/localhost:\d+$/.test(origin);
    if(!validOrigin)return error("Origen no autorizado.",403);
    if(request.method==="OPTIONS")return cors(request,env,new Response(null,{status:204}));
    const url=new URL(request.url),path=url.pathname;
    if(path==="/api/health")return cors(request,env,Response.json({ok:true,version:"pvp-beta-1"}));
    let code="";
    let action="";
    let body:Record<string,unknown>|null=null;
    if(path==="/api/rooms"&&request.method==="POST"){
      try{body=await request.json() as Record<string,unknown>;}catch{return cors(request,env,error("Solicitud inválida."));}
      const champion=String(body.champion||"");
      if(!champions[champion])return cors(request,env,error("Campeón inválido."));
      code=crypto.randomUUID().replace(/-/g,"").slice(0,8).toUpperCase();
      action="/create";
    }else{
      const m=path.match(/^\/api\/rooms\/([A-Z0-9]{8})(?:\/(join|action|feedback|report))?$/);
      if(!m)return cors(request,env,error("Ruta inexistente.",404));
      code=m[1];action="/"+(m[2]||"status");
      if(request.method==="POST"){
        try{body=await request.json() as Record<string,unknown>;}catch{return cors(request,env,error("Solicitud inválida."));}
      }
    }
    const token=action==="/create"||action==="/join"?crypto.randomUUID()+crypto.randomUUID():null;
    const id=env.ROOMS.idFromName(code);
    const next=new Request("https://room.internal"+action,{
      method:request.method,
      headers:{"Content-Type":"application/json","Authorization":token?"":request.headers.get("Authorization")||""},
      body:request.method==="POST"?JSON.stringify({...body,...(token?{token}:{} )}):undefined
    });
    const response=await env.ROOMS.get(id).fetch(next);
    if(!response.ok)return cors(request,env,response);
    if(token){
      return cors(request,env,Response.json({code,token,seat:action==="/create"?"host":"guest"}));
    }
    return cors(request,env,response);
  }
};
